const { MongoClient } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI
const DB_NAME = 'pythia'

let db = null
let client = null

async function getDB() {
  if (db) return db
  client = new MongoClient(MONGODB_URI)
  await client.connect()
  db = client.db(DB_NAME)
  console.log('[store] Connected to MongoDB')
  return db
}

// Traces
async function addTrace(trace) {
  try {
    const database = await getDB()
    await database.collection('traces').insertOne(trace)
  } catch (err) {
    console.error('[store] addTrace error:', err.message)
  }
}

async function getTraces(address) {
  try {
    const database = await getDB()
    const query = address ? { wallet_address: address } : {}
    const traces = await database.collection('traces')
      .find(query)
      .sort({ timestamp: -1 })
      .limit(200)
      .toArray()
    return traces
  } catch (err) {
    console.error('[store] getTraces error:', err.message)
    return []
  }
}

async function getStats(address) {
  try {
    const traces = await getTraces(address)
    const total = traces.length
    const executed = traces.filter(t => t.status === 'SIMULATED' || t.status === 'EXECUTED').length
    const skipped = traces.filter(t => t.status === 'SKIPPED').length
    const invalidated = traces.filter(t => t.status === 'INVALIDATED').length
    const skipReasons = {}
    traces.filter(t => t.status === 'SKIPPED').forEach(t => {
      const r = t.reason || 'UNKNOWN'
      skipReasons[r] = (skipReasons[r] || 0) + 1
    })
    return { total, executed, skipped, invalidated, skipReasons }
  } catch (err) {
    console.error('[store] getStats error:', err.message)
    return { total: 0, executed: 0, skipped: 0, invalidated: 0, skipReasons: {} }
  }
}

// Balances
async function getBalance(address) {
  try {
    const database = await getDB()
    const doc = await database.collection('balances').findOne({ address })
    return doc ? doc.balance : 1000
  } catch (err) {
    console.error('[store] getBalance error:', err.message)
    return 1000
  }
}

async function setBalance(address, balance) {
  try {
    const database = await getDB()
    await database.collection('balances').updateOne(
      { address },
      { $set: { address, balance, updatedAt: new Date().toISOString() } },
      { upsert: true }
    )
  } catch (err) {
    console.error('[store] setBalance error:', err.message)
  }
}

// Wallets
async function getWallet(email) {
  try {
    const database = await getDB()
    const doc = await database.collection('wallets').findOne({ email: email.toLowerCase() })
    return doc || null
  } catch (err) {
    console.error('[store] getWallet error:', err.message)
    return null
  }
}

async function setWallet(email, walletData) {
  try {
    const database = await getDB()
    await database.collection('wallets').updateOne(
      { email: email.toLowerCase() },
      { $set: { ...walletData, email: email.toLowerCase() } },
      { upsert: true }
    )
  } catch (err) {
    console.error('[store] setWallet error:', err.message)
  }
}

// Open Positions
async function getOpenPositions(address) {
  try {
    const database = await getDB()
    const positions = await database.collection('positions')
      .find({ wallet_address: address, status: 'OPEN' })
      .toArray()
    return positions
  } catch (err) {
    console.error('[store] getOpenPositions error:', err.message)
    return []
  }
}

async function addPosition(position) {
  try {
    const database = await getDB()
    await database.collection('positions').insertOne({
      ...position,
      status: 'OPEN',
      createdAt: new Date().toISOString()
    })
  } catch (err) {
    console.error('[store] addPosition error:', err.message)
  }
}

async function hasOpenPosition(address, market_id) {
  try {
    const database = await getDB()
    const existing = await database.collection('positions').findOne({
      wallet_address: address,
      market_id,
      status: 'OPEN'
    })
    return !!existing
  } catch (err) {
    console.error('[store] hasOpenPosition error:', err.message)
    return false
  }
}

async function closePosition(address, market_id, exitPrice, pnl) {
  try {
    const database = await getDB()
    const position = await database.collection('positions').findOne({
      wallet_address: address,
      market_id,
      status: 'OPEN'
    })

    if (!position) return null

    await database.collection('positions').updateOne(
      { wallet_address: address, market_id, status: 'OPEN' },
      {
        $set: {
          status: 'CLOSED',
          exit_price: exitPrice,
          pnl,
          closedAt: new Date().toISOString()
        }
      }
    )

    // Update balance
    const currentBalance = await getBalance(address)
    const newBalance = Math.max(0, currentBalance + position.bet_size_usdc + pnl)
    await setBalance(address, newBalance)

    return { position, newBalance, pnl }
  } catch (err) {
    console.error('[store] closePosition error:', err.message)
    return null
  }
}

async function getAllPositions(address) {
  try {
    const database = await getDB()
    const positions = await database.collection('positions')
      .find({ wallet_address: address })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray()
    return positions
  } catch (err) {
    console.error('[store] getAllPositions error:', err.message)
    return []
  }
}

module.exports = {
  addTrace,
  getTraces,
  getStats,
  getBalance,
  setBalance,
  getWallet,
  setWallet,
  getOpenPositions,
  addPosition,
  hasOpenPosition,
  closePosition,
  getAllPositions
}
