require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { fetchMarkets } = require('./layers/marketFetcher')
const { fetchNewsForMarket } = require('./layers/newsRetriever')
const { extractSignalsForMarket } = require('./layers/signalExtractor')
const { computeScore } = require('./layers/scoringModel')
const { calculateEdge } = require('./layers/edgeCalculator')
const { checkRisk } = require('./layers/riskEngine')
const { executeOrder, skipOrder } = require('./layers/executionLayer')
const { logTrace, getTraces, getStats } = require('./layers/traceLogger')
const { connectWallet, getOnchainData, recordExecution, recordSkip } = require('./circleWallet')
const { getBalance, setBalance } = require('./store')

const app = express()
const PORT = process.env.PORT || 3001
const agentRunning = {}

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }))
app.use(express.json())

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
    const virtualBalance = getBalance(address)
    const onchain = await getOnchainData(address).catch(() => null)
    res.json({ onchain, virtualBalance })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/wallet/:address/balance
app.get('/api/wallet/:address/balance', (req, res) => {
  const { address } = req.params
  res.json({ address, virtualBalance: getBalance(address) })
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
app.get('/api/traces', (req, res) => {
  const { address } = req.query
  const traces = getTraces(address)
  res.json({ traces })
})

// GET /api/stats
app.get('/api/stats', (req, res) => {
  res.json(getStats())
})

// GET /api/run/status
app.get('/api/run/status', (req, res) => {
  const { address } = req.query
  res.json({ running: agentRunning[address] || false })
})

// POST /api/run
app.post('/api/run', async (req, res) => {
  const { address } = req.body

  if (agentRunning[address]) {
    return res.json({ message: 'Agent already running', running: true })
  }

  res.json({ message: 'Agent started', running: true })

  agentRunning[address] = true

  setImmediate(async () => {
    try {
      const portfolioValue = getBalance(address || 'default')
      const openPositions = []
      const markets = await fetchMarkets()

      console.log('[run] Starting agent for', address, '— portfolio:', portfolioValue)
      console.log('[run] Markets to process:', markets.slice(0, 15).length)

      for (const market of markets.slice(0, 15)) {
        try {
          const articles = await fetchNewsForMarket(market)

          if (articles.length === 0) {
            const rec = await skipOrder(market, 'NO_ARTICLES', null, null)
            rec.wallet_address = address
            logTrace(rec, [], { score: 0, signal_count: 0 }, null, null)
            continue
          }

          const signals = await extractSignalsForMarket(market, articles)
          const scoreResult = computeScore(signals)

          console.log('[run] Market:', market.question.slice(0, 40), '| Score:', scoreResult.score, '| Signals:', scoreResult.signal_count)

          const edgeResult = calculateEdge(market, scoreResult, [])

          console.log('[run] Edge result:', edgeResult.action, '| Edge:', edgeResult.edge, '| Adjusted:', edgeResult.adjusted_edge)

          if (edgeResult.action === 'SKIP') {
            const rec = await skipOrder(market, edgeResult.reason, scoreResult, edgeResult)
            rec.wallet_address = address
            logTrace(rec, signals, scoreResult, edgeResult, null)
            recordSkip(address, edgeResult.reason).catch(() => {})
            continue
          }

          const currentBalance = getBalance(address || 'default')
          const riskResult = checkRisk(market, edgeResult, openPositions, currentBalance)

          if (riskResult.action === 'SKIP') {
            const rec = await skipOrder(market, riskResult.reason, scoreResult, edgeResult)
            rec.wallet_address = address
            logTrace(rec, signals, scoreResult, edgeResult, riskResult)
            recordSkip(address, riskResult.reason).catch(() => {})
            continue
          }

          const rec = await executeOrder(market, edgeResult, riskResult)
          rec.wallet_address = address
          logTrace(rec, signals, scoreResult, edgeResult, riskResult)

          // Persist balance
          const bal = getBalance(address || 'default')
          const newBal = Math.max(0, bal - riskResult.kelly.bet_size_usdc)
          setBalance(address || 'default', newBal)

          recordExecution(address, riskResult.kelly.bet_size_usdc, riskResult.direction).catch(() => {})

          openPositions.push({
            market_id: market.market_id,
            cluster_key: riskResult.cluster_key,
            size_fraction: riskResult.kelly.capped_fraction
          })

          console.log('[run] EXECUTED:', market.question.slice(0, 40), '| $' + riskResult.kelly.bet_size_usdc + ' | Balance now: $' + newBal)

        } catch (marketErr) {
          console.error('[run] Market error:', marketErr.message)
          continue
        }
      }

      console.log('[run] Agent finished for:', address)
    } catch (err) {
      console.error('[run] Fatal error:', err.message)
    } finally {
      agentRunning[address] = false
    }
  })
})

app.listen(PORT, () => {
  console.log('[pythia] Backend running on port ' + PORT)
})
