// @ts-nocheck
import { Routes, Route } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import { Grid3x3, ShoppingCart, Receipt, ClipboardList, PauseCircle, Tag } from 'lucide-react'
import TableGrid from './TableGrid'
import OrderScreen from './OrderScreen'
import BillingScreen from './BillingScreen'
import ActiveOrders from './ActiveOrders'
import ShiftManagement from './ShiftManagement'

const navItems = [
  { label: 'Tables',        to: '/cashier',              icon: Grid3x3 },
  { label: 'Active Orders', to: '/cashier/orders',       icon: ClipboardList },
  { label: 'New Order',     to: '/cashier/order/new',    icon: ShoppingCart },
  { label: 'Shift',         to: '/cashier/shift',        icon: Tag },
]

export default function CashierDashboard() {
  return (
    <AppLayout navItems={navItems} title="POS" roleColor="green">
      <Routes>
        <Route index             element={<TableGrid />} />
        <Route path="orders"     element={<ActiveOrders />} />
        <Route path="order/new"  element={<OrderScreen />} />
        <Route path="order/:id"  element={<OrderScreen />} />
        <Route path="bill/:id"   element={<BillingScreen />} />
        <Route path="shift"      element={<ShiftManagement />} />
      </Routes>
    </AppLayout>
  )
}
