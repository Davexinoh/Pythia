import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const api = axios.create({ baseURL: BASE, timeout: 60000 })

export async function connectWalletAPI(email) {
  const res = await api.post('/api/wallet/connect', { email })
  return res.data
}

export async function getWalletData(address) {
  const res = await api.get('/api/wallet/' + address)
  return res.data
}

export async function getWalletBalance(address) {
  const res = await api.get('/api/wallet/' + address + '/balance')
  return res.data
}

export async function getMarkets() {
  const res = await api.get('/api/markets')
  return res.data
}

export async function getTraces(address) {
  const res = await api.get('/api/traces', {
    params: address ? { address } : {}
  })
  return res.data
}

export async function getStats(address) {
  const res = await api.get('/api/stats', {
    params: address ? { address } : {}
  })
  return res.data
}

export async function runAgent(address) {
  const res = await api.post('/api/run', { address })
  return res.data
}

export async function getRunStatus(address) {
  const res = await api.get('/api/run/status', {
    params: { address }
  })
  return res.data
}

export async function getPositions(address) {
  const res = await api.get('/api/positions/' + address)
  return res.data
}

export async function sellPosition(address, market_id) {
  const res = await api.post('/api/positions/sell', { address, market_id })
  return res.data
}

export async function getHealth() {
  const res = await api.get('/api/health')
  return res.data
}
