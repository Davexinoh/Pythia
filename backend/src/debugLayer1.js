require('dotenv').config()
const axios = require('axios')

async function debug() {
  const response = await axios.get('https://clob.polymarket.com/markets', {
    params: { active: true, closed: false, limit: 3 },
    timeout: 10000
  })

  const raw = response.data?.data || response.data || []
  console.log('Total returned:', raw.length)
  console.log('First market raw shape:')
  console.log(JSON.stringify(raw[0], null, 2))
}

debug().catch(console.error)
