const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(__dirname, '../data')
const DATA_FILE = path.join(DATA_DIR, 'pythia.json')

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

// Initialize file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({
    traces: [],
    balances: {},
    wallets: {}
  }, null, 2))
}

function readStore() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8')
    return JSON.parse(raw)
  } catch {
    return { traces: [], balances: {}, wallets: {} }
  }
}

function writeStore(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
  } catch (err) {
    console.error('[store] Write failed:', err.message)
  }
}

// Traces
function addTrace(trace) {
  const store = readStore()
  store.traces.unshift(trace)
  // Keep last 500 traces only
  if (store.traces.length > 500) store.traces = store.traces.slice(0, 500)
  writeStore(store)
}

function getTraces(address) {
  const store = readStore()
  if (address) {
    return store.traces.filter(t => t.wallet_address === address)
  }
  return store.traces
}

function getStats() {
  const store = readStore()
  const traces = store.traces
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
}

// Balances
function getBalance(address) {
  const store = readStore()
  return store.balances[address] !== undefined ? store.balances[address] : 1000
}

function setBalance(address, balance) {
  const store = readStore()
  store.balances[address] = balance
  writeStore(store)
}

// Wallets
function getWallet(email) {
  const store = readStore()
  return store.wallets[email.toLowerCase()] || null
}

function setWallet(email, walletData) {
  const store = readStore()
  store.wallets[email.toLowerCase()] = walletData
  writeStore(store)
}

module.exports = {
  addTrace,
  getTraces,
  getStats,
  getBalance,
  setBalance,
  getWallet,
  setWallet
}
