// @ts-nocheck
import { createContext, useContext, useState, ReactNode } from 'react'

// Real Supabase user IDs - matched to actual auth.users
const DEMO_USERS = {
  'admin@myrestaurant.com': {
    id: '8cfd3b46-43ad-408a-abdf-6d2807d54086',
    email: 'admin@myrestaurant.com',
    full_name: 'Owner',
    role: 'admin',
  },
  'cashier@myrestaurant.com': {
    id: '038c22e2-f974-4862-a2bb-a1527e144866',
    email: 'cashier@myrestaurant.com',
    full_name: 'Billing Staff',
    role: 'cashier',
  },
  'waiter@myrestaurant.com': {
    id: '932c271e-586b-4f20-a233-f3f405274cb9',
    email: 'waiter@myrestaurant.com',
    full_name: 'Head Waiter',
    role: 'waiter',
  },
}

const PASSWORDS = {
  'admin@myrestaurant.com':   'Demo@123',
  'cashier@myrestaurant.com': 'Demo@123',
  'waiter@myrestaurant.com':  'Demo@123',
}

const SESSION_KEY = 'ros_user_v3'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      if (DEMO_USERS[parsed.email]) return DEMO_USERS[parsed.email]
      return null
    } catch { return null }
  })

  async function signIn(email, password) {
    const key = email.toLowerCase().trim()
    const demo = DEMO_USERS[key]
    const pass = PASSWORDS[key]
    if (!demo || !pass) throw new Error('Invalid email or password')
    if (password !== pass) throw new Error('Invalid email or password')
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(demo))
    setUser(demo)
  }

  async function signOut() {
    sessionStorage.removeItem(SESSION_KEY)
    setUser(null)
  }

  const role = user?.role ?? null

  return (
    <AuthContext.Provider value={{
      user, profile: user, role, loading: false,
      signIn, signOut,
      isAdmin:   role === 'admin',
      isCashier: role === 'cashier' || role === 'admin',
      isWaiter:  role === 'waiter'  || role === 'admin',
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
