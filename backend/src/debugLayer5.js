require('dotenv').config()
const axios = require('axios')

async function debug() {
  const response = await axios.get('https://clob.polymarket.com/markets', {
    params: { active: true, closed: false, limit: 10 },
    timeout: 10000
  })

  const raw = response.data?.data || response.data || []
  const first = raw[0]
  const keys = Object.keys(first)
  
  // Print first 15 keys with values
  keys.slice(0, 15).forEach(k => {
    const val = first[k]
    if (typeof val !== 'object') {
      console.log(`${k}: ${val}`)
    }
  })
}

debug().catch(console.error)
