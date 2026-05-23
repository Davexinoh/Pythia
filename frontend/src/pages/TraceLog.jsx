import { useState, useEffect } from 'react'
import { getTraces } from '../api.js'

function StatusBadge({ status }) {
  const config = {
    SIMULATED: { color: 'var(--green)', bg: 'var(--green-glow)', border: 'rgba(52,211,153,0.2)' },
    EXECUTED: { color: 'var(--green)', bg: 'var(--green-glow)', border: 'rgba(52,211,153,0.2)' },
    SKIPPED: { color: 'var(--amber)', bg: 'var(--amber-glow)', border: 'rgba(251,191,36,0.2)' },
    INVALIDATED: { color: 'var(--red)', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)' },
  }
  const c = config[status] || config.SKIPPED
  return (
    <span style={{
      padding: '2px 10px', borderRadius: 20,
      fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 600,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`
    }}>{status}</span>
  )
}

function SignalChip({ type }) {
  const colors = {
    regulatory: { color: 'var(--cyan)', bg: 'var(--cyan-glow)' },
    event_proximity: { color: 'var(--green)', bg: 'var(--green-glow)' },
    liquidity: { color: 'var(--purple)', bg: 'var(--purple-glow)' },
    media_amplification: { color: 'var(--amber)', bg: 'var(--amber-glow)' },
  }
  const c = colors[type] || colors.media_amplification
  return (
    <span style={{
      padding: '2px 7px', borderRadius: 4,
      fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 600,
      background: c.bg, color: c.color
    }}>{type?.replace('_', ' ')}</span>
  )
}

function TraceDetail({ trace }) {
  if (!trace) return (
    <div style={{
      height: '100%', display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexDirection: 'column', gap: 12,
      color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12
    }}>
      <div style={{ fontSize: 32 }}>≡</div>
      <div>Select a trace to inspect</div>
    </div>
  )

  const md = trace.market_data || {}
  const dec = trace.decision || {}

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
        color: 'var(--text-dim)', marginBottom: 12, letterSpacing: 1
      }}>
        {trace.execution_id}
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.5, marginBottom: 16 }}>
        {trace.question}
      </div>

      <StatusBadge status={trace.status} />

      {trace.reason && (
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
          color: 'var(--text-muted)', marginTop: 8
        }}>
          reason: {trace.reason}
        </div>
      )}

      {md.implied_probability && (
        <div style={{ marginTop: 16 }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
            color: 'var(--text-muted)', letterSpacing: 1.5,
            textTransform: 'uppercase', marginBottom: 10
          }}>Market Data</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { label: 'Implied Prob', value: `${(md.implied_probability * 100).toFixed(1)}%`, color: 'var(--text-muted)' },
              { label: 'Model Prob', value: md.model_probability ? `${(md.model_probability * 100).toFixed(1)}%` : 'N/A', color: 'var(--cyan)' },
              { label: 'Edge', value: md.edge ? `${md.edge >= 0 ? '+' : ''}${(md.edge * 100).toFixed(2)}%` : 'N/A', color: md.edge >= 0 ? 'var(--green)' : 'var(--red)' },
              { label: 'Direction', value: md.direction || 'N/A', color: 'var(--text)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                padding: '10px 12px', background: 'var(--bg2)',
                border: '1px solid var(--border)', borderRadius: 8
              }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {trace.signals?.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
            color: 'var(--text-muted)', letterSpacing: 1.5,
            textTransform: 'uppercase', marginBottom: 10
          }}>
            Signals · {trace.signals.length} extracted
          </div>
          {trace.signals.map((s, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 0', borderBottom: '1px solid var(--border)',
              flexWrap: 'wrap'
            }}>
              <SignalChip type={s.signal_type} />
              <span style={{
                padding: '2px 7px', borderRadius: 4,
                fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700,
                background: s.sentiment === 'YES' ? 'var(--green-glow)'
                  : s.sentiment === 'NO' ? 'rgba(248,113,113,0.08)'
                  : 'rgba(255,255,255,0.04)',
                color: s.sentiment === 'YES' ? 'var(--green)'
                  : s.sentiment === 'NO' ? 'var(--red)'
                  : 'var(--text-muted)'
              }}>{s.sentiment}</span>
              <span style={{
                fontSize: 11, color: 'var(--text-muted)', flex: 1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {s.article_title}
              </span>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
                color: 'var(--text-dim)', flexShrink: 0
              }}>
                {s.freshness_hours?.toFixed(0)}h
              </span>
            </div>
          ))}
        </div>
      )}

      {trace.risk_checks?.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
            color: 'var(--text-muted)', letterSpacing: 1.5,
            textTransform: 'uppercase', marginBottom: 10
          }}>Risk Checks</div>
          {trace.risk_checks.map((c, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 0', borderBottom: '1px solid var(--border)',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11
            }}>
              <span style={{ color: c.passed ? 'var(--green)' : 'var(--red)' }}>
                {c.passed ? '✓' : '✗'}
              </span>
              <span style={{ color: 'var(--text-muted)', flex: 1 }}>{c.check}</span>
              <span style={{ color: 'var(--text-dim)', fontSize: 9 }}>{c.reason}</span>
            </div>
          ))}
        </div>
      )}

      {dec.score !== null && dec.score !== undefined && (
        <div style={{
          marginTop: 16, padding: 14,
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8
        }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
            color: 'var(--text-muted)', letterSpacing: 1.5,
            textTransform: 'uppercase', marginBottom: 10
          }}>Decision Summary</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {[
              { label: 'Score', value: dec.score?.toFixed(4) },
              { label: 'Signals', value: dec.signal_count },
              { label: 'Threshold', value: dec.threshold },
              { label: 'Bet Size', value: dec.bet_size_usdc ? `$${dec.bet_size_usdc}` : 'N/A' },
            ].map(({ label, value }) => (
              <div key={label} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>
                <span style={{ color: 'var(--text-dim)' }}>{label}: </span>
                <span style={{ color: 'var(--text)' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function TraceLog() {
  const [traces, setTraces] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('ALL')
  const [showDetail, setShowDetail] = useState(false)

  useEffect(() => {
    fetchTraces()
    const interval = setInterval(fetchTraces, 10000)
    return () => clearInterval(interval)
  }, [])

  async function fetchTraces() {
    try {
      const data = await getTraces()
      setTraces(data.traces || [])
      if (!selected && data.traces?.length > 0) setSelected(data.traces[0])
    } catch {} finally {
      setLoading(false)
    }
  }

  const filters = ['ALL', 'SIMULATED', 'SKIPPED', 'INVALIDATED']
  const filtered = filter === 'ALL' ? traces : traces.filter(t => t.status === filter)

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{
        flex: 1, borderRight: '1px solid var(--border)',
        overflowY: 'auto', padding: 24
      }} className="trace-list">

        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '5px 12px', borderRadius: 6,
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 600,
              cursor: 'pointer', border: 'none', transition: 'all 0.15s',
              background: filter === f ? 'var(--cyan-glow)' : 'var(--bg2)',
              color: filter === f ? 'var(--cyan)' : 'var(--text-muted)',
              outline: filter === f ? '1px solid var(--border-accent)' : '1px solid var(--border)'
            }}>{f}</button>
          ))}
          <span style={{
            marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10, color: 'var(--text-dim)',
            display: 'flex', alignItems: 'center'
          }}>
            {filtered.length} records
          </span>
        </div>

        {loading && (
          <div style={{
            textAlign: 'center', padding: 40,
            color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12
          }}>
            Loading traces...
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{
            textAlign: 'center', padding: 40,
            color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12
          }}>
            No traces yet. Run the agent first.
          </div>
        )}

        {filtered.map((trace, i) => (
          <div
            key={trace.execution_id}
            onClick={() => { setSelected(trace); setShowDetail(true) }}
            className={`fade-up-${Math.min(i + 1, 4)}`}
            style={{
              background: selected?.execution_id === trace.execution_id ? 'var(--bg3)' : 'var(--bg2)',
              border: `1px solid ${selected?.execution_id === trace.execution_id ? 'var(--border-accent)' : 'var(--border)'}`,
              borderRadius: 10, padding: '14px 16px', marginBottom: 8,
              cursor: 'pointer', transition: 'all 0.15s'
            }}
          >
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'flex-start', marginBottom: 8
            }}>
              <div style={{
                fontSize: 12, fontWeight: 600, flex: 1,
                paddingRight: 10, lineHeight: 1.4
              }}>
                {trace.question}
              </div>
              <StatusBadge status={trace.status} />
            </div>
            <div style={{
              display: 'flex', gap: 12, flexWrap: 'wrap',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'var(--text-dim)'
            }}>
              <span>{new Date(trace.timestamp).toLocaleTimeString()}</span>
              {trace.market_data?.edge && (
                <span style={{ color: trace.market_data.edge >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  edge: {trace.market_data.edge >= 0 ? '+' : ''}{(trace.market_data.edge * 100).toFixed(2)}%
                </span>
              )}
              {trace.decision?.signal_count > 0 && (
                <span>{trace.decision.signal_count} signals</span>
              )}
              {trace.reason && <span style={{ color: 'var(--amber)' }}>{trace.reason}</span>}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        width: 400, flexShrink: 0,
        background: 'var(--bg)', overflow: 'hidden',
        display: 'flex', flexDirection: 'column'
      }}>
        <div style={{
          padding: '12px 16px', borderBottom: '1px solid var(--border)',
          display: 'none'
        }} className="mobile-back-trace">
          <button onClick={() => setShowDetail(false)} style={{
            background: 'transparent', border: 'none',
            color: 'var(--cyan)', fontFamily: 'JetBrains Mono, monospace',
            fontSize: 12, cursor: 'pointer'
          }}>← Back</button>
        </div>
        <TraceDetail trace={selected} />
      </div>

      <style>{`
        @media (max-width: 768px) {
          .trace-list { display: ${showDetail ? 'none' : 'block'} !important; width: 100% !important; border-right: none !important; }
          .mobile-back-trace { display: block !important; }
        }
      `}</style>
    </div>
  )
}