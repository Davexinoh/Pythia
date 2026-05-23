const axios = require('axios')

const BASE_URL = 'https://gamma-api.polymarket.com'
const MIN_LIQUIDITY = 5000
const MAX_DAYS_TO_CLOSE = 180
const MIN_DAYS_TO_CLOSE = 0.1

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

function getCategory(market) {
  const q = (market.question || '').toLowerCase()
  const tags = market.tags || []
  const tagStr = tags.join(' ').toLowerCase()

  if (q.includes('btc') || q.includes('bitcoin')) return 'Bitcoin'
  if (q.includes('eth') || q.includes('ethereum')) return 'Ethereum'
  if (q.includes('sol') || q.includes('solana')) return 'Solana'
  if (q.includes('crypto') || q.includes('coin') || tagStr.includes('crypto')) return 'Crypto'
  if (q.includes('nba') || q.includes('nfl') || q.includes('nhl') || q.includes('mlb') || q.includes('soccer') || tagStr.includes('sports')) return 'Sports'
  if (q.includes('trump') || q.includes('biden') || q.includes('election') || q.includes('president')) return 'Politics'
  if (q.includes('fed') || q.includes('rate') || q.includes('gdp') || q.includes('inflation')) return 'Macro'
  if (q.includes('gta') || q.includes('album') || q.includes('movie') || q.includes('oscar')) return 'Pop Culture'
  if (tagStr.includes('politics')) return 'Politics'
  if (tagStr.includes('business')) return 'Business'
  return 'Other'
}

function getIcon(market) {
  const category = getCategory(market)
  const icons = {
    'Bitcoin': '₿',
    'Ethereum': 'Ξ',
    'Solana': '◎',
    'Crypto': '🔷',
    'Sports': '🏆',
    'Politics': '🏛️',
    'Macro': '📈',
    'Pop Culture': '🎬',
    'Business': '💼',
    'Other': '🔮'
  }
  return icons[category] || '🔮'
}

async function fetchMarketsPage(offset = 0, limit = 100) {
  const response = await axios.get(BASE_URL + '/markets', {
    params: {
      active: true,
      closed: false,
      limit,
      offset
    },
    timeout: 15000
  })
  return Array.isArray(response.data) ? response.data : response.data.data || []
}

async function fetchMarkets() {
  try {
    // Fetch multiple pages
    const pages = await Promise.all([
      fetchMarketsPage(0, 100),
      fetchMarketsPage(100, 100),
      fetchMarketsPage(200, 100),
      fetchMarketsPage(300, 100),
      fetchMarketsPage(400, 100),
    ])

    const raw = pages.flat()
    const seen = new Set()
    const filtered = []

    for (const market of raw) {
      if (!market.active || market.closed || market.archived) continue

      const id = market.id
      if (seen.has(id)) continue
      seen.add(id)

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
        category: getCategory(market),
        icon: getIcon(market),
        fetched_at: new Date().toISOString()
      })
    }

    // Sort by volume descending
    filtered.sort((a, b) => b.volume - a.volume)

    console.log('[marketFetcher] Fetched ' + raw.length + ' markets → ' + filtered.length + ' passed filters')
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
