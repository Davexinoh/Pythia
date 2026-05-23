import { useState } from 'react'
import { useWallet } from '../context/WalletContext'

export default function Landing({ onConnected }) {
  const { connect, loading, error } = useWallet()
  const [email, setEmail] = useState('')
  const [step, setStep] = useState('input') // input | connecting | done

  async function handleConnect() {
    if (!email || !email.includes('@')) return
    setStep('connecting')
    try {
      const wallet = await connect(email)
      setStep('done')
      setTimeout(() => onConnected(wallet), 800)
    } catch {
      setStep('input')
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleConnect()
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 24, position: 'relative', overflow: 'hidden'
    }}>

      {/* Grid background */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(99,179,237,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,179,237,0.03) 1px, transparent 1px)',
        backgroundSize: '44px 44px'
      }} />

      {/* Top glow */}
      <div style={{
        position: 'fixed', top: -300, left: '50%', transform: 'translateX(-50%)',
        width: 800, height: 600,
        background: 'radial-gradient(circle, rgba(99,179,237,0.07) 0%, transparent 65%)',
        pointerEvents: 'none', zIndex: 0
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 480,
        display: 'flex', flexDirection: 'column', alignItems: 'center'
      }}>

        {/* Logo */}
        <div className="fade-up" style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            fontSize: 56, fontWeight: 800, letterSpacing: -2,
            color: '#fff', lineHeight: 1, marginBottom: 8
          }}>
            Pyth<span style={{ color: 'var(--cyan)' }}>ia</span>
          </div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
            color: 'var(--text-muted)', letterSpacing: 3,
            textTransform: 'uppercase'
          }}>
            Prediction Market Oracle
          </div>
        </div>

        {/* Tagline */}
        <div className="fade-up-1" style={{
          textAlign: 'center', marginBottom: 48, maxWidth: 360
        }}>
          <div style={{
            fontSize: 16, fontWeight: 500, color: 'var(--text-muted)',
            lineHeight: 1.6
          }}>
            AI reads the news. Math finds the edge.
            <br />You collect the alpha.
          </div>
        </div>

        {/* Stats row */}
        <div className="fade-up-2" style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 1, background: 'var(--border)',
          borderRadius: 12, overflow: 'hidden',
          width: '100%', marginBottom: 40,
          border: '1px solid var(--border)'
        }}>
          {[
            { label: 'Starting Balance', value: '$1,000', unit: 'USDC' },
            { label: 'Markets Watched', value: '63+', unit: 'live' },
            { label: 'Settlement', value: 'Arc', unit: 'testnet' },
          ].map(({ label, value, unit }) => (
            <div key={label} style={{
              background: 'var(--bg2)', padding: '16px 12px', textAlign: 'center'
            }}>
              <div style={{
                fontSize: 20, fontWeight: 800, color: 'var(--cyan)',
                letterSpacing: -0.5, lineHeight: 1
              }}>{value}</div>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
                color: 'var(--text-dim)', marginTop: 4, letterSpacing: 1,
                textTransform: 'uppercase'
              }}>{unit}</div>
              <div style={{
                fontSize: 10, color: 'var(--text-muted)', marginTop: 4
              }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Connect form */}
        <div className="fade-up-3" style={{ width: '100%' }}>
          {step === 'done' ? (
            <div style={{
              padding: '20px 24px', background: 'var(--green-glow)',
              border: '1px solid rgba(52,211,153,0.3)',
              borderRadius: 12, textAlign: 'center'
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>✦</div>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
                color: 'var(--green)', fontWeight: 600
              }}>
                Wallet Connected
              </div>
              <div style={{
                fontSize: 12, color: 'var(--text-muted)', marginTop: 4
              }}>
                Entering dashboard...
              </div>
            </div>
          ) : (
            <>
              <div style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 12, padding: 24
              }}>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                  color: 'var(--text-muted)', letterSpacing: 1.5,
                  textTransform: 'uppercase', marginBottom: 16
                }}>
                  Connect Your Wallet
                </div>

                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={step === 'connecting'}
                  style={{
                    width: '100%', padding: '12px 16px',
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: 8, color: 'var(--text)',
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 13,
                    outline: 'none', marginBottom: 12,
                    transition: 'border-color 0.15s'
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--cyan)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />

                <button
                  onClick={handleConnect}
                  disabled={!email || !email.includes('@') || step === 'connecting'}
                  style={{
                    width: '100%', padding: '13px 24px',
                    background: step === 'connecting' ? 'var(--text-dim)' : 'var(--cyan)',
                    border: 'none', borderRadius: 8,
                    color: step === 'connecting' ? 'var(--text-muted)' : '#080c14',
                    fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700,
                    cursor: step === 'connecting' ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s', letterSpacing: 0.3
                  }}
                >
                  {step === 'connecting' ? '⟳ Connecting...' : 'Enter Pythia →'}
                </button>

                {error && (
                  <div style={{
                    marginTop: 12, padding: '10px 14px',
                    background: 'rgba(248,113,113,0.08)',
                    border: '1px solid rgba(248,113,113,0.2)',
                    borderRadius: 8, color: 'var(--red)',
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 11
                  }}>
                    ⚠ {error}
                  </div>
                )}
              </div>

              <div style={{
                textAlign: 'center', marginTop: 16,
                fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                color: 'var(--text-dim)', lineHeight: 1.6
              }}>
                New users get $1,000 virtual USDC to start.
                <br />Returning users pick up where they left off.
                <br />Powered by Circle Wallets · Arc Testnet
              </div>
            </>
          )}
        </div>

        {/* How it works */}
        <div className="fade-up-4" style={{ width: '100%', marginTop: 48 }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
            color: 'var(--text-dim)', letterSpacing: 2,
            textTransform: 'uppercase', textAlign: 'center', marginBottom: 20
          }}>How Pythia Works</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { step: '01', title: 'Fetch Markets', desc: 'Scans 60+ live Polymarket prediction markets' },
              { step: '02', title: 'Extract Signals', desc: 'Reads fresh news via Exa, extracts directional signals with Groq' },
              { step: '03', title: 'Calculate Edge', desc: 'Log-odds model finds mispriced probabilities' },
              { step: '04', title: 'Execute', desc: 'Kelly-sized positions with full risk controls and audit trail' },
            ].map(({ step, title, desc }) => (
              <div key={step} style={{
                display: 'flex', gap: 16, alignItems: 'flex-start',
                padding: '14px 16px', background: 'var(--bg2)',
                border: '1px solid var(--border)', borderRadius: 10
              }}>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                  color: 'var(--cyan)', fontWeight: 600, flexShrink: 0,
                  marginTop: 1
                }}>{step}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}