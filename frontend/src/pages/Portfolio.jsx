import { useState, useEffect } from 'react'
import { getStats, getPositions, sellPosition, getWalletBalance } from '../api.js'
import { useWallet } from '../context/WalletContext'

function PnlBadge({ pnl }) {
  if (pnl === null || pnl === undefined) return (
    <span style={{ fontSize: 12, color: '#8b8b8b' }}>Loading...</span>
  )
  const positive = pnl >= 0
  return (
    <span style={{
      fontSize: 13, fontWeight: 700,
      color: positive ? '#00c73c' : '#ff3d57'
    }}>
      {positive ? '+' : ''}${Math.abs(pnl).toFixed(2)}
    </span>
  )
}

function PositionCard({ position, onSell, selling }) {
  const isOpen = position.status === 'OPEN'
  const pnl = position.unrealized_pnl ?? position.pnl ?? null
  const pnlPct = position.pnl_pct ?? null

  return (
    <div style={{
      background: '#1a1a1a', border: '1px solid #2a2a2a',
      borderRadius: 14, padding: '16px', marginBottom: 10
    }}>
      <div style={{
        fontSize: 13, fontWeight: 600, lineHeight: 1.4,
        marginBottom: 10, color: '#fff'
      }}>
        {position.question?.slice(0, 70)}{position.question?.length > 70 ? '...' : ''}
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 8, marginBottom: 12
      }}>
        <div style={{
          padding: '10px', background: '#242424',
          borderRadius: 10, textAlign: 'center'
        }}>
          <div style={{ fontSize: 10, color: '#8b8b8b', marginBottom: 4 }}>Direction</div>
          <div style={{
            fontSize: 14, fontWeight: 700,
            color: position.direction === 'YES' ? '#00c73c' : '#ff3d57'
          }}>
            {position.direction}
          </div>
        </div>
        <div style={{
          padding: '10px', background: '#242424',
          borderRadius: 10, textAlign: 'center'
        }}>
          <div style={{ fontSize: 10, color: '#8b8b8b', marginBottom: 4 }}>Size</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
            ${position.bet_size_usdc?.toFixed(2)}
          </div>
        </div>
        <div style={{
          padding: '10px', background: '#242424',
          borderRadius: 10, textAlign: 'center'
        }}>
          <div style={{ fontSize: 10, color: '#8b8b8b', marginBottom: 4 }}>
            {isOpen ? 'Unrealized' : 'Realized'} PnL
          </div>
          <PnlBadge pnl={pnl} />
          {pnlPct !== null && (
            <div style={{
              fontSize: 10, color: pnlPct >= 0 ? '#00c73c' : '#ff3d57',
              marginTop: 2
            }}>
              {pnlPct >= 0 ? '+' : ''}{pnlPct}%
            </div>
          )}
        </div>
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: isOpen ? 12 : 0
      }}>
        <div style={{
          display: 'flex', gap: 8, flexWrap: 'wrap',
          fontSize: 11, color: '#8b8b8b'
        }}>
          <span>Entry: {(position.entry_price * 100).toFixed(1)}¢</span>
          {position.current_price !== null && position.current_price !== undefined && (
            <span>Now: {(position.current_price * 100).toFixed(1)}¢</span>
          )}
          <span>{position.category}</span>
          <span style={{
            padding: '1px 7px', borderRadius: 10,
            background: isOpen ? 'rgba(0,112,243,0.15)' : 'rgba(255,255,255,0.05)',
            color: isOpen ? '#0070f3' : '#8b8b8b',
            fontSize: 10, fontWeight: 600
          }}>
            {isOpen ? 'OPEN' : 'CLOSED'}
          </span>
        </div>
      </div>

      {isOpen && (
        <button
          onClick={() => onSell(position.market_id)}
          disabled={selling === position.market_id}
          style={{
            width: '100%', padding: '11px',
            background: selling === position.market_id
              ? '#242424' : 'rgba(255,61,87,0.15)',
            border: '1px solid rgba(255,61,87,0.3)',
            borderRadius: 10, color: selling === position.market_id
              ? '#8b8b8b' : '#ff3d57',
            fontSize: 13, fontWeight: 600,
            cursor: selling === position.market_id ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s'
          }}
        >
          {selling === position.market_id ? 'Selling...' : 'Sell Position'}
        </button>
      )}
    </div>
  )
}

export default function Portfolio() {
  const { wallet, disconnect, updateBalance } = useWallet()
  const [stats, setStats] = useState(null)
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selling, setSelling] = useState(null)
  const [sellMsg, setSellMsg] = useState(null)
  const [tab, setTab] = useState('open')

  useEffect(() => {
    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [])

  async function load() {
    try {
      const [s, p] = await Promise.all([
        getStats(wallet?.address),
        wallet?.address ? getPositions(wallet.address) : Promise.resolve({ positions: [] })
      ])
      setStats(s)
      setPositions(p.positions || [])
    } catch {} finally {
      setLoading(false)
    }
  }

  async function handleSell(market_id) {
    if (!wallet?.address) return
    setSelling(market_id)
    setSellMsg(null)
    try {
      const result = await sellPosition(wallet.address, market_id)
      setSellMsg({ type: 'success', text: result.message })
      updateBalance(result.newBalance)
      await load()
    } catch (err) {
      setSellMsg({ type: 'error', text: err.response?.data?.error || 'Sell failed' })
    } finally {
      setSelling(null)
    }
  }

  const openPositions = positions.filter(p => p.status === 'OPEN')
  const closedPositions = positions.filter(p => p.status === 'CLOSED')
  const totalUnrealized = openPositions.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0)
  const totalRealized = closedPositions.reduce((sum, p) => sum + (p.pnl || 0), 0)
  const totalBet = openPositions.reduce((sum, p) => sum + (p.bet_size_usdc || 0), 0)

  return (
    <div style={{ height: '100%', overflowY: 'auto', paddingBottom: 80 }}>

      {/* Balance card */}
      <div style={{
        background: 'linear-gradient(135deg, #0070f3, #00c73c)',
        margin: '16px 16px 12px', borderRadius: 20, padding: '24px'
      }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Available Balance
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
          display: 'flex', justifyContent: 'space-between',
          fontSize: 12, color: 'rgba(255,255,255,0.7)'
        }}>
          <span>{wallet?.email}</span>
          <span>{wallet?.address?.slice(0, 6)}...{wallet?.address?.slice(-4)}</span>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 8, padding: '0 16px 12px'
      }}>
        {[
          { label: 'Open Positions', value: openPositions.length, color: '#0070f3' },
          { label: 'Deployed', value: '$' + totalBet.toFixed(0), color: '#fff' },
          { label: 'Unrealized PnL', value: (totalUnrealized >= 0 ? '+' : '') + '$' + totalUnrealized.toFixed(2), color: totalUnrealized >= 0 ? '#00c73c' : '#ff3d57' },
          { label: 'Realized PnL', value: (totalRealized >= 0 ? '+' : '') + '$' + totalRealized.toFixed(2), color: totalRealized >= 0 ? '#00c73c' : '#ff3d57' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            padding: '14px', background: '#1a1a1a',
            borderRadius: 14, border: '1px solid #2a2a2a'
          }}>
            <div style={{ fontSize: 11, color: '#8b8b8b', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Sell message */}
      {sellMsg && (
        <div style={{
          margin: '0 16px 12px', padding: '12px 16px',
          background: sellMsg.type === 'success' ? 'rgba(0,199,60,0.15)' : 'rgba(255,61,87,0.15)',
          border: '1px solid ' + (sellMsg.type === 'success' ? '#00c73c' : '#ff3d57'),
          borderRadius: 12, fontSize: 13, fontWeight: 600,
          color: sellMsg.type === 'success' ? '#00c73c' : '#ff3d57'
        }}>
          {sellMsg.text}
        </div>
      )}

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 8, padding: '0 16px 12px'
      }}>
        {[
          { key: 'open', label: 'Open (' + openPositions.length + ')' },
          { key: 'closed', label: 'Closed (' + closedPositions.length + ')' },
          { key: 'stats', label: 'Stats' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '8px 16px', borderRadius: 20, border: 'none',
            background: tab === key ? '#0070f3' : '#1a1a1a',
            color: tab === key ? '#fff' : '#8b8b8b',
            fontSize: 13, fontWeight: 500, cursor: 'pointer'
          }}>{label}</button>
        ))}
      </div>

      <div style={{ padding: '0 16px' }}>

        {/* Open positions */}
        {tab === 'open' && (
          <>
            {loading && <div style={{ textAlign: 'center', padding: 40, color: '#8b8b8b', fontSize: 14 }}>Loading...</div>}
            {!loading && openPositions.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#8b8b8b', fontSize: 14 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>◈</div>
                No open positions. Run the agent to start trading.
              </div>
            )}
            {openPositions.map(p => (
              <PositionCard
                key={p.market_id}
                position={p}
                onSell={handleSell}
                selling={selling}
              />
            ))}
          </>
        )}

        {/* Closed positions */}
        {tab === 'closed' && (
          <>
            {closedPositions.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#8b8b8b', fontSize: 14 }}>
                No closed positions yet.
              </div>
            )}
            {closedPositions.map(p => (
              <PositionCard
                key={p.market_id + p.closedAt}
                position={p}
                onSell={handleSell}
                selling={selling}
              />
            ))}
          </>
        )}

        {/* Stats */}
        {tab === 'stats' && stats && (
          <div>
            {[
              { label: 'Markets Analyzed', value: stats.total },
              { label: 'Executed', value: stats.executed, color: '#00c73c' },
              { label: 'Skipped', value: stats.skipped, color: '#f5a623' },
              { label: 'Invalidated', value: stats.invalidated, color: '#ff3d57' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', padding: '14px 16px',
                background: '#1a1a1a', borderRadius: 12,
                marginBottom: 8, border: '1px solid #2a2a2a'
              }}>
                <span style={{ fontSize: 14, color: '#8b8b8b' }}>{label}</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: color || '#fff' }}>{value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Disconnect */}
        <button
          onClick={disconnect}
          style={{
            width: '100%', padding: '14px', marginTop: 20,
            background: '#1a1a1a', border: '1px solid #2a2a2a',
            borderRadius: 14, color: '#ff3d57',
            fontSize: 14, fontWeight: 600, cursor: 'pointer'
          }}
        >
          Disconnect Wallet
        </button>
      </div>
    </div>
  )
}
