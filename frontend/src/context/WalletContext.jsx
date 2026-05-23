import { createContext, useContext, useState, useEffect } from 'react'
import { connectWalletAPI } from '../api.js'

const WalletContext = createContext(null)

export function WalletProvider({ children }) {
  const [wallet, setWallet] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Persist wallet across page refreshes
  useEffect(() => {
    const saved = localStorage.getItem('pythia_wallet')
    if (saved) {
      try {
        setWallet(JSON.parse(saved))
      } catch {}
    }
  }, [])

  async function connect(email) {
    setLoading(true)
    setError(null)
    try {
      const data = await connectWalletAPI(email)
      setWallet(data.wallet)
      localStorage.setItem('pythia_wallet', JSON.stringify(data.wallet))
      return data.wallet
    } catch (err) {
      setError(err.response?.data?.error || 'Connection failed')
      throw err
    } finally {
      setLoading(false)
    }
  }

  function disconnect() {
    setWallet(null)
    localStorage.removeItem('pythia_wallet')
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