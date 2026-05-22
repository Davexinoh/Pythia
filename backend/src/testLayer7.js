require('dotenv').config()
const { fetchMarkets } = require('./layers/marketFetcher')
const { fetchNewsForMarket } = require('./layers/newsRetriever')
const { extractSignalsForMarket } = require('./layers/signalExtractor')
const { computeScore } = require('./layers/scoringModel')
const { calculateEdge } = require('./layers/edgeCalculator')
const { checkRisk } = require('./layers/riskEngine')
const { executeOrder, skipOrder, getExecutionLog } = require('./layers/executionLayer')

const PORTFOLIO_VALUE = 1000
const openPositions = []

async function test() {
  console.log('[TEST] Running Layer 7 — Execution Layer')
  const markets = await fetchMarkets()

  for (const market of markets.slice(0, 3)) {
    console.log('\n[TEST] Processing:', market.question.slice(0, 60))

    const articles = await fetchNewsForMarket(market)

    if (articles.length === 0) {
      await skipOrder(market, 'NO_ARTICLES', null, null)
      console.log('[TEST] → SKIPPED — no articles')
      continue
    }

    const signals = await extractSignalsForMarket(market, articles)
    const scoreResult = computeScore(signals)
    const edgeResult = calculateEdge(market, scoreResult, [])

    if (edgeResult.action === 'SKIP') {
      await skipOrder(market, edgeResult.reason, scoreResult, edgeResult)
      console.log('[TEST] → SKIPPED —', edgeResult.reason)
      continue
    }

    const riskResult = checkRisk(market, edgeResult, openPositions, PORTFOLIO_VALUE)

    if (riskResult.action === 'SKIP') {
      await skipOrder(market, riskResult.reason, scoreResult, edgeResult)
      console.log('[TEST] → SKIPPED —', riskResult.reason)
      continue
    }

    const execution = await executeOrder(market, edgeResult, riskResult)
    openPositions.push({
      market_id: market.market_id,
      cluster_key: riskResult.cluster_key,
      size_fraction: riskResult.kelly.capped_fraction
    })

    console.log('[TEST] → EXECUTED | ' + execution.direction + ' | $' + execution.bet_size_usdc + ' | ' + execution.status)
  }

  console.log('\n[TEST] Full execution log:')
  console.log(JSON.stringify(getExecutionLog(), null, 2))
}

test()