import { useState, useEffect } from 'react'
import { getTraces } from '../api.js'
import { useWallet } from '../context/WalletContext'

function StatusBadge({ status }) {
  const config = {
    SIMULATED: { color: '#00c73c', bg: 'rgba(0,199,60,0.15)' },
    EXECUTED: { color: '#00c73c', bg: 'rgba(0,199,60,0.15)' },
    SKIPPED: { color: '#f5a623', bg: 'rgba(245,166,35,0.15)' },
    INVALIDATED: { color: '#ff3d57', bg: 'rgba(255,61,87,0.15)' },
  }
  const c = config[status] || config.SKIPPED
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 600,
      background: c.bg, color: c.color
    }}>{status}</span>
  )
}

function TraceDetail({ trace, onBack }) {
  const md = trace.market_data || {}
  const dec = trace.decision || {}

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0d0d0d',
      zIndex: 200, overflowY: 'auto', paddingBottom: 80
    }}>
      <div style={{
        position: 'sticky', top: 0, background: '#0d0d0d',
        padding: '16px 20px', borderBottom: '1px solid #2a2a2a',
        display: 'flex', alignItems: 'center', gap: 12, zIndex: 1
      }}>
        <button onClick={onBack} style={{
          background: '#1a1a1a', border: 'none', borderRadius: 10,
          width: 36, height: 36, color: '#fff', fontSize: 18,
          cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center'
        }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Decision Trace</div>
      </div>

      <div style={{ padding: 20 }}>
        <div style={{
          fontSize: 11, color: '#8b8b8b', marginBottom: 10,
          fontFamily: 'monospace', wordBreak: 'break-all'
        }}>{trace.execution_id}</div>

        <div style={{
          fontSize: 17, fontWeight: 700, lineHeight: 1.4, marginBottom: 16
        }}>{trace.question}</div>

        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <StatusBadge status={trace.status} />
          {trace.reason && (
            <span style={{ fontSize: 12, color: '#8b8b8b' }}>
              {trace.reason}
            </span>
          )}
        </div>

        {md.implied_probability && md.model_probability && (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr auto 1fr',
            gap: 8, marginBottom: 16, alignItems: 'center'
          }}>
            <div style={{
              padding: '16px', background: '#1a1a1a',
              borderRadius: 12, textAlign: 'center',
              border: '1px solid #2a2a2a'
            }}>
              <div style={{ fontSize: 11, color: '#8b8b8b', marginBottom: 6 }}>MARKET</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#8b8b8b' }}>
                {Math.round(md.implied_probability * 100)}%
              </div>
            </div>
            <div style={{ color: '#0070f3', fontSize: 20, fontWeight: 800, textAlign: 'center' }}>→</div>
            <div style={{
              padding: '16px', background: 'rgba(0,112,243,0.1)',
              borderRadius: 12, textAlign: 'center',
              border: '1px solid #0070f3'
            }}>
              <div style={{ fontSize: 11, color: '#0070f3', marginBottom: 6 }}>PYTHIA</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#0070f3' }}>
                {Math.round(md.model_probability * 100)}%
              </div>
            </div>
          </div>
        )}

        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 8, marginBottom: 16
        }}>
          {[
            { label: 'Edge', value: md.edge ? `${md.edge >= 0 ? '+' : ''}${(md.edge * 100).toFixed(2)}%` : 'N/A', color: md.edge >= 0 ? '#00c73c' : '#ff3d57' },
            { label: 'Direction', value: md.direction || 'N/A', color: '#fff' },
            { label: 'Score', value: dec.score?.toFixed(4) || 'N/A', color: '#fff' },
            { label: 'Signals', value: dec.signal_count || 0, color: '#fff' },
            { label: 'Threshold', value: dec.threshold || 'N/A', color: '#fff' },
            { label: 'Bet Size', value: dec.bet_size_usdc ? `$${dec.bet_size_usdc}` : 'N/A', color: '#00c73c' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              padding: '12px', background: '#1a1a1a',
              borderRadius: 12, border: '1px solid #2a2a2a'
            }}>
              <div style={{ fontSize: 11, color: '#8b8b8b', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color }}>{value}</div>
            </div>
          ))}
        </div>

        {trace.signals?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 12, fontWeight: 600, color: '#8b8b8b',
              textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10
            }}>Signals · {trace.signals.length} extracted</div>
            {trace.signals.map((s, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 0', borderBottom: '1px solid #2a2a2a',
                flexWrap: 'wrap'
              }}>
                <span style={{
                  padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                  background: 'rgba(0,112,243,0.15)', color: '#0070f3'
                }}>{s.signal_type?.replace('_', ' ')}</span>
                <span style={{
                  padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                  background: s.sentiment === 'YES' ? 'rgba(0,199,60,0.15)'
                    : s.sentiment === 'NO' ? 'rgba(255,61,87,0.15)'
                    : 'rgba(255,255,255,0.05)',
                  color: s.sentiment === 'YES' ? '#00c73c'
                    : s.sentiment === 'NO' ? '#ff3d57'
                    : '#8b8b8b'
                }}>{s.sentiment}</span>
                <span style={{
                  fontSize: 12, color: '#8b8b8b', flex: 1,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>{s.article_title}</span>
                <span style={{ fontSize: 11, color: '#444' }}>
                  {s.freshness_hours?.toFixed(0)}h
                </span>
              </div>
            ))}
          </div>
        )}

        {trace.risk_checks?.length > 0 && (
          <div>
            <div style={{
              fontSize: 12, fontWeight: 600, color: '#8b8b8b',
              textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10
            }}>Risk Checks</div>
            {trace.risk_checks.map((c, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 0', borderBottom: '1px solid #2a2a2a', fontSize: 13
              }}>
                <span style={{ color: c.passed ? '#00c73c' : '#ff3d57', fontSize: 16 }}>
                  {c.passed ? '✓' : '✗'}
                </span>
                <span style={{ color: '#8b8b8b', flex: 1 }}>{c.check}</span>
                <span style={{ color: '#444', fontSize: 11 }}>{c.reason}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function TraceLog() {
  const { wallet } = useWallet()
  const [traces, setTraces] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('ALL')

  useEffect(() => {
    fetchTraces()
    const interval = setInterval(fetchTraces, 10000)
    return () => clearInterval(interval)
  }, [])

  async function fetchTraces() {
    try {
      const data = await getTraces(wallet?.address)
      setTraces(data.traces || [])
    } catch {} finally {
      setLoading(false)
    }
  }

  const filters = ['ALL', 'SIMULATED', 'SKIPPED', 'INVALIDATED']
  const filtered = filter === 'ALL' ? traces : traces.filter(t => t.status === filter)

  return (
    <div style={{ height: '100%', overflowY: 'auto', paddingBottom: 80 }}>

      {selected && (
        <TraceDetail trace={selected} onBack={() => setSelected(null)} />
      )}

      <div style={{
        display: 'flex', gap: 8, padding: '14px 16px',
        overflowX: 'auto', scrollbarWidth: 'none',
        borderBottom: '1px solid #2a2a2a', position: 'sticky',
        top: 0, background: '#0d0d0d', zIndex: 10
      }}>
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '7px 14px', borderRadius: 20, border: 'none',
            background: filter === f ? '#0070f3' : '#1a1a1a',
            color: filter === f ? '#fff' : '#8b8b8b',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
            whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.15s'
          }}>{f}</button>
        ))}
        <span style={{
          marginLeft: 'auto', fontSize: 12, color: '#8b8b8b',
          display: 'flex', alignItems: 'center', flexShrink: 0
        }}>
          {filtered.length} records
        </span>
      </div>

      <div style={{ padding: '12px 16px' }}>
        {loading && (
          <div style={{
            textAlign: 'center', padding: 40,
            color: '#8b8b8b', fontSize: 14
          }}>Loading traces...</div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{
            textAlign: 'center', padding: 60,
            color: '#8b8b8b', fontSize: 14
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>≡</div>
            No traces yet. Run the agent first.
          </div>
        )}

        {filtered.map((trace, i) => (
          <div
            key={trace.execution_id}
            onClick={() => setSelected(trace)}
            style={{
              background: '#1a1a1a', border: '1px solid #2a2a2a',
              borderRadius: 14, padding: '14px 16px',
              marginBottom: 8, cursor: 'pointer', transition: 'all 0.15s'
            }}
            onTouchStart={e => e.currentTarget.style.background = '#242424'}
            onTouchEnd={e => e.currentTarget.style.background = '#1a1a1a'}
          >
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'flex-start', marginBottom: 8, gap: 10
            }}>
              <div style={{
                fontSize: 13, fontWeight: 600, flex: 1,
                lineHeight: 1.4, paddingRight: 8, color: '#fff'
              }}>{trace.question}</div>
              <StatusBadge status={trace.status} />
            </div>
            <div style={{
              display: 'flex', gap: 10, flexWrap: 'wrap',
              fontSize: 11, color: '#8b8b8b'
            }}>
              <span>{new Date(trace.timestamp).toLocaleTimeString()}</span>
              {trace.market_data?.edge && (
                <span style={{
                  color: trace.market_data.edge >= 0 ? '#00c73c' : '#ff3d57'
                }}>
                  edge: {trace.market_data.edge >= 0 ? '+' : ''}{(trace.market_data.edge * 100).toFixed(1)}%
                </span>
              )}
              {trace.decision?.signal_count > 0 && (
                <span>{trace.decision.signal_count} signals</span>
              )}
              {trace.reason && (
                <span style={{ color: '#f5a623' }}>{trace.reason}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
