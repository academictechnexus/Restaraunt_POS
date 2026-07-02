import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { UtensilsCrossed, LogOut, Menu, X, LucideIcon } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
}

interface AppLayoutProps {
  children: React.ReactNode
  navItems: NavItem[]
  title: string
  roleColor: string
}

export default function AppLayout({ children, navItems, title, roleColor }: AppLayoutProps) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    toast.success('Signed out')
    navigate('/login')
  }

  const roleColors: Record<string, string> = {
    purple: 'from-purple-600 to-purple-800',
    blue:   'from-blue-600 to-blue-800',
    green:  'from-green-600 to-green-800',
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar — desktop */}
      <aside className={clsx(
        'hidden md:flex flex-col w-60 bg-white border-r border-gray-100 shadow-sm flex-shrink-0'
      )}>
        {/* Brand */}
        <div className={`bg-gradient-to-br ${roleColors[roleColor] || roleColors.blue} p-4`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-sm leading-none">RestaurantOS</p>
              <p className="text-white/70 text-xs mt-0.5 capitalize">{profile?.role}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
              {profile?.full_name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{profile?.full_name}</p>
              <p className="text-xs text-gray-500 capitalize">{profile?.role}</p>
            </div>
          </div>
          <button onClick={handleSignOut} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 hover:text-red-600 rounded-xl hover:bg-red-50 transition-all">
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl flex flex-col">
            <div className={`bg-gradient-to-br ${roleColors[roleColor] || roleColors.blue} p-4 flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                  <UtensilsCrossed className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">RestaurantOS</p>
                  <p className="text-white/70 text-xs capitalize">{profile?.role}</p>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => clsx(
                    'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all',
                    isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="p-3 border-t">
              <button onClick={handleSignOut} className="flex items-center gap-2 w-full px-3 py-3 text-sm text-red-600 rounded-xl hover:bg-red-50">
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 shadow-sm flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-blue-600" />
            <span className="font-bold text-gray-900 text-sm">{title}</span>
          </div>
          <div className="ml-auto">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
              {profile?.full_name?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto scroll-touch">
          {children}
        </main>
      </div>
    </div>
  )
}
