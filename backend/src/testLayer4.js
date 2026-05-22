require('dotenv').config()
const { fetchMarkets } = require('./layers/marketFetcher')
const { fetchNewsForMarket } = require('./layers/newsRetriever')
const { extractSignalsForMarket } = require('./layers/signalExtractor')
const { computeScore } = require('./layers/scoringModel')

async function test() {
  console.log('[TEST] Running Layer 4 — Scoring Model')
  const markets = await fetchMarkets()
  const sample = markets[0]
  console.log('[TEST] Market:', sample.question)
  console.log('[TEST] Implied probability:', sample.implied_probability)

  const articles = await fetchNewsForMarket(sample)
  const signals = await extractSignalsForMarket(sample, articles)
  const result = computeScore(signals)

  console.log('\n[TEST] Score result:')
  console.log('  score:', result.score)
  console.log('  dominant_sentiment:', result.dominant_sentiment)
  console.log('  signal_count:', result.signal_count)
  console.log('\n[TEST] Breakdown:')
  result.breakdown.forEach(b => {
    console.log('  [' + b.signal_type + '] ' + b.sentiment + ' | decay=' + b.decay + ' | contribution=' + b.contribution + ' | ' + b.article_title.slice(0, 50))
  })
}

test()