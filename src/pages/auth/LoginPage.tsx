import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { UtensilsCrossed, Eye, EyeOff, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { user, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await signIn(email, password)
    } catch (err: any) {
      toast.error(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <UtensilsCrossed className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-white">RestaurantOS</h1>
          <p className="text-blue-200 text-sm mt-1">Sign in to your account</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-3xl shadow-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                className="input"
                placeholder="you@restaurant.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary btn-lg w-full mt-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
            </button>
          </form>

          {/* Role hint */}
          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-xs text-center text-gray-500 mb-3">Demo accounts</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { role: 'Admin', color: 'purple' },
                { role: 'Manager', color: 'blue' },
                { role: 'Cashier', color: 'green' },
              ].map(({ role, color }) => (
                <div key={role} className={`text-center py-2 rounded-xl bg-${color}-50 border border-${color}-100`}>
                  <p className={`text-xs font-medium text-${color}-700`}>{role}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-blue-200 text-xs mt-6">
          © 2026 RestaurantOS · Made in India 🇮🇳
        </p>
      </div>
    </div>
  )
}
