import { Routes, Route } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import { LayoutDashboard, UtensilsCrossed, Table2, Users, Settings, BarChart3, Package } from 'lucide-react'
import AdminHome from './AdminHome'
import MenuManagement from './MenuManagement'
import TableManagement from './TableManagement'
import UserManagement from './UserManagement'
import RestaurantSettings from './RestaurantSettings'
import ReportsPage from '@/pages/manager/ReportsPage'
import InventoryPage from '@/pages/manager/InventoryPage'

const navItems = [
  { label: 'Dashboard',   to: '/admin',              icon: LayoutDashboard },
  { label: 'Menu',        to: '/admin/menu',         icon: UtensilsCrossed },
  { label: 'Tables',      to: '/admin/tables',       icon: Table2 },
  { label: 'Staff',       to: '/admin/staff',        icon: Users },
  { label: 'Inventory',   to: '/admin/inventory',    icon: Package },
  { label: 'Reports',     to: '/admin/reports',      icon: BarChart3 },
  { label: 'Settings',    to: '/admin/settings',     icon: Settings },
]

export default function AdminDashboard() {
  return (
    <AppLayout navItems={navItems} title="Admin" roleColor="purple">
      <Routes>
        <Route index             element={<AdminHome />} />
        <Route path="menu"       element={<MenuManagement />} />
        <Route path="tables"     element={<TableManagement />} />
        <Route path="staff"      element={<UserManagement />} />
        <Route path="inventory"  element={<InventoryPage />} />
        <Route path="reports"    element={<ReportsPage />} />
        <Route path="settings"   element={<RestaurantSettings />} />
      </Routes>
    </AppLayout>
  )
}
