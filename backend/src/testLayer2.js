require('dotenv').config()
const { fetchMarkets } = require('./layers/marketFetcher')
const { fetchNewsForMarket } = require('./layers/newsRetriever')

async function test() {
  console.log('[TEST] Running Layer 2 — News Retriever')
  const markets = await fetchMarkets()
  if (markets.length === 0) {
    console.log('[TEST] No markets from Layer 1')
    return
  }

  const sample = markets[0]
  console.log('[TEST] Fetching news for:', sample.question)
  const news = await fetchNewsForMarket(sample)

  console.log('[TEST] Articles after all filters:', news.length)
  if (news[0]) {
    console.log('[TEST] Sample article:')
    console.log(JSON.stringify(news[0], null, 2))
  } else {
    console.log('[TEST] No articles passed filters for this market')
    console.log('[TEST] Try markets[1] or markets[2] — not all markets have fresh news')
  }
}

test()