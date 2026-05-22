require('dotenv').config()
const { fetchMarkets } = require('./layers/marketFetcher')

async function test() {
  console.log('[TEST] Running Layer 1 — Market Fetcher')
  const markets = await fetchMarkets()
  if (markets.length === 0) {
    console.log('[TEST] No markets passed filters — check API response shape')
    return
  }
  console.log(`[TEST] ${markets.length} markets ready`)
  console.log('[TEST] Sample market:')
  console.log(JSON.stringify(markets[0], null, 2))
}

test()
