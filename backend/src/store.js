const store = {
  traces: [],
  balances: {},
  wallets: {},
  positions: []
}

async function addTrace(trace) {
  store.traces.unshift(trace)
  if (store.traces.length > 500) store.traces = store.traces.slice(0, 500)
}

async function getTraces(address) {
  if (address) return store.traces.filter(t => t.wallet_address === address)
  return store.traces
}

async function getStats(address) {
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
}

async function getBalance(address) {
  return store.balances[address] !== undefined ? store.balances[address] : 1000
}

async function setBalance(address, balance) {
  store.balances[address] = balance
}

async function getWallet(email) {
  return store.wallets[email.toLowerCase()] || null
}

async function setWallet(email, walletData) {
  store.wallets[email.toLowerCase()] = walletData
}

async function getOpenPositions(address) {
  return store.positions.filter(p => p.wallet_address === address && p.status === 'OPEN')
}

async function addPosition(position) {
  store.positions.push({ ...position, status: 'OPEN', createdAt: new Date().toISOString() })
}

async function hasOpenPosition(address, market_id) {
  return store.positions.some(p => p.wallet_address === address && p.market_id === market_id && p.status === 'OPEN')
}

async function closePosition(address, market_id, exitPrice, pnl) {
  const position = store.positions.find(p => p.wallet_address === address && p.market_id === market_id && p.status === 'OPEN')
  if (!position) return null
  position.status = 'CLOSED'
  position.exit_price = exitPrice
  position.pnl = pnl
  position.closedAt = new Date().toISOString()
  const currentBalance = await getBalance(address)
  const newBalance = Math.max(0, currentBalance + position.bet_size_usdc + pnl)
  await setBalance(address, newBalance)
  return { position, newBalance, pnl }
}

async function getAllPositions(address) {
  return store.positions.filter(p => p.wallet_address === address).reverse()
}

module.exports = {
  addTrace, getTraces, getStats,
  getBalance, setBalance,
  getWallet, setWallet,
  getOpenPositions, addPosition, hasOpenPosition,
  closePosition, getAllPositions
}
