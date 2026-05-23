import { useState, useEffect } from 'react'
import { getStats, getTraces } from '../api.js'
import { useWallet } from '../context/WalletContext'

export default function Portfolio() {
  const { wallet, disconnect } = useWallet()
  const [stats, setStats] = useState(null)
  const [traces, setTraces] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [s, t] = await Promise.all([getStats(), getTraces(wallet?.address)])
        setStats(s)
        setTraces(t.traces || [])
      } catch {} finally {
        setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [])

  const executed = traces.filter(t => t.status === 'SIMULATED' || t.status === 'EXECUTED')
  const totalBet = executed.reduce((sum, t) => sum + (t.decision?.bet_size_usdc || 0), 0)

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 16px 80px' }}>

      {/* Wallet card */}
      <div style={{
        background: 'linear-gradient(135deg, #0070f3, #00c73c)',
        borderRadius: 20, padding: '24px', marginBottom: 20
      }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Your Balance
        </div>
        <div style={{ fontSize: 36, fontWeight: 800, color: '#fff', letterSpacing: -1 }}>
          ${wallet?.virtualBalance?.toFixed(2) || '1000.00'}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
          Virtual USDC · Arc Testnet
        </div>
        <div style={{
          marginTop: 16, paddingTop: 16,
          borderTop: '1px solid rgba(255,255,255,0.2)',
          fontSize: 12, color: 'rgba(255,255,255,0.7)'
        }}>
          {wallet?.email} · {wallet?.address?.slice(0, 6)}...{wallet?.address?.slice(-4)}
        </div>
      </div>

      {/* Stats grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 8, marginBottom: 20
      }}>
        {[
          { label: 'Markets Analyzed', value: stats?.total || 0, color: '#fff' },
          { label: 'Executed', value: stats?.executed || 0, color: 'var(--green)' },
          { label: 'Skipped', value: stats?.skipped || 0, color: 'var(--amber)' },
          { label: 'Total Deployed', value: `$${totalBet.toFixed(0)}`, color: 'var(--blue)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            padding: '16px', background: 'var(--bg2)',
            borderRadius: 16, border: '1px solid var(--border)'
          }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Positions */}
      {executed.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
            Recent Positions
          </div>
          {executed.slice(0, 10).map((t, i) => {
            const md = t.market_data || {}
            const dec = t.decision || {}
            return (
              <div key={t.execution_id} style={{
                padding: '14px 16px', background: 'var(--bg2)',
                borderRadius: 14, marginBottom: 8,
                border: '1px solid var(--border)'
              }}>
                <div style={{
                  fontSize: 13, fontWeight: 600, marginBottom: 8,
                  lineHeight: 1.3
                }}>
                  {t.question?.slice(0, 60)}{t.question?.length > 60 ? '...' : ''}
                </div>
                <div style={{
                  display: 'flex', gap: 8, alignItems: 'center',
                  flexWrap: 'wrap'
                }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 20,
                    background: t.status === 'SIMULATED' ? 'var(--green-bg)' : 'var(--red-bg)',
                    color: t.status === 'SIMULATED' ? 'var(--green)' : 'var(--red)',
                    fontSize: 11, fontWeight: 600
                  }}>{t.status}</span>
                  {md.direction && (
                    <span style={{
                      padding: '3px 10px', borderRadius: 20,
                      background: md.direction === 'YES' ? 'var(--green-bg)' : 'var(--red-bg)',
                      color: md.direction === 'YES' ? 'var(--green)' : 'var(--red)',
                      fontSize: 11, fontWeight: 600
                    }}>BUY {md.direction}</span>
                  )}
                  {dec.bet_size_usdc > 0 && (
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                      ${dec.bet_size_usdc}
                    </span>
                  )}
                  {md.edge && (
                    <span style={{
                      fontSize: 12, color: md.edge >= 0 ? 'var(--green)' : 'var(--red)'
                    }}>
                      {md.edge >= 0 ? '+' : ''}{(md.edge * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Disconnect */}
      <button
        onClick={disconnect}
        style={{
          width: '100%', padding: '14px',
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 14, color: 'var(--red)',
          fontSize: 14, fontWeight: 600, cursor: 'pointer'
        }}
      >
        Disconnect Wallet
      </button>
    </div>
  )
}
