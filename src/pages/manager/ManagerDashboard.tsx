import { Routes, Route } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import { LayoutDashboard, ClipboardList, Package, BarChart3 } from 'lucide-react'
import ManagerHome from './ManagerHome'
import OrdersOverview from './OrdersOverview'
import InventoryPage from './InventoryPage'
import ReportsPage from './ReportsPage'

const navItems = [
  { label: 'Dashboard',  to: '/manager',           icon: LayoutDashboard },
  { label: 'Orders',     to: '/manager/orders',    icon: ClipboardList },
  { label: 'Inventory',  to: '/manager/inventory', icon: Package },
  { label: 'Reports',    to: '/manager/reports',   icon: BarChart3 },
]

export default function ManagerDashboard() {
  return (
    <AppLayout navItems={navItems} title="Manager" roleColor="blue">
      <Routes>
        <Route index             element={<ManagerHome />} />
        <Route path="orders"     element={<OrdersOverview />} />
        <Route path="inventory"  element={<InventoryPage />} />
        <Route path="reports"    element={<ReportsPage />} />
      </Routes>
    </AppLayout>
  )
}
