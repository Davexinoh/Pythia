require('dotenv').config()
const express = require('express')
const cors = require('cors')
const axios = require('axios')
const { fetchMarkets } = require('./layers/marketFetcher')
const { fetchNewsForMarket } = require('./layers/newsRetriever')
const { extractSignalsForMarket } = require('./layers/signalExtractor')
const { computeScore } = require('./layers/scoringModel')
const { calculateEdge } = require('./layers/edgeCalculator')
const { checkRisk } = require('./layers/riskEngine')
const { executeOrder, skipOrder } = require('./layers/executionLayer')
const { logTrace, getTraces, getStats } = require('./layers/traceLogger')
const { connectWallet, getOnchainData, recordExecution, recordSkip } = require('./circleWallet')
const {
  getBalance, setBalance, getOpenPositions, addPosition,
  hasOpenPosition, closePosition, getAllPositions
} = require('./store')

const app = express()
const PORT = process.env.PORT || 3001
const agentRunning = {}

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }))
app.use(express.json())

async function runAgentForWallet(address) {
  console.log('[run] ========= AGENT START =========')
  console.log('[run] Address:', address)

  try {
    const portfolioValue = await getBalance(address || 'default').catch(() => 1000)
    console.log('[run] Portfolio: $' + portfolioValue)

    const markets = await fetchMarkets()
    console.log('[run] Markets fetched:', markets.length)

    if (!markets || markets.length === 0) {
      console.log('[run] No markets — aborting')
      return
    }
// Priority categories first
const PRIORITY_CATEGORIES = ['Bitcoin', 'Ethereum', 'Solana', 'Crypto', 'Politics', 'Macro', 'Tech', 'Sports', 'Pop Culture', 'Other']
const categoryBuckets = {}

for (const cat of PRIORITY_CATEGORIES) {
  categoryBuckets[cat] = []
}

for (const market of markets) {
  const cat = market.category || 'Other'
  if (!categoryBuckets[cat]) categoryBuckets[cat] = []
  if (categoryBuckets[cat].length < 4) categoryBuckets[cat].push(market)
}

const diverseMarkets = Object.values(categoryBuckets).flat().slice(0, 30)
        console.log('[run] Categories:', [...new Set(diverseMarkets.map(m => m.category))].join(', '))
    console.log('[run] Processing:', diverseMarkets.length, 'markets')

    for (const market of diverseMarkets) {
      try {
        console.log('[run] --- Market:', market.question.slice(0, 50))

        const alreadyOpen = await hasOpenPosition(address, market.market_id).catch(() => false)
        if (alreadyOpen) {
          console.log('[run] Already open — skip')
          continue
        }

        const articles = await fetchNewsForMarket(market)
        console.log('[run] Articles:', articles.length)

        if (articles.length === 0) {
          const rec = await skipOrder(market, 'NO_ARTICLES', null, null)
          rec.wallet_address = address
          await logTrace(rec, [], { score: 0, signal_count: 0 }, null, null)
          continue
        }

        const signals = await extractSignalsForMarket(market, articles)
        const scoreResult = computeScore(signals)
        console.log('[run] Score:', scoreResult.score, '| Signals:', scoreResult.signal_count)

        const edgeResult = calculateEdge(market, scoreResult, [])
        console.log('[run] Edge action:', edgeResult.action, '| Edge:', edgeResult.edge)

        if (edgeResult.action === 'SKIP') {
          const rec = await skipOrder(market, edgeResult.reason, scoreResult, edgeResult)
          rec.wallet_address = address
          await logTrace(rec, signals, scoreResult, edgeResult, null)
          recordSkip(address, edgeResult.reason).catch(() => {})
          continue
        }

        const currentBalance = await getBalance(address || 'default').catch(() => portfolioValue)
        const openPos = await getOpenPositions(address).catch(() => [])
        const riskResult = checkRisk(market, edgeResult, openPos, currentBalance)
        console.log('[run] Risk:', riskResult.action, '| Bet: $' + riskResult.kelly.bet_size_usdc)

        if (riskResult.action === 'SKIP') {
          const rec = await skipOrder(market, riskResult.reason, scoreResult, edgeResult)
          rec.wallet_address = address
          await logTrace(rec, signals, scoreResult, edgeResult, riskResult)
          recordSkip(address, riskResult.reason).catch(() => {})
          continue
        }

        const rec = await executeOrder(market, edgeResult, riskResult)
        rec.wallet_address = address
        await logTrace(rec, signals, scoreResult, edgeResult, riskResult)

        await addPosition({
          wallet_address: address,
          market_id: market.market_id,
          question: market.question,
          direction: riskResult.direction,
          entry_price: edgeResult.implied_probability,
          model_probability: edgeResult.model_probability,
          bet_size_usdc: riskResult.kelly.bet_size_usdc,
          cluster_key: riskResult.cluster_key,
          category: market.category,
          edge: edgeResult.edge,
          days_to_close: market.days_to_close
        }).catch(err => console.error('[run] addPosition failed:', err.message))

        const bal = await getBalance(address || 'default').catch(() => currentBalance)
        const newBal = Math.max(0, bal - riskResult.kelly.bet_size_usdc)
        await setBalance(address || 'default', newBal).catch(() => {})
        recordExecution(address, riskResult.kelly.bet_size_usdc, riskResult.direction).catch(() => {})

        console.log('[run] EXECUTED! Direction:', riskResult.direction, '| $' + riskResult.kelly.bet_size_usdc + ' | Balance: $' + newBal)

      } catch (marketErr) {
        console.error('[run] Market error:', marketErr.message)
        continue
      }
    }

    console.log('[run] ========= AGENT DONE =========')
  } catch (err) {
    console.error('[run] Fatal:', err.message)
    console.error(err.stack)
  } finally {
    agentRunning[address] = false
  }
}

// GET /api/health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// POST /api/wallet/connect
app.post('/api/wallet/connect', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email required' })
    const wallet = await connectWallet(email)
    res.json({ wallet })
  } catch (err) {
    console.error('[/api/wallet/connect]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/wallet/:address
app.get('/api/wallet/:address', async (req, res) => {
  try {
    const { address } = req.params
    const virtualBalance = await getBalance(address).catch(() => 1000)
    const onchain = await getOnchainData(address).catch(() => null)
    res.json({ onchain, virtualBalance })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/wallet/:address/balance
app.get('/api/wallet/:address/balance', async (req, res) => {
  const { address } = req.params
  const virtualBalance = await getBalance(address).catch(() => 1000)
  res.json({ address, virtualBalance })
})

// GET /api/markets
app.get('/api/markets', async (req, res) => {
  try {
    const markets = await fetchMarkets()
    res.json({ markets, count: markets.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/traces
app.get('/api/traces', async (req, res) => {
  try {
    const { address } = req.query
    const traces = await getTraces(address || null)
    res.json({ traces })
  } catch (err) {
    console.error('[/api/traces]', err.message)
    res.json({ traces: [] })
  }
})

// GET /api/stats
app.get('/api/stats', async (req, res) => {
  try {
    const { address } = req.query
    const stats = await getStats(address || null)
    res.json(stats)
  } catch (err) {
    res.json({ total: 0, executed: 0, skipped: 0, invalidated: 0, skipReasons: {} })
  }
})

// GET /api/positions/:address
app.get('/api/positions/:address', async (req, res) => {
  try {
    const { address } = req.params
    const positions = await getAllPositions(address).catch(() => [])

    const enriched = await Promise.all(positions.map(async (pos) => {
      if (pos.status !== 'OPEN') return pos
      try {
        const response = await axios.get(
          'https://gamma-api.polymarket.com/markets/' + pos.market_id,
          { timeout: 5000 }
        )
        const market = response.data
        const prices = JSON.parse(market.outcomePrices || '[]')
        const outcomes = JSON.parse(market.outcomes || '[]')
        const yesIndex = outcomes.findIndex(o => o.toLowerCase() === 'yes')
        const currentYesPrice = yesIndex >= 0 ? parseFloat(prices[yesIndex]) : null
        const currentPrice = pos.direction === 'YES'
          ? currentYesPrice
          : (currentYesPrice ? 1 - currentYesPrice : null)
        const entryPrice = pos.direction === 'YES'
          ? pos.entry_price
          : 1 - pos.entry_price
        const unrealizedPnl = currentPrice !== null
          ? parseFloat(((currentPrice - entryPrice) * pos.bet_size_usdc).toFixed(2))
          : null
        return {
          ...pos,
          current_price: currentPrice,
          unrealized_pnl: unrealizedPnl,
          pnl_pct: currentPrice !== null
            ? parseFloat(((currentPrice - entryPrice) / entryPrice * 100).toFixed(1))
            : null
        }
      } catch {
        return pos
      }
    }))

    res.json({ positions: enriched })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/positions/sell
app.post('/api/positions/sell', async (req, res) => {
  try {
    const { address, market_id } = req.body
    if (!address || !market_id) {
      return res.status(400).json({ error: 'address and market_id required' })
    }

    const response = await axios.get(
      'https://gamma-api.polymarket.com/markets/' + market_id,
      { timeout: 5000 }
    )
    const market = response.data
    const prices = JSON.parse(market.outcomePrices || '[]')
    const outcomes = JSON.parse(market.outcomes || '[]')
    const yesIndex = outcomes.findIndex(o => o.toLowerCase() === 'yes')
    const currentYesPrice = yesIndex >= 0 ? parseFloat(prices[yesIndex]) : 0.5

    const positions = await getAllPositions(address)
    const position = positions.find(p => p.market_id === market_id && p.status === 'OPEN')
    if (!position) return res.status(404).json({ error: 'Position not found' })

    const currentPrice = position.direction === 'YES'
      ? currentYesPrice
      : 1 - currentYesPrice
    const entryPrice = position.direction === 'YES'
      ? position.entry_price
      : 1 - position.entry_price
    const pnl = parseFloat(((currentPrice - entryPrice) * position.bet_size_usdc).toFixed(2))

    const result = await closePosition(address, market_id, currentPrice, pnl)
    if (!result) return res.status(500).json({ error: 'Failed to close position' })

    res.json({
      success: true,
      pnl,
      newBalance: result.newBalance,
      message: pnl >= 0
        ? `Sold for +$${pnl.toFixed(2)} profit`
        : `Sold for -$${Math.abs(pnl).toFixed(2)} loss`
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/run/status
app.get('/api/run/status', (req, res) => {
  const { address } = req.query
  res.json({ running: agentRunning[address] || false })
})

// POST /api/run
app.post('/api/run', (req, res) => {
  const { address } = req.body

  if (agentRunning[address]) {
    return res.json({ message: 'Agent already running', running: true })
  }

  agentRunning[address] = true
  res.json({ message: 'Agent started', running: true })

  // Fire and forget — don't await
  runAgentForWallet(address).catch(err => {
    console.error('[run] Unhandled error:', err.message)
    agentRunning[address] = false
  })
})

app.listen(PORT, () => {
  console.log('[pythia] Backend running on port ' + PORT)
})
