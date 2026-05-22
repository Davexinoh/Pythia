require('dotenv').config()
const { fetchMarkets } = require('./layers/marketFetcher')
const { fetchNewsForMarket } = require('./layers/newsRetriever')
const { extractSignalsForMarket } = require('./layers/signalExtractor')

async function test() {
  console.log('[TEST] Running Layer 3 — Signal Extractor')
  const markets = await fetchMarkets()
  const sample = markets[0]
  console.log('[TEST] Market:', sample.question)

  const articles = await fetchNewsForMarket(sample)
  console.log('[TEST] Articles:', articles.length)

  const signals = await extractSignalsForMarket(sample, articles)
  console.log('[TEST] Signals extracted:', signals.length)
  console.log(JSON.stringify(signals, null, 2))
}

test()