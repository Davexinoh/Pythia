import { useState } from 'react'
import { useWallet } from '../context/WalletContext'

export default function Landing({ onConnected }) {
  const { connect, loading, error } = useWallet()
  const [email, setEmail] = useState('')
  const [step, setStep] = useState('input')

  async function handleConnect() {
    if (!email || !email.includes('@')) return
    setStep('connecting')
    try {
      const wallet = await connect(email)
      setStep('done')
      setTimeout(() => onConnected(wallet), 600)
    } catch {
      setStep('input')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0d0d0d',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 20px'
    }}>

      {/* Logo */}
      <div className="fade-up" style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: 'linear-gradient(135deg, #0070f3, #00c73c)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, fontWeight: 800, color: '#fff',
          margin: '0 auto 16px'
        }}>P</div>
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>
          Pythia
        </div>
        <div style={{
          fontSize: 14, color: 'var(--text-muted)',
          marginTop: 6, fontWeight: 400
        }}>
          AI-powered prediction market oracle
        </div>
      </div>

      {/* Stats */}
      <div className="fade-up-1" style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 1, background: 'var(--border)',
        borderRadius: 16, overflow: 'hidden',
        width: '100%', maxWidth: 420, marginBottom: 32
      }}>
        {[
          { value: '$1,000', label: 'Starting USDC' },
          { value: '500+', label: 'Live Markets' },
          { value: 'Arc', label: 'Testnet' },
        ].map(({ value, label }) => (
          <div key={label} style={{
            background: 'var(--bg2)', padding: '20px 12px', textAlign: 'center'
          }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Form */}
      <div className="fade-up-2" style={{ width: '100%', maxWidth: 420 }}>
        {step === 'done' ? (
          <div style={{
            padding: '24px', background: 'var(--bg2)',
            borderRadius: 16, textAlign: 'center',
            border: '1px solid var(--green)'
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--green)' }}>
              Wallet Connected
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              Loading your dashboard...
            </div>
          </div>
        ) : (
          <div style={{
            background: 'var(--bg2)', borderRadius: 16,
            padding: 24, border: '1px solid var(--border)'
          }}>
            <div style={{
              fontSize: 16, fontWeight: 600, marginBottom: 4
            }}>Connect your wallet</div>
            <div style={{
              fontSize: 13, color: 'var(--text-muted)', marginBottom: 20
            }}>
              New users get $1,000 virtual USDC. Returning users continue where they left off.
            </div>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleConnect()}
              disabled={step === 'connecting'}
              style={{
                width: '100%', padding: '14px 16px',
                background: 'var(--bg3)', border: '1px solid var(--border2)',
                borderRadius: 12, color: '#fff',
                fontSize: 15, outline: 'none', marginBottom: 12,
                transition: 'border-color 0.15s'
              }}
              onFocus={e => e.target.style.borderColor = 'var(--blue)'}
              onBlur={e => e.target.style.borderColor = 'var(--border2)'}
            />

            <button
              onClick={handleConnect}
              disabled={!email || !email.includes('@') || step === 'connecting'}
              style={{
                width: '100%', padding: '14px',
                background: step === 'connecting' ? '#333' : 'var(--blue)',
                border: 'none', borderRadius: 12,
                color: '#fff', fontSize: 15, fontWeight: 600,
                cursor: step === 'connecting' ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {step === 'connecting' ? 'Connecting...' : 'Get Started →'}
            </button>

            {error && (
              <div style={{
                marginTop: 12, padding: '10px 14px',
                background: 'var(--red-bg)', borderRadius: 8,
                color: 'var(--red)', fontSize: 13
              }}>
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="fade-up-3" style={{
        width: '100%', maxWidth: 420, marginTop: 32
      }}>
        {[
          { icon: '📡', title: 'Scans 500+ markets', desc: 'Live prediction markets across crypto, politics, sports' },
          { icon: '🧠', title: 'AI finds the edge', desc: 'News signals + log-odds math identifies mispriced markets' },
          { icon: '⚡', title: 'Executes for you', desc: 'Kelly-sized positions with full audit trail on Arc' },
        ].map(({ icon, title, desc }) => (
          <div key={title} style={{
            display: 'flex', gap: 14, padding: '14px 0',
            borderBottom: '1px solid var(--border)'
          }}>
            <div style={{ fontSize: 22, flexShrink: 0 }}>{icon}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
