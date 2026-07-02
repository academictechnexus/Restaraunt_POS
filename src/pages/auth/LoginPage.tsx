// @ts-nocheck
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const DEMO = [
  {
    role: 'Admin',
    email: 'admin@myrestaurant.com',
    password: 'Demo@123',
    icon: '👑',
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    desc: 'Menu · Tables · Staff · Reports · Settings · Integrations · AI',
  },
  {
    role: 'Cashier',
    email: 'cashier@myrestaurant.com',
    password: 'Demo@123',
    icon: '🧾',
    color: '#0369a1',
    bg: '#eff6ff',
    border: '#bfdbfe',
    desc: 'Billing · KOT view · Invoices · Shift management · Reports',
  },
  {
    role: 'Waiter',
    email: 'waiter@myrestaurant.com',
    password: 'Demo@123',
    icon: '🛎',
    color: '#059669',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    desc: 'Take orders · Send KOT · Add items · View table orders',
  },
]

export default function LoginPage() {
  const { user, signIn } = useAuth()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [demoLoading, setDemoLoading] = useState(null)

  if (user) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try { await signIn(email, password) }
    catch { toast.error('Invalid email or password') }
    finally { setLoading(false) }
  }

  async function tryDemo(d) {
    setDemoLoading(d.role)
    try {
      await signIn(d.email, d.password)
      toast.success(`Welcome! Logged in as ${d.role}`)
    } catch {
      toast.error(`Demo account not ready. Run: UPDATE auth.users SET encrypted_password = crypt('Demo@123', gen_salt('bf')) WHERE email = '${d.email}'`)
    } finally { setDemoLoading(null) }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #0f172a 0%, #1e3a8a 50%, #4c1d95 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif'
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🍽</div>
          <h1 style={{ color: 'white', fontSize: 28, fontWeight: 700, margin: 0 }}>RestaurantOS</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 4, margin: '4px 0 0' }}>
            Complete Restaurant Management System
          </p>
        </div>

        {/* Demo section */}
        <div style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20, padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 16 }}>⚡</span>
            <span style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>Try Demo — One Click Login</span>
            <span style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)', fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 500 }}>LIVE DEMO</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {DEMO.map(d => (
              <button key={d.role} onClick={() => tryDemo(d)} disabled={demoLoading !== null}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                  background: d.bg, border: `2px solid ${d.border}`, borderRadius: 14,
                  cursor: demoLoading ? 'not-allowed' : 'pointer',
                  opacity: demoLoading && demoLoading !== d.role ? 0.5 : 1,
                  transition: 'all 0.2s', textAlign: 'left', width: '100%',
                }}>
                <span style={{ fontSize: 28, flexShrink: 0 }}>{d.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: d.color }}>{d.role}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, lineHeight: 1.4 }}>{d.desc}</div>
                </div>
                {demoLoading === d.role ? (
                  <div style={{ width: 20, height: 20, border: `2px solid ${d.color}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                ) : (
                  <div style={{ background: d.color, color: 'white', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                    Try →
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.15)' }} />
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>or sign in with credentials</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Login form */}
        <div style={{ background: 'white', borderRadius: 20, padding: 24 }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 6, fontWeight: 500 }}>Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                placeholder="you@restaurant.com" />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 6, fontWeight: 500 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  style={{ width: '100%', padding: '10px 40px 10px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: 12, background: loading ? '#93c5fd' : '#1d4ed8', color: 'white', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Signing in...</> : 'Sign In'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 20 }}>
          RestaurantOS © 2026 · Made in India 🇮🇳 · Secure & Mobile Ready
        </p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}button:active{transform:scale(0.98)}`}</style>
    </div>
  )
}
