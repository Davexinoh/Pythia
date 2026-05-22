require('dotenv').config()
const axios = require('axios')

async function debug() {
  const response = await axios.get('https://clob.polymarket.com/markets', {
    params: { active: true, closed: false, limit: 10 },
    timeout: 10000
  })

  const raw = response.data?.data || response.data || []
  const first = raw[0]
  
  console.log('ALL KEYS:')
  Object.keys(first).forEach(k => {
    const val = first[k]
    if (typeof val !== 'object') {
      console.log(` ${k}: ${val}`)
    } else {
      console.log(` ${k}: [object]`)
    }
  })
}

debug().catch(console.error)
