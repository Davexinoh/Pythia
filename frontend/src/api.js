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

export async function getStats() {
  const res = await api.get('/api/stats')
  return res.data
}

export async function runAgent(address) {
  const res = await api.post('/api/run', { address })
  return res.data
}

export async function getHealth() {
  const res = await api.get('/api/health')
  return res.data
}