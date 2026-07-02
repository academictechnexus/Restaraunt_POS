// @ts-nocheck
import { Routes, Route } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import { Grid3x3, ClipboardList, FileText, Tag, ChefHat } from 'lucide-react'
import TableGrid from './TableGrid'
import ActiveOrders from './ActiveOrders'
import BillingScreen from './BillingScreen'
import InvoiceList from './InvoiceList'
import ShiftManagement from './ShiftManagement'
import KitchenDisplay from '@/pages/kitchen/KitchenDisplay'

const navItems = [
  { label: 'Tables',        to: '/cashier',           icon: Grid3x3 },
  { label: 'Active Orders', to: '/cashier/orders',    icon: ClipboardList },
  { label: 'Kitchen (KDS)', to: '/cashier/kitchen',   icon: ChefHat },
  { label: 'Invoices',      to: '/cashier/invoices',  icon: FileText },
  { label: 'Shift',         to: '/cashier/shift',     icon: Tag },
]

export default function CashierDashboard() {
  return (
    <AppLayout navItems={navItems} title="Cashier" roleColor="blue">
      <Routes>
        <Route index            element={<TableGrid />} />
        <Route path="orders"    element={<ActiveOrders />} />
        <Route path="kitchen"   element={<KitchenDisplay />} />
        <Route path="bill/:id"  element={<BillingScreen />} />
        <Route path="invoices"  element={<InvoiceList />} />
        <Route path="shift"     element={<ShiftManagement />} />
      </Routes>
    </AppLayout>
  )
}
