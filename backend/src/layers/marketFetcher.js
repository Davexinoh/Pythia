const axios = require('axios')

const BASE_URL = 'https://gamma-api.polymarket.com'
const MIN_LIQUIDITY = 10000
const MIN_VOLUME = 50000
const MIN_DAYS_TO_CLOSE = 0.001

const BLOCKED_KEYWORDS = [
  'jesus christ', 'god ', 'alien', 'zombie', 'apocalypse',
  'rapture', 'second coming', 'flat earth', 'bigfoot'
]

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

function isQualityMarket(market) {
  const q = (market.question || '').toLowerCase()
  for (const keyword of BLOCKED_KEYWORDS) {
    if (q.includes(keyword)) return false
  }
  // Skip markets with probability below 2% or above 98% — no edge possible
  const prob = market._prob
  if (prob !== null && (prob < 0.02 || prob > 0.98)) return false
  return true
}

function getCategory(market) {
  const q = (market.question || '').toLowerCase()
  const tags = (market.tags || []).join(' ').toLowerCase()
  const combined = q + ' ' + tags

  if (combined.includes('btc') || combined.includes('bitcoin')) return 'Bitcoin'
  if (combined.includes('eth') || combined.includes('ethereum')) return 'Ethereum'
  if (combined.includes('sol') || combined.includes('solana')) return 'Solana'
  if (combined.includes('xrp') || combined.includes('ripple')) return 'Crypto'
  if (combined.includes('doge') || combined.includes('pepe') || combined.includes('bnb') || combined.includes('avax') || combined.includes('sui') || combined.includes('ton') || combined.includes('chainlink')) return 'Crypto'
  if (combined.includes('nba') || combined.includes('nfl') || combined.includes('nhl') || combined.includes('mlb') || combined.includes('fifa') || combined.includes('world cup') || combined.includes('stanley cup') || combined.includes('super bowl') || combined.includes('champions league') || combined.includes('premier league')) return 'Sports'
  if (combined.includes('trump') || combined.includes('biden') || combined.includes('harris') || combined.includes('election') || combined.includes('president') || combined.includes('senate') || combined.includes('congress') || combined.includes('republican') || combined.includes('democrat')) return 'Politics'
  if (combined.includes('fed') || combined.includes('interest rate') || combined.includes('gdp') || combined.includes('inflation') || combined.includes('recession') || combined.includes('cpi') || combined.includes('fomc') || combined.includes('tariff')) return 'Macro'
  if (combined.includes('ai') || combined.includes('openai') || combined.includes('anthropic') || combined.includes('nvidia') || combined.includes('apple') || combined.includes('google') || combined.includes('microsoft')) return 'Tech'
  if (combined.includes('crypto') || combined.includes('defi') || combined.includes('blockchain') || combined.includes('token') || combined.includes('altcoin')) return 'Crypto'
  if (combined.includes('gta') || combined.includes('album') || combined.includes('movie') || combined.includes('oscar') || combined.includes('grammy') || combined.includes('taylor') || combined.includes('rihanna')) return 'Pop Culture'
  return 'Other'
}

function getIcon(market) {
  const icons = {
    'Bitcoin': '₿', 'Ethereum': 'Ξ', 'Solana': '◎',
    'Crypto': '🪙', 'Sports': '🏆', 'Politics': '🏛️',
    'Macro': '📈', 'Tech': '🤖', 'Pop Culture': '🎬', 'Other': '🔮'
  }
  return icons[getCategory(market)] || '🔮'
}

async function fetchMarketsPage(offset = 0, limit = 100) {
  try {
    const response = await axios.get(BASE_URL + '/markets', {
      params: { active: true, closed: false, limit, offset },
      timeout: 15000
    })
    return Array.isArray(response.data) ? response.data : response.data.data || []
  } catch {
    return []
  }
}

async function fetchMarkets() {
  try {
    const pagePromises = []
    for (let offset = 0; offset < 1500; offset += 100) {
      pagePromises.push(fetchMarketsPage(offset, 100))
    }

    const pages = await Promise.allSettled(pagePromises)
    const raw = pages.filter(p => p.status === 'fulfilled').flatMap(p => p.value)

    const seen = new Set()
    const filtered = []

    for (const market of raw) {
      if (!market.active || market.closed || market.archived) continue

      const id = market.id
      if (seen.has(id)) continue
      seen.add(id)

      const liquidity = parseFloat(market.liquidityNum || market.liquidity || 0)
      if (liquidity < MIN_LIQUIDITY) continue

      const volume = parseFloat(market.volumeNum || market.volume || 0)
      if (volume < MIN_VOLUME) continue

      const days = daysUntilClose(market.endDateIso || market.end_date_iso)
      if (days === null || days < MIN_DAYS_TO_CLOSE) continue

      const impliedProbability = extractImpliedProbability(market)
      if (impliedProbability === null) continue

      const enriched = { ...market, _prob: impliedProbability }
      if (!isQualityMarket(enriched)) continue

      filtered.push({
        market_id: market.id,
        question: market.question,
        implied_probability: impliedProbability,
        liquidity,
        volume,
        days_to_close: parseFloat(days.toFixed(4)),
        end_date: market.endDateIso || market.end_date_iso,
        category: getCategory(market),
        icon: getIcon(market),
        fetched_at: new Date().toISOString()
      })
    }

    // Sort by volume — highest volume = most liquid = best for trading
    filtered.sort((a, b) => b.volume - a.volume)

    console.log('[marketFetcher] Fetched ' + raw.length + ' raw → ' + filtered.length + ' passed filters')
    return filtered

  } catch (err) {
    console.error('[marketFetcher] Error:', err.message)
    return []
  }
}

module.exports = { fetchMarkets }
