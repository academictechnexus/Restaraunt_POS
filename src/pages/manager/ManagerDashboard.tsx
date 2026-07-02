// @ts-nocheck
import { Routes, Route } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import { LayoutDashboard, ClipboardList, Package, BarChart3, TrendingUp, Star, ChefHat, Tag } from 'lucide-react'
import ManagerHome from './ManagerHome'
import OrdersOverview from './OrdersOverview'
import InventoryPage from './InventoryPage'
import ReportsPage from './ReportsPage'
import FinanceReports from '@/pages/reports/FinanceReports'
import CRMDashboard from '@/pages/crm/CRMDashboard'
import KitchenDisplay from '@/pages/kitchen/KitchenDisplay'
import ShiftManagement from '@/pages/cashier/ShiftManagement'
import AdvancedInventory from '@/pages/inventory/AdvancedInventory'

const navItems = [
  { label: 'Dashboard',      to: '/manager',              icon: LayoutDashboard },
  { label: 'Live Orders',    to: '/manager/orders',       icon: ClipboardList },
  { label: 'Kitchen (KDS)',  to: '/manager/kitchen',      icon: ChefHat },
  { label: 'Inventory',      to: '/manager/inventory',    icon: Package },
  { label: 'Adv Inventory',  to: '/manager/adv-inventory',icon: Package },
  { label: 'Reports',        to: '/manager/reports',      icon: BarChart3 },
  { label: 'Finance',        to: '/manager/finance',      icon: TrendingUp },
  { label: 'CRM & Loyalty',  to: '/manager/crm',          icon: Star },
  { label: 'Shift Mgmt',     to: '/manager/shifts',       icon: Tag },
]

export default function ManagerDashboard() {
  return (
    <AppLayout navItems={navItems} title="Manager" roleColor="blue">
      <Routes>
        <Route index                   element={<ManagerHome />} />
        <Route path="orders"           element={<OrdersOverview />} />
        <Route path="kitchen"          element={<KitchenDisplay />} />
        <Route path="inventory"        element={<InventoryPage />} />
        <Route path="adv-inventory"    element={<AdvancedInventory />} />
        <Route path="reports"          element={<ReportsPage />} />
        <Route path="finance"          element={<FinanceReports />} />
        <Route path="crm"              element={<CRMDashboard />} />
        <Route path="shifts"           element={<ShiftManagement />} />
      </Routes>
    </AppLayout>
  )
}
