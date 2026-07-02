// @ts-nocheck
import { Routes, Route } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import {
  LayoutDashboard, UtensilsCrossed, Table2, Users,
  Settings, BarChart3, Package, Brain, Building2,
  Star, Printer, Webhook, ChefHat, QrCode, Tag, TrendingUp
} from 'lucide-react'
import AdminHome from './AdminHome'
import MenuManagement from './MenuManagement'
import TableManagement from './TableManagement'
import UserManagement from './UserManagement'
import RestaurantSettings from './RestaurantSettings'
import ReportsPage from '@/pages/manager/ReportsPage'
import InventoryPage from '@/pages/manager/InventoryPage'
import AIAssistant from './AIAssistant'
import AdvancedInventory from '@/pages/inventory/AdvancedInventory'
import FinanceReports from '@/pages/reports/FinanceReports'
import MultiBranch from '@/pages/multibranch/MultiBranch'
import CRMDashboard from '@/pages/crm/CRMDashboard'
import Integrations from '@/pages/integrations/Integrations'
import { PrinterSettings } from '@/components/print/PrintService'
import KitchenDisplay from '@/pages/kitchen/KitchenDisplay'
import { QRCodeGenerator } from '@/pages/online/QROrdering'
import ShiftManagement from '@/pages/cashier/ShiftManagement'

const navItems = [
  { label: 'Dashboard',     to: '/admin',                icon: LayoutDashboard },
  { label: 'Menu',          to: '/admin/menu',           icon: UtensilsCrossed },
  { label: 'Tables',        to: '/admin/tables',         icon: Table2 },
  { label: 'Staff',         to: '/admin/staff',          icon: Users },
  { label: 'Inventory',     to: '/admin/inventory',      icon: Package },
  { label: 'Adv. Inventory',to: '/admin/adv-inventory',  icon: Package },
  { label: 'Reports',       to: '/admin/reports',        icon: BarChart3 },
  { label: 'Finance',       to: '/admin/finance',        icon: TrendingUp },
  { label: 'CRM & Loyalty', to: '/admin/crm',            icon: Star },
  { label: 'Multi-Branch',  to: '/admin/branches',       icon: Building2 },
  { label: 'Integrations',  to: '/admin/integrations',   icon: Webhook },
  { label: 'AI Assistant',  to: '/admin/ai',             icon: Brain },
  { label: 'Kitchen (KDS)', to: '/admin/kitchen',        icon: ChefHat },
  { label: 'QR Ordering',   to: '/admin/qr',             icon: QrCode },
  { label: 'Shift Mgmt',    to: '/admin/shifts',         icon: Tag },
  { label: 'Printer Setup', to: '/admin/printer',        icon: Printer },
  { label: 'Settings',      to: '/admin/settings',       icon: Settings },
]

export default function AdminDashboard() {
  return (
    <AppLayout navItems={navItems} title="Admin" roleColor="purple">
      <Routes>
        <Route index                element={<AdminHome />} />
        <Route path="menu"          element={<MenuManagement />} />
        <Route path="tables"        element={<TableManagement />} />
        <Route path="staff"         element={<UserManagement />} />
        <Route path="inventory"     element={<InventoryPage />} />
        <Route path="adv-inventory" element={<AdvancedInventory />} />
        <Route path="reports"       element={<ReportsPage />} />
        <Route path="finance"       element={<FinanceReports />} />
        <Route path="crm"           element={<CRMDashboard />} />
        <Route path="branches"      element={<MultiBranch />} />
        <Route path="integrations"  element={<Integrations />} />
        <Route path="ai"            element={<AIAssistant />} />
        <Route path="kitchen"       element={<KitchenDisplay />} />
        <Route path="qr"            element={<QRCodeGenerator />} />
        <Route path="shifts"        element={<ShiftManagement />} />
        <Route path="printer"       element={<PrinterSettings />} />
        <Route path="settings"      element={<RestaurantSettings />} />
      </Routes>
    </AppLayout>
  )
}
