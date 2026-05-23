import { useState, useEffect } from 'react'
import { getMarkets } from '../api.js'
import { useWallet } from '../context/WalletContext'

const CATEGORIES = ['All', 'Bitcoin', 'Ethereum', 'Solana', 'Crypto', 'Politics', 'Sports', 'Macro', 'Pop Culture']

function MarketCard({ market, index, onSelect, selected }) {
  const hasEdge = market.model_probability != null
  const edge = hasEdge ? market.model_probability - market.implied_probability : null
  const isExecute = hasEdge && Math.abs(edge) >= 0.06

  const yesProb = Math.round(market.implied_probability * 100)
  const noProb = 100 - yesProb
  const modelProb = hasEdge ? Math.round(market.model_probability * 100) : null

  return (
    <div
      onClick={() => onSelect(market)}
      className={`fade-up-${Math.min(index + 1, 4)}`}
      style={{
        background: selected ? 'var(--bg3)' : 'var(--bg2)',
        borderRadius: 16, padding: '16px',
        marginBottom: 8, cursor: 'pointer',
        border: `1px solid ${selected ? 'var(--blue)' : 'var(--border)'}`,
        transition: 'all 0.15s'
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'var(--bg3)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontSize: 20, flexShrink: 0
        }}>
          {market.icon || '🔮'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 600, lineHeight: 1.4,
            marginBottom: 4, color: '#fff'
          }}>
            {market.question}
          </div>
          <div style={{
            fontSize: 12, color: 'var(--text-muted)',
            display: 'flex', gap: 8, alignItems: 'center'
          }}>
            <span>${market.volume > 1000000
              ? (market.volume / 1000000).toFixed(1) + 'M'
              : market.volume > 1000
              ? (market.volume / 1000).toFixed(0) + 'K'
              : market.volume.toFixed(0)} Vol.
            </span>
            {isExecute && edge !== null && (
              <span style={{
                background: 'var(--blue-glow)',
                color: 'var(--blue)', padding: '1px 7px',
                borderRadius: 20, fontSize: 11, fontWeight: 600
              }}>
                {edge > 0 ? '+' : ''}{(edge * 100).toFixed(1)}% EDGE
              </span>
            )}
          </div>
        </div>
      </div>

      {/* YES/NO buttons like Polymarket */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={{
          flex: 1, padding: '10px',
          background: 'var(--green-bg)',
          border: '1px solid transparent',
          borderRadius: 10, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>Yes</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>
            {modelProb !== null ? modelProb : yesProb}¢
          </span>
        </button>
        <button style={{
          flex: 1, padding: '10px',
          background: 'var(--red-bg)',
          border: '1px solid transparent',
          borderRadius: 10, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)' }}>No</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--red)' }}>
            {modelProb !== null ? 100 - modelProb : noProb}¢
          </span>
        </button>
      </div>
    </div>
  )
}

function TracePanel({ market, onClose }) {
  if (!market) return null

  const hasEdge = market.model_probability != null
  const edge = hasEdge ? market.model_probability - market.implied_probability : null
  const status = !hasEdge ? 'WATCHING' : Math.abs(edge) >= 0.06 ? 'EXECUTE' : 'SKIP'

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--bg)',
      zIndex: 100, overflowY: 'auto', padding: '0 0 80px'
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, background: 'var(--bg)',
        padding: '16px 20px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12, zIndex: 1
      }}>
        <button onClick={onClose} style={{
          background: 'var(--bg2)', border: 'none',
          borderRadius: 10, width: 36, height: 36,
          color: '#fff', fontSize: 18, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Decision Trace</div>
      </div>

      <div style={{ padding: 20 }}>
        {/* Market title */}
        <div style={{
          fontSize: 18, fontWeight: 700, lineHeight: 1.4, marginBottom: 16
        }}>{market.question}</div>

        {/* Status */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '8px 14px', borderRadius: 10, marginBottom: 20,
          background: status === 'EXECUTE' ? 'var(--green-bg)'
            : status === 'SKIP' ? 'rgba(245,166,35,0.15)'
            : 'var(--bg2)',
          border: `1px solid ${status === 'EXECUTE' ? 'var(--green)'
            : status === 'SKIP' ? 'var(--amber)'
            : 'var(--border)'}`
        }}>
          <span style={{ fontSize: 16 }}>
            {status === 'EXECUTE' ? '✓' : status === 'SKIP' ? '⊘' : '◌'}
          </span>
          <span style={{
            fontSize: 14, fontWeight: 700,
            color: status === 'EXECUTE' ? 'var(--green)'
              : status === 'SKIP' ? 'var(--amber)'
              : 'var(--text-muted)'
          }}>
            {status} {market.direction ? `· BUY ${market.direction}` : ''}
          </span>
          {market.bet_size_usdc > 0 && (
            <span style={{
              marginLeft: 8, fontSize: 15, fontWeight: 700, color: 'var(--green)'
            }}>${market.bet_size_usdc}</span>
          )}
        </div>

        {/* Probability comparison */}
        {hasEdge && (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr auto 1fr',
            gap: 8, marginBottom: 20, alignItems: 'center'
          }}>
            <div style={{
              padding: '16px', background: 'var(--bg2)',
              borderRadius: 12, textAlign: 'center',
              border: '1px solid var(--border)'
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Market</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-muted)' }}>
                {Math.round(market.implied_probability * 100)}%
              </div>
            </div>
            <div style={{ color: 'var(--blue)', fontSize: 20, fontWeight: 800 }}>→</div>
            <div style={{
              padding: '16px', background: 'var(--blue-glow)',
              borderRadius: 12, textAlign: 'center',
              border: '1px solid var(--blue)'
            }}>
              <div style={{ fontSize: 11, color: 'var(--blue)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Pythia</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--blue)' }}>
                {Math.round(market.model_probability * 100)}%
              </div>
            </div>
          </div>
        )}

        {/* Metrics grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 8, marginBottom: 20
        }}>
          {[
            { label: 'Edge', value: edge ? `${edge >= 0 ? '+' : ''}${(edge * 100).toFixed(2)}%` : 'N/A', color: edge >= 0 ? 'var(--green)' : 'var(--red)' },
            { label: 'Liquidity', value: `$${(market.liquidity / 1000).toFixed(0)}K`, color: '#fff' },
            { label: 'Days Left', value: `${market.days_to_close?.toFixed(0)}d`, color: '#fff' },
            { label: 'Category', value: market.category || 'Other', color: 'var(--blue)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              padding: '14px', background: 'var(--bg2)',
              borderRadius: 12, border: '1px solid var(--border)'
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
            </div>
          ))}
        </div>

        {!hasEdge && (
          <div style={{
            padding: 20, background: 'var(--bg2)',
            borderRadius: 12, textAlign: 'center',
            color: 'var(--text-muted)', fontSize: 14,
            border: '1px solid var(--border)'
          }}>
            Run the agent to analyze this market
          </div>
        )}
      </div>
    </div>
  )
}

export default function Markets({ onRun, running }) {
  const { wallet } = useWallet()
  const [markets, setMarkets] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchMarkets()
  }, [])

  async function fetchMarkets() {
    try {
      setLoading(true)
      setError(null)
      const data = await getMarkets()
      setMarkets(data.markets || [])
    } catch (err) {
      setError('Could not connect to backend')
    } finally {
      setLoading(false)
    }
  }

  const filtered = markets.filter(m => {
    const matchCat = category === 'All' || m.category === category
    const matchSearch = !search || m.question.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '0 0 80px' }}>

      {/* Search bar */}
      <div style={{ padding: '12px 16px', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 10, borderBottom: '1px solid var(--border)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--bg2)', borderRadius: 12,
          padding: '10px 14px', border: '1px solid var(--border)'
        }}>
          <span style={{ fontSize: 16, color: 'var(--text-muted)' }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search markets..."
            style={{
              flex: 1, background: 'transparent', border: 'none',
              color: '#fff', fontSize: 15, outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Category pills */}
      <div style={{
        display: 'flex', gap: 8, padding: '12px 16px',
        overflowX: 'auto', scrollbarWidth: 'none'
      }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            style={{
              padding: '7px 14px', borderRadius: 20, border: 'none',
              background: category === cat ? 'var(--blue)' : 'var(--bg2)',
              color: category === cat ? '#fff' : 'var(--text-muted)',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              whiteSpace: 'nowrap', transition: 'all 0.15s',
              flexShrink: 0
            }}
          >{cat}</button>
        ))}
      </div>

      {/* Markets count */}
      <div style={{
        padding: '0 16px 12px',
        fontSize: 13, color: 'var(--text-muted)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <span>{filtered.length} markets</span>
        <button onClick={fetchMarkets} style={{
          background: 'none', border: 'none',
          color: 'var(--blue)', fontSize: 13, cursor: 'pointer', fontWeight: 500
        }}>Refresh ↺</button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          margin: '0 16px 12px', padding: '12px 16px',
          background: 'var(--red-bg)', borderRadius: 12,
          color: 'var(--red)', fontSize: 13
        }}>{error}</div>
      )}

      {/* Loading skeletons */}
      {loading && Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{
          margin: '0 16px 8px', height: 100,
          background: 'var(--bg2)', borderRadius: 16,
          animation: 'pulse 1.5s infinite'
        }} />
      ))}

      {/* Market cards */}
      <div style={{ padding: '0 16px' }}>
        {!loading && filtered.map((m, i) => (
          <MarketCard
            key={m.market_id}
            market={m}
            index={i}
            selected={selected?.market_id === m.market_id}
            onSelect={setSelected}
          />
        ))}
      </div>

      {/* Trace panel */}
      {selected && (
        <TracePanel
          market={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
