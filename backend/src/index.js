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

const app = express()
const PORT = process.env.PORT || 3001
const PORTFOLIO_VALUE = parseFloat(process.env.PORTFOLIO_VALUE || '1000')

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }))
app.use(express.json())

const openPositions = []

// GET /api/health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
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
  res.json({ traces: getTraces() })
})

// GET /api/stats
app.get('/api/stats', (req, res) => {
  res.json(getStats())
})

// POST /api/run — run full pipeline on all markets
app.post('/api/run', async (req, res) => {
  try {
    const markets = await fetchMarkets()
    const results = []

    for (const market of markets.slice(0, 10)) {
      const articles = await fetchNewsForMarket(market)

      if (articles.length === 0) {
        const rec = await skipOrder(market, 'NO_ARTICLES', null, null)
        logTrace(rec, [], { score: 0, signal_count: 0 }, null, null)
        results.push({ market_id: market.market_id, status: 'SKIPPED', reason: 'NO_ARTICLES' })
        continue
      }

      const signals = await extractSignalsForMarket(market, articles)
      const scoreResult = computeScore(signals)
      const edgeResult = calculateEdge(market, scoreResult, [])

      if (edgeResult.action === 'SKIP') {
        const rec = await skipOrder(market, edgeResult.reason, scoreResult, edgeResult)
        logTrace(rec, signals, scoreResult, edgeResult, null)
        results.push({ market_id: market.market_id, status: 'SKIPPED', reason: edgeResult.reason })
        continue
      }

      const riskResult = checkRisk(market, edgeResult, openPositions, PORTFOLIO_VALUE)

      if (riskResult.action === 'SKIP') {
        const rec = await skipOrder(market, riskResult.reason, scoreResult, edgeResult)
        logTrace(rec, signals, scoreResult, edgeResult, riskResult)
        results.push({ market_id: market.market_id, status: 'SKIPPED', reason: riskResult.reason })
        continue
      }

      const rec = await executeOrder(market, edgeResult, riskResult)
      logTrace(rec, signals, scoreResult, edgeResult, riskResult)
      openPositions.push({
        market_id: market.market_id,
        cluster_key: riskResult.cluster_key,
        size_fraction: riskResult.kelly.capped_fraction
      })

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