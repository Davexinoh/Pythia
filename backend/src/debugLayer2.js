require('dotenv').config()
const axios = require('axios')

async function debug() {
  const response = await axios.get('https://clob.polymarket.com/markets', {
    params: { active: true, closed: false, limit: 100 },
    timeout: 10000
  })

  const raw = response.data?.data || response.data || []
  
  // Find first binary YES/NO market
  const binary = raw.find(m => 
    Array.isArray(m.tokens) &&
    m.tokens.some(t => t.outcome?.toUpperCase() === 'YES') &&
    m.tokens.some(t => t.outcome?.toUpperCase() === 'NO')
  )

  if (!binary) {
    console.log('No binary YES/NO market found in first 100')
    console.log('Sample outcomes from first 5 markets:')
    raw.slice(0, 5).forEach((m, i) => {
      console.log(`Market ${i}:`, m.tokens?.map(t => t.outcome))
    })
    return
  }

  console.log('Binary market found:')
  console.log('Keys:', Object.keys(binary))
  console.log('question:', binary.question)
  console.log('volume fields:', {
    volume: binary.volume,
    volumeNum: binary.volumeNum,
    liquidity: binary.liquidity,
    liquidityNum: binary.liquidityNum
  })
  console.log('date fields:', {
    endDateIso: binary.endDateIso,
    end_date_iso: binary.end_date_iso,
    endDate: binary.endDate
  })
  console.log('id fields:', {
    id: binary.id,
    conditionId: binary.conditionId,
    marketMakerAddress: binary.marketMakerAddress
  })
  console.log('tokens:', binary.tokens)
}

debug().catch(console.error)
