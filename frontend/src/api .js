import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const api = axios.create({ baseURL: BASE, timeout: 60000 })

export async function getMarkets() {
  const res = await api.get('/api/markets')
  return res.data
}

export async function getTraces() {
  const res = await api.get('/api/traces')
  return res.data
}

export async function getStats() {
  const res = await api.get('/api/stats')
  return res.data
}

export async function runAgent() {
  const res = await api.post('/api/run')
  return res.data
}

export async function getHealth() {
  const res = await api.get('/api/health')
  return res.data
}