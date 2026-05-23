import { useState, useEffect } from 'react'
import { getStats, getTraces } from '../api.js'

function StatCard({ label, value, sub, color, delay }) {
  return (
    <div className={`fade-up-${delay}`} style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '20px 24px'
    }}>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
        color: 'var(--text-muted)', letterSpacing: 1.5,
        textTransform: 'uppercase', marginBottom: 10
      }}>{label}</div>
      <div style={{
        fontSize: 32, fontWeight: 800, letterSpacing: -1,
        color: color || 'var(--text)', lineHeight: 1
      }}>{value}</div>
      {sub && (
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
          color: 'var(--text-dim)', marginTop: 8
        }}>{sub}</div>
      )}
    </div>
  )
}

export default function Portfolio() {
  const [stats, setStats] = useState(null)
  const [traces, setTraces] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [s, t] = await Promise.all([getStats(), getTraces()])
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
  const totalUsdc = executed.reduce((sum, t) => sum + (t.decision?.bet_size_usdc || 0), 0)
  const skipReasons = stats?.skipReasons || {}

  return (
    <div style={{ padding: 28, overflowY: 'auto', height: '100%' }}>

      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
        color: 'var(--text-muted)', letterSpacing: 2,
        textTransform: 'uppercase', marginBottom: 20
      }}>Portfolio Overview</div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 110, borderRadius: 12 }} />
          ))}
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12, marginBottom: 28
          }}>
            <StatCard label="Markets Watched" value={stats?.total || 0} sub="this session" color="var(--cyan)" delay={1} />
            <StatCard label="Executed" value={stats?.executed || 0} sub={`$${totalUsdc.toFixed(2)} USDC`} color="var(--green)" delay={2} />
            <StatCard label="Skipped" value={stats?.skipped || 0} sub="edge below threshold" color="var(--amber)" delay={3} />
            <StatCard label="Invalidated" value={stats?.invalidated || 0} sub="signal failures" color="var(--red)" delay={4} />
          </div>

          {/* Executed positions */}
          {executed.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                color: 'var(--text-muted)', letterSpacing: 2,
                textTransform: 'uppercase', marginBottom: 14,
                display: 'flex', alignItems: 'center', gap: 10
              }}>
                Executed Positions
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>

              <div style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 12, overflow: 'hidden'
              }}>
                {/* Table header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 80px 80px 80px 100px',
                  padding: '10px 16px',
                  borderBottom: '1px solid var(--border)',
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
                  color: 'var(--text-dim)', letterSpacing: 1,
                  textTransform: 'uppercase'
                }}>
                  <span>Market</span>
                  <span>Direction</span>
                  <span>Edge</span>
                  <span>Size</span>
                  <span>Status</span>
                </div>

                {executed.map((t, i) => {
                  const md = t.market_data || {}
                  const dec = t.decision || {}
                  return (
                    <div key={t.execution_id} style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 80px 80px 80px 100px',
                      padding: '12px 16px',
                      borderBottom: i < executed.length - 1 ? '1px solid var(--border)' : 'none',
                      alignItems: 'center', transition: 'background 0.15s'
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ fontSize: 12, fontWeight: 600, paddingRight: 16, lineHeight: 1.3 }}>
                        {t.question?.slice(0, 55)}{t.question?.length > 55 ? '...' : ''}
                      </div>
                      <div style={{
                        fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700,
                        color: md.direction === 'YES' ? 'var(--green)' : 'var(--red)'
                      }}>
                        {md.direction || '—'}
                      </div>
                      <div style={{
                        fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                        color: md.edge >= 0 ? 'var(--green)' : 'var(--red)'
                      }}>
                        {md.edge ? `${md.edge >= 0 ? '+' : ''}${(md.edge * 100).toFixed(1)}%` : '—'}
                      </div>
                      <div style={{
                        fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                        color: 'var(--text)'
                      }}>
                        {dec.bet_size_usdc ? `$${dec.bet_size_usdc}` : '—'}
                      </div>
                      <div>
                        <span style={{
                          padding: '2px 8px', borderRadius: 20,
                          fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 600,
                          background: 'var(--green-glow)', color: 'var(--green)',
                          border: '1px solid rgba(52,211,153,0.2)'
                        }}>{t.status}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Skip reasons breakdown */}
          {Object.keys(skipReasons).length > 0 && (
            <div>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                color: 'var(--text-muted)', letterSpacing: 2,
                textTransform: 'uppercase', marginBottom: 14,
                display: 'flex', alignItems: 'center', gap: 10
              }}>
                Skip Reasons
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>
              <div style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 12, overflow: 'hidden'
              }}>
                {Object.entries(skipReasons).map(([reason, count], i, arr) => (
                  <div key={reason} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none'
                  }}>
                    <span style={{
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                      color: 'var(--amber)'
                    }}>{reason}</span>
                    <span style={{
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 13,
                      fontWeight: 700, color: 'var(--text)'
                    }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {executed.length === 0 && (
            <div style={{
              textAlign: 'center', padding: 60,
              color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>◈</div>
              No positions yet. Run the agent to start.
            </div>
          )}
        </>
      )}
    </div>
  )
}