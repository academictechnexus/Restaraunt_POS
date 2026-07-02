import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from '@/context/AuthContext'

// Pages
import LoginPage from '@/pages/auth/LoginPage'
import CashierDashboard from '@/pages/cashier/CashierDashboard'
import ManagerDashboard from '@/pages/manager/ManagerDashboard'
import AdminDashboard from '@/pages/admin/AdminDashboard'

function RoleRouter() {
  const { user, profile, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    </div>
  )

  if (!user) return <Navigate to="/login" replace />

  // Route based on role
  switch (profile?.role) {
    case 'admin':   return <Navigate to="/admin"   replace />
    case 'manager': return <Navigate to="/manager" replace />
    default:        return <Navigate to="/cashier" replace />
  }
}

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { user, profile, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (profile && !allowedRoles.includes(profile.role)) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<RoleRouter />} />
          
          <Route path="/cashier/*" element={
            <ProtectedRoute allowedRoles={['cashier', 'manager', 'admin']}>
              <CashierDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/manager/*" element={
            <ProtectedRoute allowedRoles={['manager', 'admin']}>
              <ManagerDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/admin/*" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
