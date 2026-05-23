import { createContext, useContext, useState, useEffect } from 'react'
import { connectWalletAPI } from '../api.js'

const WalletContext = createContext(null)

export function WalletProvider({ children }) {
  const [wallet, setWallet] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('pythia_wallet')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && parsed.address) {
          setWallet(parsed)
        }
      }
    } catch {
      localStorage.removeItem('pythia_wallet')
    }
  }, [])

  async function connect(email) {
    setLoading(true)
    setError(null)
    try {
      const data = await connectWalletAPI(email)
      const w = data.wallet
      setWallet(w)
      localStorage.setItem('pythia_wallet', JSON.stringify(w))
      return w
    } catch (err) {
      const msg = err.response?.data?.error || 'Connection failed. Try again.'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }

  function disconnect() {
    setWallet(null)
    localStorage.removeItem('pythia_wallet')
    window.location.href = '/'
  }

  function updateBalance(newBalance) {
    if (!wallet) return
    const updated = { ...wallet, virtualBalance: newBalance }
    setWallet(updated)
    localStorage.setItem('pythia_wallet', JSON.stringify(updated))
  }

  return (
    <WalletContext.Provider value={{ wallet, loading, error, connect, disconnect, updateBalance }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  return useContext(WalletContext)
}
