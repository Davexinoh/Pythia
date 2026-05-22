require('dotenv').config()
const axios = require('axios')

async function debug() {
  const response = await axios.get('https://clob.polymarket.com/markets', {
    params: { active: true, closed: false, limit: 100 },
    timeout: 10000
  })

  const raw = response.data?.data || response.data || []

  const binary = raw.find(m =>
    Array.isArray(m.tokens) &&
    m.tokens.some(t => t.outcome?.toLowerCase() === 'yes') &&
    m.tokens.some(t => t.outcome?.toLowerCase() === 'no') &&
    m.tokens.every(t => t.winner === false)
  )

  if (!binary) {
    console.log('No active unresolved binary market found')
    return
  }

  console.log('ALL KEYS:', JSON.stringify(Object.keys(binary)))
  console.log('end_date_iso:', binary.end_date_iso)
  console.log('question:', binary.question)
}

debug().catch(console.error)
