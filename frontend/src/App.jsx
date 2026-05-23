import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { WalletProvider, useWallet } from './context/WalletContext'
import Markets from './pages/Markets'
import TraceLog from './pages/TraceLog'
import Portfolio from './pages/Portfolio'
import Landing from './pages/Landing'
import { getStats, runAgent, getWalletData } from './api.js'

function Dashboard() {
  const { wallet, disconnect, updateBalance } = useWallet()
  const [stats, setStats] = useState(null)
  const [running, setRunning] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 15000)
    return () => clearInterval(interval)
  }, [])

  async function fetchStats() {
    try {
      const data = await getStats()
      setStats(data)
    } catch {}
  }

  async function handleRun() {
    setRunning(true)
    try {
      await runAgent(wallet?.address)
      await fetchStats()
      // Refresh wallet balance
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
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', position: 'relative' }}>

      {/* Grid background */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(99,179,237,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(99,179,237,0.025) 1px, transparent 1px)',
        backgroundSize: '44px 44px'
      }} />

      {/* Glow */}
      <div style={{
        position: 'fixed', top: -300, right: -300, width: 700, height: 700,
        background: 'radial-gradient(circle, rgba(99,179,237,0.05) 0%, transparent 65%)',
        pointerEvents: 'none', zIndex: 0
      }} />

      {/* Sidebar */}
      <aside style={{
        width: 220, background: 'var(--bg2)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        padding: '28px 0', flexShrink: 0, position: 'relative', zIndex: 2
      }}>

        {/* Logo */}
        <div style={{ padding: '0 24px 28px', borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', color: '#fff' }}>
            Pyth<span style={{ color: 'var(--cyan)' }}>ia</span>
          </div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
            color: 'var(--text-muted)', letterSpacing: '2px',
            textTransform: 'uppercase', marginTop: 4
          }}>Prediction Oracle</div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            { to: '/', label: 'Markets', icon: '▦' },
            { to: '/traces', label: 'Trace Log', icon: '≡' },
            { to: '/portfolio', label: 'Portfolio', icon: '◈' },
          ].map(({ to, label, icon }) => (
            <NavLink key={to} to={to} end={to === '/'} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 8,
              fontSize: 13, fontWeight: 500, textDecoration: 'none',
              transition: 'all 0.15s',
              color: isActive ? 'var(--cyan)' : 'var(--text-muted)',
              background: isActive ? 'var(--cyan-glow)' : 'transparent',
              border: isActive ? '1px solid var(--border-accent)' : '1px solid transparent',
            })}>
              <span style={{ fontSize: 14, opacity: 0.9 }}>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div style={{ marginTop: 'auto', padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* Wallet info */}
          {wallet && (
            <div style={{
              padding: '12px', background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border)', borderRadius: 8
            }}>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
                color: 'var(--text-muted)', letterSpacing: 1,
                textTransform: 'uppercase', marginBottom: 8
              }}>Your Wallet</div>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                color: 'var(--text)', marginBottom: 4,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {wallet.email}
              </div>
              <div style={{
                fontSize: 18, fontWeight: 800, color: 'var(--green)',
                letterSpacing: -0.5
              }}>
                ${wallet.virtualBalance?.toFixed(2)}
              </div>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
                color: 'var(--text-dim)', marginTop: 2
              }}>virtual USDC</div>
            </div>
          )}

          {/* Stats */}
          {stats && (
            <div style={{
              padding: '10px 12px', background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border)', borderRadius: 8,
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
              color: 'var(--text-muted)', lineHeight: 1.8
            }}>
              <div>executed <span style={{ color: 'var(--green)', float: 'right' }}>{stats.executed}</span></div>
              <div>skipped <span style={{ color: 'var(--amber)', float: 'right' }}>{stats.skipped}</span></div>
              <div>total <span style={{ color: 'var(--text)', float: 'right' }}>{stats.total}</span></div>
            </div>
          )}

          {/* Disconnect */}
          <button onClick={disconnect} style={{
            padding: '8px 12px', background: 'transparent',
            border: '1px solid var(--border)', borderRadius: 8,
            color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10, cursor: 'pointer', textAlign: 'left',
            transition: 'all 0.15s'
          }}
            onMouseEnter={e => { e.target.style.color = 'var(--red)'; e.target.style.borderColor = 'rgba(248,113,113,0.3)' }}
            onMouseLeave={e => { e.target.style.color = 'var(--text-muted)'; e.target.style.borderColor = 'var(--border)' }}
          >
            ⊗ Disconnect
          </button>

          {/* Arc testnet badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 12px', background: 'var(--green-glow)',
            border: '1px solid rgba(52,211,153,0.2)', borderRadius: 8,
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--green)'
          }}>
            <div style={{ width: 6, height: 6, background: 'var(--green)', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
            ARC TESTNET
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <header style={{
          padding: '16px 28px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(8,12,20,0.85)', backdropFilter: 'blur(12px)',
          flexShrink: 0
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Pythia Agent</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
              {wallet ? `${wallet.address?.slice(0, 6)}...${wallet.address?.slice(-4)}` : 'Prediction Market Oracle'} · Circle Wallets · Arc
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {wallet?.isNew && (
              <span style={{
                padding: '4px 10px', background: 'var(--green-glow)',
                border: '1px solid rgba(52,211,153,0.2)', borderRadius: 6,
                fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
                color: 'var(--green)', letterSpacing: 1
              }}>✦ NEW · $1,000 USDC</span>
            )}
            <button onClick={handleRun} disabled={running} style={{
              padding: '8px 18px', borderRadius: 8, border: 'none',
              background: running ? 'var(--text-dim)' : 'var(--cyan)',
              color: running ? 'var(--text-muted)' : '#080c14',
              fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700,
              cursor: running ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
              letterSpacing: 0.3
            }}>
              {running ? '⟳ Running...' : '▶ Run Agent'}
            </button>
          </div>
        </header>

        {/* Page content */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Routes>
            <Route path="/" element={<Markets onRun={handleRun} running={running} />} />
            <Route path="/traces" element={<TraceLog />} />
            <Route path="/portfolio" element={<Portfolio />} />
          </Routes>
        </div>
      </main>
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