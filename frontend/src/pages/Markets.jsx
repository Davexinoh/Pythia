import { useState, useEffect } from 'react'
import { getMarkets } from '../api.js'

const STATUS_COLOR = {
  execute: 'var(--green)',
  skip: 'var(--amber)',
  watching: 'var(--text-dim)'
}

function ProbBar({ market, model }) {
  return (
    <div style={{ margin: '12px 0' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
        marginBottom: 8
      }}>
        <span style={{ color: 'var(--text-muted)' }}>Probability</span>
        <span>
          <span style={{ color: 'var(--text-muted)' }}>MKT {(market * 100).toFixed(1)}%</span>
          <span style={{ color: 'var(--text-dim)' }}> → </span>
          <span style={{ color: model ? 'var(--cyan)' : 'var(--text-dim)', fontWeight: 600 }}>
            {model ? `MODEL ${(model * 100).toFixed(1)}%` : 'PENDING'}
          </span>
        </span>
      </div>
      <div style={{
        height: 6, background: 'rgba(255,255,255,0.05)',
        borderRadius: 3, position: 'relative'
      }}>
        {/* Market marker */}
        <div style={{
          position: 'absolute', top: -4, left: `${market * 100}%`,
          width: 14, height: 14, borderRadius: '50%',
          background: 'var(--text-dim)',
          border: '2px solid var(--bg2)',
          transform: 'translateX(-50%)',
          transition: 'left 0.5s ease'
        }} />
        {/* Model marker */}
        {model && (
          <div style={{
            position: 'absolute', top: -4, left: `${model * 100}%`,
            width: 14, height: 14, borderRadius: '50%',
            background: 'var(--cyan)',
            border: '2px solid var(--bg2)',
            transform: 'translateX(-50%)',
            boxShadow: '0 0 10px rgba(99,179,237,0.5)',
            transition: 'left 0.5s ease'
          }} />
        )}
      </div>
    </div>
  )
}

function MarketCard({ market, index, selected, onClick }) {
  const hasEdge = market.model_probability !== null && market.model_probability !== undefined
  const edge = hasEdge ? market.model_probability - market.implied_probability : null
  const status = !hasEdge ? 'watching' : Math.abs(edge) >= 0.06 ? 'execute' : 'skip'
  const accentColor = STATUS_COLOR[status]

  return (
    <div
      onClick={() => onClick(market)}
      className={`fade-up-${Math.min(index + 1, 4)}`}
      style={{
        background: selected ? 'var(--bg3)' : 'var(--bg2)',
        border: `1px solid ${selected ? 'var(--border-accent)' : 'var(--border)'}`,
        borderRadius: 12, padding: '16px 18px',
        marginBottom: 8, cursor: 'pointer',
        transition: 'all 0.2s',
        position: 'relative', overflow: 'hidden',
        boxShadow: selected && status === 'execute'
          ? 'inset 0 0 30px var(--green-glow)'
          : 'none'
      }}
    >
      {/* Left accent bar */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: 3, background: accentColor, borderRadius: '12px 0 0 12px'
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4, flex: 1 }}>
          {market.question}
        </div>
        <div style={{
          padding: '3px 10px', borderRadius: 20, flexShrink: 0,
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 600,
          background: status === 'execute' ? 'var(--green-glow)'
            : status === 'skip' ? 'var(--amber-glow)'
            : 'rgba(255,255,255,0.03)',
          color: accentColor,
          border: `1px solid ${status === 'execute' ? 'rgba(52,211,153,0.2)'
            : status === 'skip' ? 'rgba(251,191,36,0.2)'
            : 'var(--border)'}`
        }}>
          {status.toUpperCase()}
        </div>
      </div>

      <ProbBar
        market={market.implied_probability}
        model={market.model_probability}
      />

      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text-muted)'
      }}>
        {edge !== null && (
          <>
            <span style={{ color: status === 'execute' ? 'var(--green)' : 'var(--text-muted)' }}>
              {market.direction ? `↑ BUY ${market.direction}` : ''}
            </span>
            {market.bet_size_usdc > 0 && (
              <span style={{ color: 'var(--green)' }}>
                ${market.bet_size_usdc} USDC
              </span>
            )}
            <span style={{
              padding: '2px 8px', borderRadius: 4,
              background: edge >= 0 ? 'var(--green-glow)' : 'rgba(248,113,113,0.08)',
              color: edge >= 0 ? 'var(--green)' : 'var(--red)',
              fontWeight: 600
            }}>
              {edge >= 0 ? '+' : ''}{(edge * 100).toFixed(1)}% edge
            </span>
          </>
        )}
        {!edge && <span>Awaiting signals</span>}
        <span>{market.days_to_close?.toFixed(0)}d remaining</span>
        <span style={{ color: 'var(--text-dim)' }}>
          ${(market.liquidity / 1000).toFixed(0)}K liq
        </span>
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '16px 18px', marginBottom: 8
    }}>
      <div className="skeleton" style={{ height: 14, width: '70%', marginBottom: 12 }} />
      <div className="skeleton" style={{ height: 6, width: '100%', marginBottom: 12 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <div className="skeleton" style={{ height: 10, width: 60 }} />
        <div className="skeleton" style={{ height: 10, width: 80 }} />
      </div>
    </div>
  )
}

function TracePanel({ market }) {
  if (!market) return (
    <div style={{
      height: '100%', display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexDirection: 'column', gap: 12,
      color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12
    }}>
      <div style={{ fontSize: 32 }}>◈</div>
      <div>Select a market to view trace</div>
    </div>
  )

  const hasEdge = market.model_probability !== null && market.model_probability !== undefined
  const edge = hasEdge ? market.model_probability - market.implied_probability : null
  const status = !hasEdge ? 'WATCHING' : Math.abs(edge) >= 0.06 ? 'EXECUTE' : 'SKIP'

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
        color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 16,
        textTransform: 'uppercase'
      }}>Decision Trace</div>

      <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.5, marginBottom: 14 }}>
        {market.question}
      </div>

      {/* Verdict */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px', borderRadius: 10, marginBottom: 16,
        background: status === 'EXECUTE' ? 'var(--green-glow)'
          : status === 'SKIP' ? 'var(--amber-glow)'
          : 'rgba(255,255,255,0.03)',
        border: `1px solid ${status === 'EXECUTE' ? 'rgba(52,211,153,0.2)'
          : status === 'SKIP' ? 'rgba(251,191,36,0.15)'
          : 'var(--border)'}`
      }}>
        <span style={{ fontSize: 16 }}>
          {status === 'EXECUTE' ? '✦' : status === 'SKIP' ? '⊘' : '◌'}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600,
            color: status === 'EXECUTE' ? 'var(--green)'
              : status === 'SKIP' ? 'var(--amber)'
              : 'var(--text-muted)'
          }}>
            {status} {market.direction ? `· BUY ${market.direction}` : ''}
          </div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
            color: 'var(--text-dim)', marginTop: 2
          }}>
            {market.market_id}
          </div>
        </div>
        {market.bet_size_usdc > 0 && (
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 14,
            fontWeight: 700, color: 'var(--green)'
          }}>
            ${market.bet_size_usdc}
          </div>
        )}
      </div>

      {/* Prob comparison */}
      {hasEdge && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, marginBottom: 16, alignItems: 'center' }}>
          <div style={{
            padding: 12, background: 'var(--bg2)',
            border: '1px solid var(--border)', borderRadius: 8, textAlign: 'center'
          }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: 1 }}>MARKET</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: -1 }}>
              {(market.implied_probability * 100).toFixed(1)}%
            </div>
          </div>
          <div style={{ color: 'var(--green)', fontSize: 18, fontWeight: 800 }}>→</div>
          <div style={{
            padding: 12, background: 'var(--bg2)',
            border: '1px solid var(--border-accent)', borderRadius: 8, textAlign: 'center'
          }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'var(--cyan)', marginBottom: 6, letterSpacing: 1 }}>PYTHIA</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--cyan)', letterSpacing: -1 }}>
              {(market.model_probability * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* Edge metrics */}
      {edge !== null && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 8, marginBottom: 16
        }}>
          {[
            { label: 'Raw Edge', value: `${edge >= 0 ? '+' : ''}${(edge * 100).toFixed(2)}%`, color: edge >= 0 ? 'var(--green)' : 'var(--red)' },
            { label: 'Liquidity', value: `$${(market.liquidity / 1000).toFixed(0)}K`, color: 'var(--text)' },
            { label: 'Days Left', value: `${market.days_to_close?.toFixed(0)}d`, color: 'var(--text)' },
            { label: 'Category', value: market.category || 'unknown', color: 'var(--purple)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              padding: '10px 12px', background: 'var(--bg2)',
              border: '1px solid var(--border)', borderRadius: 8
            }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'var(--text-muted)', marginBottom: 4 }}>
                {label}
              </div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Watching state */}
      {!hasEdge && (
        <div style={{
          padding: 16, background: 'var(--bg2)',
          border: '1px solid var(--border)', borderRadius: 8,
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
          color: 'var(--text-muted)', textAlign: 'center'
        }}>
          Run the agent to analyze this market
        </div>
      )}
    </div>
  )
}

export default function Markets({ onRun, running }) {
  const [markets, setMarkets] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState(null)
  const [showTrace, setShowTrace] = useState(false)

  useEffect(() => {
    fetchMarkets()
  }, [])

  async function fetchMarkets() {
    try {
      setLoading(true)
      setError(null)
      const data = await getMarkets()
      setMarkets(data.markets || [])
      if (data.markets?.length > 0) setSelected(data.markets[0])
    } catch (err) {
      setError('Could not connect to backend. Make sure the server is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* Markets list */}
      <div style={{
        flex: 1, borderRight: '1px solid var(--border)',
        overflowY: 'auto', padding: 24,
        display: showTrace ? 'none' : 'block'
      }}
        className="markets-list"
      >
        {/* Panel header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16
        }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
            color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', gap: 12
          }}>
            Active Markets
            <span style={{
              padding: '2px 8px', background: 'var(--cyan-glow)',
              border: '1px solid var(--border-accent)',
              borderRadius: 4, color: 'var(--cyan)'
            }}>
              {markets.length}
            </span>
          </div>
          <button onClick={fetchMarkets} style={{
            background: 'transparent', border: '1px solid var(--border)',
            borderRadius: 6, padding: '5px 12px',
            color: 'var(--text-muted)', fontSize: 11,
            fontFamily: 'JetBrains Mono, monospace',
            cursor: 'pointer'
          }}>↺ Refresh</button>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: 16, background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: 10, color: 'var(--red)',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
            marginBottom: 16
          }}>
            ⚠ {error}
          </div>
        )}

        {/* Loading */}
        {loading && Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}

        {/* Markets */}
        {!loading && markets.map((m, i) => (
          <MarketCard
            key={m.market_id}
            market={m}
            index={i}
            selected={selected?.market_id === m.market_id}
            onClick={(market) => {
              setSelected(market)
              setShowTrace(true)
            }}
          />
        ))}

        {!loading && markets.length === 0 && !error && (
          <div style={{
            textAlign: 'center', padding: 40,
            color: 'var(--text-muted)',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 12
          }}>
            No markets found. Try refreshing.
          </div>
        )}
      </div>

      {/* Trace panel — desktop always visible, mobile toggled */}
      <div style={{
        width: 380, flexShrink: 0,
        background: 'var(--bg)',
        display: showTrace ? 'flex' : 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
        className="trace-panel-wrapper"
      >
        {/* Mobile back button */}
        <div style={{
          padding: '12px 16px', borderBottom: '1px solid var(--border)',
          display: 'none'
        }} className="mobile-back">
          <button onClick={() => setShowTrace(false)} style={{
            background: 'transparent', border: 'none',
            color: 'var(--cyan)', fontFamily: 'JetBrains Mono, monospace',
            fontSize: 12, cursor: 'pointer'
          }}>← Back to markets</button>
        </div>
        <TracePanel market={selected} />
      </div>

      <style>{`
        @media (max-width: 768px) {
          .markets-list { display: ${showTrace ? 'none' : 'block'} !important; flex: none !important; width: 100% !important; border-right: none !important; }
          .trace-panel-wrapper { width: 100% !important; display: ${showTrace ? 'flex' : 'none'} !important; }
          .mobile-back { display: block !important; }
        }
      `}</style>
    </div>
  )
}