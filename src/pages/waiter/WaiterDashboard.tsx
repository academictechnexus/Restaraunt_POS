// @ts-nocheck
import { Routes, Route } from 'react-router-dom'
import WaiterHome from './WaiterHome'
import WaiterOrder from './WaiterOrder'

export default function WaiterDashboard() {
  return (
    <Routes>
      <Route index          element={<WaiterHome />} />
      <Route path="order/new"  element={<WaiterOrder />} />
      <Route path="order/:id"  element={<WaiterOrder />} />
    </Routes>
  )
}
