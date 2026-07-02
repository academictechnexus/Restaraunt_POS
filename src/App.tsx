// @ts-nocheck
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import LoginPage from '@/pages/auth/LoginPage'
import CashierDashboard from '@/pages/cashier/CashierDashboard'
import AdminDashboard from '@/pages/admin/AdminDashboard'
import WaiterDashboard from '@/pages/waiter/WaiterDashboard'

function RoleRouter() {
  const { user, profile, loading } = useAuth()
  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f9fafb' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:48, height:48, border:'4px solid #2563eb', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }} />
        <p style={{ color:'#6b7280', fontSize:14 }}>Loading RestaurantOS...</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  switch (profile?.role) {
    case 'admin':   return <Navigate to="/admin"   replace />
    case 'waiter':  return <Navigate to="/waiter"  replace />
    default:        return <Navigate to="/cashier" replace />
  }
}

function Guard({ children, roles }: { children: any; roles: string[] }) {
  const { user, profile, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (profile && !roles.includes(profile.role)) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
        <Routes>
          <Route path="/login"     element={<LoginPage />} />
          <Route path="/"          element={<RoleRouter />} />
          <Route path="/admin/*"   element={<Guard roles={['admin']}><AdminDashboard /></Guard>} />
          <Route path="/cashier/*" element={<Guard roles={['cashier','admin']}><CashierDashboard /></Guard>} />
          <Route path="/waiter/*"  element={<Guard roles={['waiter','admin']}><WaiterDashboard /></Guard>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
