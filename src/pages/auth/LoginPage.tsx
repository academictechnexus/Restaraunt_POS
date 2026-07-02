// @ts-nocheck
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { UtensilsCrossed, Eye, EyeOff, Loader2, Zap } from 'lucide-react'
import toast from 'react-hot-toast'

const DEMO_ACCOUNTS = [
  {
    role: 'Admin',
    desc: 'Full access — all 17 features',
    email: 'admin@myrestaurant.com',
    password: 'Admin@123',
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    icon: '👑',
  },
  {
    role: 'Manager',
    desc: 'Reports, KDS, inventory, CRM',
    email: 'manager@myrestaurant.com',
    password: 'Manager@123',
    color: '#1d4ed8',
    bg: '#eff6ff',
    border: '#bfdbfe',
    icon: '📊',
  },
  {
    role: 'Cashier',
    desc: 'Tables, orders, billing, KOT',
    email: 'cashier@myrestaurant.com',
    password: 'Cashier@123',
    color: '#059669',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    icon: '🧾',
  },
]

export default function LoginPage() {
  const { user, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState<string | null>(null)

  if (user) return <Navigate to="/" replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await signIn(email, password)
    } catch (err: any) {
      toast.error('Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  async function handleDemo(account: typeof DEMO_ACCOUNTS[0]) {
    setDemoLoading(account.role)
    try {
      await signIn(account.email, account.password)
      toast.success(`Welcome! Logged in as ${account.role}`)
    } catch (err: any) {
      // If demo account doesn't exist yet, show helpful message
      toast.error(`Demo account not set up yet. Use: ${account.email} / ${account.password}`)
    } finally {
      setDemoLoading(null)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 60%, #7c3aed 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif'
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 64, height: 64,
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <UtensilsCrossed style={{ width: 32, height: 32, color: 'white' }} />
          </div>
          <h1 style={{ color: 'white', fontSize: 28, fontWeight: 700, margin: 0 }}>RestaurantOS</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 }}>
            Complete Restaurant POS System
          </p>
        </div>

        {/* Demo buttons */}
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 20,
          padding: 20,
          marginBottom: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Zap style={{ width: 16, height: 16, color: '#fbbf24' }} />
            <p style={{ color: 'white', fontSize: 13, fontWeight: 600, margin: 0 }}>
              Try Demo — One Click Login
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {DEMO_ACCOUNTS.map(account => (
              <button
                key={account.role}
                onClick={() => handleDemo(account)}
                disabled={demoLoading !== null}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  background: account.bg,
                  border: `2px solid ${account.border}`,
                  borderRadius: 14,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  opacity: demoLoading && demoLoading !== account.role ? 0.6 : 1,
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 24 }}>{account.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: account.color }}>
                    {account.role}
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>
                    {account.desc}
                  </div>
                </div>
                {demoLoading === account.role ? (
                  <div style={{
                    width: 20, height: 20, border: `2px solid ${account.color}`,
                    borderTopColor: 'transparent', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                ) : (
                  <div style={{
                    background: account.color, color: 'white',
                    borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 600
                  }}>
                    Try →
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.2)' }} />
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>or sign in with your account</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.2)' }} />
        </div>

        {/* Login form */}
        <div style={{
          background: 'white',
          borderRadius: 20,
          padding: 24,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 6, fontWeight: 500 }}>
                Email address
              </label>
              <input
                type="email"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10,
                  border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none',
                  boxSizing: 'border-box', transition: 'border-color 0.2s'
                }}
                placeholder="you@restaurant.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 6, fontWeight: 500 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  style={{
                    width: '100%', padding: '10px 40px 10px 14px', borderRadius: 10,
                    border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af'
                  }}
                >
                  {showPass
                    ? <EyeOff style={{ width: 16, height: 16 }} />
                    : <Eye style={{ width: 16, height: 16 }} />
                  }
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px', background: '#1d4ed8',
                color: 'white', border: 'none', borderRadius: 12,
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} /> : 'Sign In'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 20 }}>
          © 2026 RestaurantOS · Made in India 🇮🇳
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        button:hover { transform: translateY(-1px); }
        button:active { transform: scale(0.98); }
      `}</style>
    </div>
  )
}
