const axios = require('axios')

const BASE_URL = 'https://gamma-api.polymarket.com'
const MIN_LIQUIDITY = 10000
const MAX_DAYS_TO_CLOSE = 90
const MIN_DAYS_TO_CLOSE = 0.5

function daysUntilClose(endDateIso) {
  if (!endDateIso) return null
  const now = Date.now()
  const end = new Date(endDateIso).getTime()
  if (isNaN(end)) return null
  return (end - now) / (1000 * 60 * 60 * 24)
}

function extractImpliedProbability(market) {
  try {
    const prices = JSON.parse(market.outcomePrices)
    const outcomes = JSON.parse(market.outcomes)
    const yesIndex = outcomes.findIndex(o => o.toLowerCase() === 'yes')
    if (yesIndex === -1) return null
    const price = parseFloat(prices[yesIndex])
    if (isNaN(price) || price <= 0 || price >= 1) return null
    return price
  } catch {
    return null
  }
}

async function fetchMarkets() {
  try {
    const response = await axios.get(BASE_URL + '/markets', {
      params: {
        active: true,
        closed: false,
        limit: 100
      },
      timeout: 10000
    })

    const raw = Array.isArray(response.data)
      ? response.data
      : response.data.data || []

    if (!Array.isArray(raw)) {
      console.error('[marketFetcher] Unexpected response shape:', typeof raw)
      return []
    }

    const filtered = []

    for (const market of raw) {
      if (!market.active || market.closed || market.archived) continue

      const liquidity = parseFloat(market.liquidityNum || market.liquidity || 0)
      if (liquidity < MIN_LIQUIDITY) continue

      const days = daysUntilClose(market.endDateIso || market.end_date_iso)
      if (days === null || days < MIN_DAYS_TO_CLOSE || days > MAX_DAYS_TO_CLOSE) continue

      const impliedProbability = extractImpliedProbability(market)
      if (impliedProbability === null) continue

      filtered.push({
        market_id: market.id,
        question: market.question,
        implied_probability: impliedProbability,
        liquidity,
        volume: parseFloat(market.volumeNum || market.volume || 0),
        days_to_close: parseFloat(days.toFixed(2)),
        end_date: market.endDateIso || market.end_date_iso,
        category: market.category || 'unknown',
        fetched_at: new Date().toISOString()
      })
    }

    console.log('[marketFetcher] Fetched ' + raw.length + ' markets, ' + filtered.length + ' passed filters')
    return filtered

  } catch (err) {
    if (err.code === 'ECONNABORTED') {
      console.error('[marketFetcher] Request timed out')
    } else if (err.response) {
      console.error('[marketFetcher] API error ' + err.response.status)
    } else {
      console.error('[marketFetcher] Error:', err.message)
    }
    return []
  }
}

module.exports = { fetchMarkets }