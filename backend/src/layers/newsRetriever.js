const axios = require('axios')

const EXA_API_URL = 'https://api.exa.ai/search'
const MAX_ARTICLE_AGE_HOURS = 24

function hoursAgo(dateString) {
  if (!dateString) return null
  const published = new Date(dateString).getTime()
  if (isNaN(published)) return null
  return (Date.now() - published) / (1000 * 60 * 60)
}

function hashContent(text) {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i)
    hash |= 0
  }
  return hash.toString()
}

function hasOldYear(title) {
  const match = title.match(/\b(20\d{2})\b/)
  if (!match) return false
  return parseInt(match[1]) < new Date().getFullYear() - 1
}

function isNonEnglish(text) {
  const nonAsciiRatio = (text.match(/[^\x00-\x7F]/g) || []).length / text.length
  return nonAsciiRatio > 0.1
}

async function fetchNewsForMarket(market) {
  try {
    const response = await axios.post(EXA_API_URL, {
      query: market.question,
      numResults: 10,
      useAutoprompt: true,
      startPublishedDate: new Date(Date.now() - MAX_ARTICLE_AGE_HOURS * 60 * 60 * 1000).toISOString(),
      contents: {
        text: { maxCharacters: 1000 }
      }
    }, {
      headers: {
        'x-api-key': process.env.EXA_API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    })

    const results = response.data?.results || []
    const seen = new Set()
    const deduplicated = []

    for (const article of results) {
      const text = (article.text || article.title || '').trim()
      if (!text || text.length < 50) continue

      const hours = hoursAgo(article.publishedDate)
      if (hours === null || hours < 0 || hours > MAX_ARTICLE_AGE_HOURS) continue

      if (hasOldYear(article.title || '')) continue
      if (isNonEnglish(text)) continue

      const hash = hashContent(text.slice(0, 200))
      if (seen.has(hash)) continue
      seen.add(hash)

      deduplicated.push({
        title: article.title || '',
        text: text.slice(0, 1000),
        url: article.url || '',
        published_hours_ago: parseFloat(hours.toFixed(1)),
        source: article.author || new URL(article.url || 'https://unknown').hostname
      })
    }

    console.log('[newsRetriever] "' + market.question.slice(0, 40) + '..." → ' + results.length + ' fetched, ' + deduplicated.length + ' after dedup/filter')
    return deduplicated

  } catch (err) {
    if (err.response) {
      console.error('[newsRetriever] API error ' + err.response.status + ' for market ' + market.market_id)
    } else {
      console.error('[newsRetriever] Error for market ' + market.market_id + ':', err.message)
    }
    return []
  }
}

async function fetchNewsForMarkets(markets) {
  const results = {}
  for (const market of markets) {
    results[market.market_id] = await fetchNewsForMarket(market)
    await new Promise(r => setTimeout(r, 300))
  }
  return results
}

module.exports = { fetchNewsForMarkets, fetchNewsForMarket }