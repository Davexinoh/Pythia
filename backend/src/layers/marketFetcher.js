const axios = require('axios')

const BASE_URL = 'https://gamma-api.polymarket.com'
const MIN_LIQUIDITY = 5000
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
  const tags = (market.tags || []).join(' ').toLowerCase()
  const combined = q + ' ' + tags

  if (combined.includes('btc') || combined.includes('bitcoin')) return 'Bitcoin'
  if (combined.includes('eth') || combined.includes('ethereum')) return 'Ethereum'
  if (combined.includes('sol') || combined.includes('solana')) return 'Solana'
  if (combined.includes('nba') || combined.includes('nfl') || combined.includes('nhl') || combined.includes('mlb') || combined.includes('fifa') || combined.includes('world cup') || combined.includes('stanley cup') || combined.includes('super bowl') || combined.includes('champions league') || combined.includes('premier league')) return 'Sports'
  if (combined.includes('trump') || combined.includes('biden') || combined.includes('election') || combined.includes('president') || combined.includes('senate') || combined.includes('congress') || combined.includes('republican') || combined.includes('democrat') || combined.includes('vote') || combined.includes('primary')) return 'Politics'
  if (combined.includes('fed') || combined.includes('interest rate') || combined.includes('gdp') || combined.includes('inflation') || combined.includes('recession') || combined.includes('cpi') || combined.includes('fomc')) return 'Macro'
  if (combined.includes('ai') || combined.includes('openai') || combined.includes('anthropic') || combined.includes('google') || combined.includes('microsoft') || combined.includes('apple') || combined.includes('nvidia')) return 'Tech'
  if (combined.includes('crypto') || combined.includes('coin') || combined.includes('token') || combined.includes('defi') || combined.includes('blockchain') || combined.includes('xrp') || combined.includes('doge') || combined.includes('pepe') || combined.includes('bnb') || combined.includes('avax') || combined.includes('chainlink')) return 'Crypto'
  if (combined.includes('gta') || combined.includes('album') || combined.includes('movie') || combined.includes('oscar') || combined.includes('grammy') || combined.includes('taylor') || combined.includes('rihanna') || combined.includes('emmy') || combined.includes('box office')) return 'Pop Culture'
  return 'Other'
}

function getIcon(market) {
  const cat = getCategory(market)
  const icons = {
    'Bitcoin': '₿',
    'Ethereum': 'Ξ',
    'Solana': '◎',
    'Crypto': '🪙',
    'Sports': '🏆',
    'Politics': '🏛️',
    'Macro': '📈',
    'Tech': '🤖',
    'Pop Culture': '🎬',
    'Other': '🔮'
  }
  return icons[cat] || '🔮'
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
    for (let offset = 0; offset < 1000; offset += 100) {
      pagePromises.push(fetchMarketsPage(offset, 100))
    }

    const pages = await Promise.allSettled(pagePromises)
    const raw = pages
      .filter(p => p.status === 'fulfilled')
      .flatMap(p => p.value)

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
      if (days === null || days < MIN_DAYS_TO_CLOSE) continue

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

    filtered.sort((a, b) => b.volume - a.volume)

    console.log('[marketFetcher] Fetched ' + raw.length + ' raw → ' + filtered.length + ' passed filters')
    return filtered

  } catch (err) {
    console.error('[marketFetcher] Error:', err.message)
    return []
  }
}

module.exports = { fetchMarkets }
