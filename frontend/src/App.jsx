import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { WalletProvider, useWallet } from './context/WalletContext'
import Markets from './pages/Markets'
import TraceLog from './pages/TraceLog'
import Portfolio from './pages/Portfolio'
import Landing from './pages/Landing'
import { runAgent, getWalletData } from './api.js'

function BottomNav() {
  const location = useLocation()

  const tabs = [
    { to: '/', icon: '⊞', label: 'Markets' },
    { to: '/traces', icon: '≡', label: 'Traces' },
    { to: '/portfolio', icon: '◈', label: 'Portfolio' },
  ]

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'rgba(13,13,13,0.95)', backdropFilter: 'blur(20px)',
      borderTop: '1px solid var(--border)',
      display: 'flex', padding: '8px 0 20px',
      zIndex: 50
    }}>
      {tabs.map(({ to, icon, label }) => {
        const active = to === '/'
          ? location.pathname === '/'
          : location.pathname.startsWith(to)
        return (
          <NavLink key={to} to={to} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 4, textDecoration: 'none',
            padding: '6px 0'
          }}>
            <span style={{
              fontSize: 20,
              opacity: active ? 1 : 0.4,
              filter: active ? 'none' : 'grayscale(1)'
            }}>{icon}</span>
            <span style={{
              fontSize: 10, fontWeight: 500,
              color: active ? 'var(--blue)' : 'var(--text-muted)'
            }}>{label}</span>
          </NavLink>
        )
      })}
    </div>
  )
}

function Dashboard() {
  const { wallet, updateBalance } = useWallet()
  const [running, setRunning] = useState(false)
  const navigate = useNavigate()

  async function handleRun() {
    setRunning(true)
    try {
      await runAgent(wallet?.address)
      if (wallet?.address) {
        const data = await getWalletData(wallet.address)
        if (data.onchain) updateBalance(data.onchain.virtualBalance)
      }
      navigate('/traces')
    } catch (err) {
      console.error('Run failed:', err)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <header style={{
        padding: '14px 16px',
        background: 'rgba(13,13,13,0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexShrink: 0,
        position: 'sticky', top: 0, zIndex: 40
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #0070f3, #00c73c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 800, color: '#fff'
          }}>P</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>Pythia</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1, marginTop: 2 }}>
              ${wallet?.virtualBalance?.toFixed(0) || '1000'} USDC
            </div>
          </div>
        </div>

        {/* Run button */}
        <button
          onClick={handleRun}
          disabled={running}
          style={{
            padding: '9px 18px', borderRadius: 10, border: 'none',
            background: running ? 'var(--bg3)' : 'var(--blue)',
            color: running ? 'var(--text-muted)' : '#fff',
            fontSize: 13, fontWeight: 600,
            cursor: running ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'all 0.15s'
          }}
        >
          {running ? (
            <>
              <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
              Running...
            </>
          ) : (
            <>▶ Run Agent</>
          )}
        </button>
      </header>

      {/* Page content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Routes>
          <Route path="/" element={<Markets onRun={handleRun} running={running} />} />
          <Route path="/traces" element={<TraceLog />} />
          <Route path="/portfolio" element={<Portfolio />} />
        </Routes>
      </div>

      {/* Bottom nav */}
      <BottomNav />
    </div>
  )
}

function AppContent() {
  const { wallet } = useWallet()
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (wallet) setConnected(true)
  }, [wallet])

  if (!connected && !wallet) {
    return <Landing onConnected={() => setConnected(true)} />
  }

  return <Dashboard />
}

export default function App() {
  return (
    <WalletProvider>
      <AppContent />
    </WalletProvider>
  )
}
