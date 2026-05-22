require('dotenv').config()
const { fetchMarkets } = require('./layers/marketFetcher')
const { fetchNewsForMarket } = require('./layers/newsRetriever')
const { extractSignalsForMarket } = require('./layers/signalExtractor')
const { computeScore } = require('./layers/scoringModel')
const { calculateEdge } = require('./layers/edgeCalculator')

async function test() {
  console.log('[TEST] Running Layer 5 — Edge Calculator')
  const markets = await fetchMarkets()

  // Test first 3 markets to see variety
  for (const market of markets.slice(0, 3)) {
    console.log('\n[TEST] Market:', market.question)
    console.log('[TEST] Implied prob:', market.implied_probability)

    const articles = await fetchNewsForMarket(market)
    const signals = await extractSignalsForMarket(market, articles)
    const scoreResult = computeScore(signals)
    const edgeResult = calculateEdge(market, scoreResult, [])

    console.log('[TEST] Score:', scoreResult.score, '| Dominant:', scoreResult.dominant_sentiment)
    console.log('[TEST] Action:', edgeResult.action, '— Reason:', edgeResult.reason)
    if (edgeResult.model_probability) {
      console.log('[TEST] Model prob:', edgeResult.model_probability, '| Edge:', edgeResult.edge, '| Adjusted:', edgeResult.adjusted_edge, '| Threshold:', edgeResult.threshold)
    }
  }
}

test()