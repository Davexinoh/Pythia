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

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }))
app.use(express.json())

// Portfolio value per wallet address
const walletPortfolios = {}
const openPositions = {}

function getPortfolioValue(address) {
  return walletPortfolios[address] || 1000
}

function getOpenPositions(address) {
  return openPositions[address] || []
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

    // Sync portfolio value from onchain balance
    walletPortfolios[wallet.address] = wallet.virtualBalance

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
    const onchain = await getOnchainData(address)
    if (!onchain) return res.status(404).json({ error: 'Wallet not found' })
    res.json({ onchain, portfolioValue: getPortfolioValue(address) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
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
  const traces = getTraces()
  const filtered = address
    ? traces.filter(t => t.wallet_address === address)
    : traces
  res.json({ traces: filtered })
})

// GET /api/stats
app.get('/api/stats', (req, res) => {
  res.json(getStats())
})

// POST /api/run
app.post('/api/run', async (req, res) => {
  try {
    const { address } = req.body
    const portfolioValue = getPortfolioValue(address || 'default')
    const positions = getOpenPositions(address || 'default')
    const markets = await fetchMarkets()
    const results = []

    for (const market of markets.slice(0, 10)) {
      const articles = await fetchNewsForMarket(market)

      if (articles.length === 0) {
        const rec = await skipOrder(market, 'NO_ARTICLES', null, null)
        rec.wallet_address = address
        logTrace(rec, [], { score: 0, signal_count: 0 }, null, null)
        if (address) await recordSkip(address, 'NO_ARTICLES')
        results.push({ market_id: market.market_id, status: 'SKIPPED', reason: 'NO_ARTICLES' })
        continue
      }

      const signals = await extractSignalsForMarket(market, articles)
      const scoreResult = computeScore(signals)
      const edgeResult = calculateEdge(market, scoreResult, [])

      if (edgeResult.action === 'SKIP') {
        const rec = await skipOrder(market, edgeResult.reason, scoreResult, edgeResult)
        rec.wallet_address = address
        logTrace(rec, signals, scoreResult, edgeResult, null)
        if (address) await recordSkip(address, edgeResult.reason)
        results.push({ market_id: market.market_id, status: 'SKIPPED', reason: edgeResult.reason })
        continue
      }

      const riskResult = checkRisk(market, edgeResult, positions, portfolioValue)

      if (riskResult.action === 'SKIP') {
        const rec = await skipOrder(market, riskResult.reason, scoreResult, edgeResult)
        rec.wallet_address = address
        logTrace(rec, signals, scoreResult, edgeResult, riskResult)
        if (address) await recordSkip(address, riskResult.reason)
        results.push({ market_id: market.market_id, status: 'SKIPPED', reason: riskResult.reason })
        continue
      }

      const rec = await executeOrder(market, edgeResult, riskResult)
      rec.wallet_address = address
      logTrace(rec, signals, scoreResult, edgeResult, riskResult)

      // Record onchain
      if (address) {
        await recordExecution(address, riskResult.kelly.bet_size_usdc, riskResult.direction)
        walletPortfolios[address] = (walletPortfolios[address] || 1000) - riskResult.kelly.bet_size_usdc
      }

      positions.push({
        market_id: market.market_id,
        cluster_key: riskResult.cluster_key,
        size_fraction: riskResult.kelly.capped_fraction
      })

      if (address) openPositions[address] = positions

      results.push({
        market_id: market.market_id,
        status: rec.status,
        direction: rec.direction,
        bet_size_usdc: rec.bet_size_usdc
      })
    }

    res.json({ results, stats: getStats() })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, () => {
  console.log('[pythia] Backend running on port ' + PORT)
})