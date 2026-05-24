const axios = require('axios')

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const VALID_SIGNAL_TYPES = ['regulatory', 'liquidity', 'media_amplification', 'event_proximity']
const VALID_SENTIMENTS = ['YES', 'NO', 'NEUTRAL']

const SYSTEM_PROMPT = `You are a signal extraction engine for a prediction market analysis system.

Given a prediction market question and a news article, extract a structured signal.

You MUST respond with ONLY a valid JSON object. No explanation, no markdown, no preamble.

The JSON must have exactly these fields:
- signal_type: one of ["regulatory", "liquidity", "media_amplification", "event_proximity"]
- sentiment: one of ["YES", "NO", "NEUTRAL"]
- entity: the main entity involved as a lowercase string
- event_type: a short lowercase description (e.g. "product_release", "policy_decision")
- freshness_hours: copy the published_hours_ago value from the article metadata

Signal type definitions:
- regulatory: government, legal, or institutional decisions
- liquidity: market movement, trading, financial indicators
- media_amplification: viral/high-coverage news
- event_proximity: news directly about the event the market resolves on

Sentiment: YES increases probability of YES resolution, NO decreases it, NEUTRAL is tangential`

async function groqWithRetry(payload, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await axios.post(GROQ_API_URL, payload, {
        headers: {
          'Authorization': 'Bearer ' + process.env.GROQ_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      })
      return response
    } catch (err) {
      if (err.response?.status === 429) {
        // Rate limited — wait and retry
        const waitMs = Math.pow(2, attempt) * 500 // 2s, 4s, 8s
        console.log('[signalExtractor] Rate limited, waiting ' + waitMs + 'ms before retry ' + (attempt + 1))
        await new Promise(r => setTimeout(r, waitMs))
        continue
      }
      throw err
    }
  }
  throw new Error('Max retries exceeded')
}

async function extractSignal(market, article) {
  const userPrompt = `Market question: "${market.question}"

Article title: "${article.title}"
Article text: "${article.text.slice(0, 600)}"
Published hours ago: ${article.published_hours_ago}

Extract the signal JSON now:`

  try {
    const response = await groqWithRetry({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 150
    })

    const raw = response.data?.choices?.[0]?.message?.content || ''
    const cleaned = raw.replace(/```json|```/g, '').trim()

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      console.error('[signalExtractor] JSON parse failed:', cleaned.slice(0, 80))
      return null
    }

    return parsed

  } catch (err) {
    console.error('[signalExtractor] Error:', err.message)
    return null
  }
}

async function extractSignalsForMarket(market, articles) {
  const signals = []

  // Process max 5 articles per market to save rate limit budget
  const limited = articles.slice(0, 3)

  for (const article of limited) {
    const raw = await extractSignal(market, article)
    if (!raw) continue

    if (!raw.signal_type || !raw.sentiment || !raw.entity || !raw.event_type) {
      console.log('[signalExtractor] INVALIDATED — missing fields')
      continue
    }
    if (!VALID_SIGNAL_TYPES.includes(raw.signal_type)) {
      console.log('[signalExtractor] INVALIDATED — bad signal_type:', raw.signal_type)
      continue
    }
    if (!VALID_SENTIMENTS.includes(raw.sentiment)) {
      console.log('[signalExtractor] INVALIDATED — bad sentiment:', raw.sentiment)
      continue
    }

    const freshness = parseFloat(raw.freshness_hours)
    if (isNaN(freshness) || freshness < 0) {
      console.log('[signalExtractor] INVALIDATED — invalid freshness')
      continue
    }

    signals.push({
      signal_type: raw.signal_type,
      sentiment: raw.sentiment,
      entity: raw.entity.toLowerCase().trim(),
      event_type: raw.event_type.toLowerCase().trim(),
      freshness_hours: freshness,
      article_title: article.title
    })

    // Throttle between articles — 300ms gap
    await new Promise(r => setTimeout(r, 300))
  }

  console.log('[signalExtractor] "' + market.question.slice(0, 40) + '..." → ' + signals.length + '/' + limited.length + ' signals valid')
  return signals
}

module.exports = { extractSignalsForMarket }
