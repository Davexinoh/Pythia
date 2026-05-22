require('dotenv').config()
const { fetchMarkets } = require('./layers/marketFetcher')
const { fetchNewsForMarket } = require('./layers/newsRetriever')
const { extractSignalsForMarket } = require('./layers/signalExtractor')
const { computeScore } = require('./layers/scoringModel')
const { calculateEdge } = require('./layers/edgeCalculator')
const { checkRisk } = require('./layers/riskEngine')
const { executeOrder, skipOrder } = require('./layers/executionLayer')
const { logTrace, getTraces, getStats } = require('./layers/traceLogger')

const PORTFOLIO_VALUE = 1000
const openPositions = []

async function test() {
  console.log('[TEST] Running Layer 8 — Trace Logger')
  const markets = await fetchMarkets()

  for (const market of markets.slice(0, 3)) {
    console.log('\n[TEST] Processing:', market.question.slice(0, 55))

    const articles = await fetchNewsForMarket(market)
    let signals = []
    let scoreResult = { score: 0, signal_count: 0, dominant_sentiment: 'NEUTRAL' }
    let edgeResult = null
    let riskResult = null

    if (articles.length === 0) {
      const rec = await skipOrder(market, 'NO_ARTICLES', null, null)
      logTrace(rec, [], scoreResult, null, null)
      continue
    }

    signals = await extractSignalsForMarket(market, articles)
    scoreResult = computeScore(signals)
    edgeResult = calculateEdge(market, scoreResult, [])

    if (edgeResult.action === 'SKIP') {
      const rec = await skipOrder(market, edgeResult.reason, scoreResult, edgeResult)
      logTrace(rec, signals, scoreResult, edgeResult, null)
      continue
    }

    riskResult = checkRisk(market, edgeResult, openPositions, PORTFOLIO_VALUE)

    if (riskResult.action === 'SKIP') {
      const rec = await skipOrder(market, riskResult.reason, scoreResult, edgeResult)
      logTrace(rec, signals, scoreResult, edgeResult, riskResult)
      continue
    }

    const rec = await executeOrder(market, edgeResult, riskResult)
    logTrace(rec, signals, scoreResult, edgeResult, riskResult)
    openPositions.push({
      market_id: market.market_id,
      cluster_key: riskResult.cluster_key,
      size_fraction: riskResult.kelly.capped_fraction
    })
  }

  console.log('\n[TEST] Stats:')
  console.log(JSON.stringify(getStats(), null, 2))

  console.log('\n[TEST] First trace:')
  const traces = getTraces()
  console.log(JSON.stringify(traces[traces.length - 1], null, 2))
}

test()