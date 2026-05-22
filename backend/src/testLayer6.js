require('dotenv').config()
const { fetchMarkets } = require('./layers/marketFetcher')
const { fetchNewsForMarket } = require('./layers/newsRetriever')
const { extractSignalsForMarket } = require('./layers/signalExtractor')
const { computeScore } = require('./layers/scoringModel')
const { calculateEdge } = require('./layers/edgeCalculator')
const { checkRisk } = require('./layers/riskEngine')

const PORTFOLIO_VALUE = 1000
const MOCK_OPEN_POSITIONS = []

async function test() {
  console.log('[TEST] Running Layer 6 — Risk Engine')
  console.log('[TEST] Portfolio: $' + PORTFOLIO_VALUE + ' USDC')
  const markets = await fetchMarkets()

  for (const market of markets.slice(0, 3)) {
    console.log('\n[TEST] Market:', market.question.slice(0, 60))

    const articles = await fetchNewsForMarket(market)
    const signals = await extractSignalsForMarket(market, articles)
    const scoreResult = computeScore(signals)
    const edgeResult = calculateEdge(market, scoreResult, [])

    if (edgeResult.action === 'SKIP') {
      console.log('[TEST] Skipped at Layer 5 — reason:', edgeResult.reason)
      continue
    }

    const riskResult = checkRisk(market, edgeResult, MOCK_OPEN_POSITIONS, PORTFOLIO_VALUE)

    console.log('[TEST] Risk action:', riskResult.action)
    console.log('[TEST] Direction:', riskResult.direction)
    console.log('[TEST] Bet size: $' + riskResult.kelly.bet_size_usdc + ' USDC')
    console.log('[TEST] Cluster:', riskResult.cluster_key)
    riskResult.checks.forEach(c => {
      console.log('  [' + (c.passed ? '✓' : '✗') + '] ' + c.check + ' — ' + c.reason)
    })
  }
}

test()