import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { TrendingUp, ShoppingBag, Users, IndianRupee, Clock, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'

interface Stats {
  todayRevenue: number
  todayBills: number
  activeOrders: number
  avgBillValue: number
  paymentBreakdown: { cash: number; upi: number; card: number }
  topItems: { name: string; qty: number; revenue: number }[]
  hourlyData: { hour: string; revenue: number }[]
}

export default function ManagerHome() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const today = format(new Date(), 'yyyy-MM-dd')

  async function loadStats() {
    setLoading(true)
    try {
      // Today's bills
      const { data: bills } = await supabase
        .from('bills')
        .select('*')
        .eq('status', 'paid')
        .gte('created_at', `${today}T00:00:00`)

      // Active orders
      const { count: activeCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'kot_printed', 'served'])

      // Today's order items for top items
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('item_name, quantity, item_price, orders!inner(created_at, status)')
        .gte('orders.created_at', `${today}T00:00:00`)
        .eq('orders.status', 'paid')

      const todayRevenue = bills?.reduce((s, b) => s + b.total_amount, 0) || 0
      const todayBills = bills?.length || 0
      const avgBillValue = todayBills > 0 ? todayRevenue / todayBills : 0

      const paymentBreakdown = {
        cash: bills?.filter(b => b.payment_method === 'cash').reduce((s, b) => s + b.total_amount, 0) || 0,
        upi:  bills?.filter(b => b.payment_method === 'upi').reduce((s, b) => s + b.total_amount, 0) || 0,
        card: bills?.filter(b => b.payment_method === 'card').reduce((s, b) => s + b.total_amount, 0) || 0,
      }

      // Top items
      const itemMap: Record<string, { qty: number; revenue: number }> = {}
      orderItems?.forEach((oi: any) => {
        if (!itemMap[oi.item_name]) itemMap[oi.item_name] = { qty: 0, revenue: 0 }
        itemMap[oi.item_name].qty += oi.quantity
        itemMap[oi.item_name].revenue += oi.quantity * oi.item_price
      })
      const topItems = Object.entries(itemMap)
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)

      // Hourly breakdown
      const hourlyMap: Record<string, number> = {}
      bills?.forEach(b => {
        const hour = format(new Date(b.created_at), 'ha')
        hourlyMap[hour] = (hourlyMap[hour] || 0) + b.total_amount
      })
      const hourlyData = Object.entries(hourlyMap).map(([hour, revenue]) => ({ hour, revenue }))

      setStats({ todayRevenue, todayBills, activeOrders: activeCount || 0, avgBillValue, paymentBreakdown, topItems, hourlyData })
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { loadStats() }, [])

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(loadStats, 60000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return (
    <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array(8).fill(0).map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
    </div>
  )

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Today's Overview</h1>
          <p className="text-sm text-gray-500">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
        </div>
        <button onClick={loadStats} className="p-2 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-gray-700">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={IndianRupee} label="Revenue" value={`₹${stats?.todayRevenue.toFixed(0)}`} color="blue" />
        <StatCard icon={ShoppingBag} label="Bills" value={String(stats?.todayBills)} color="green" />
        <StatCard icon={Clock} label="Active Orders" value={String(stats?.activeOrders)} color="yellow" />
        <StatCard icon={TrendingUp} label="Avg Bill" value={`₹${stats?.avgBillValue.toFixed(0)}`} color="purple" />
      </div>

      {/* Payment breakdown */}
      <div className="card-pad">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Payment Mode Breakdown</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Cash', value: stats?.paymentBreakdown.cash || 0, color: 'green' },
            { label: 'UPI',  value: stats?.paymentBreakdown.upi  || 0, color: 'blue' },
            { label: 'Card', value: stats?.paymentBreakdown.card || 0, color: 'purple' },
          ].map(p => (
            <div key={p.label} className={`p-3 rounded-xl bg-${p.color}-50 border border-${p.color}-100`}>
              <p className={`text-xs text-${p.color}-600 font-medium`}>{p.label}</p>
              <p className={`text-lg font-bold text-${p.color}-700 mt-1`}>₹{p.value.toFixed(0)}</p>
              <p className={`text-xs text-${p.color}-500 mt-0.5`}>
                {stats?.todayRevenue ? ((p.value / stats.todayRevenue) * 100).toFixed(0) : 0}%
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Top selling items */}
      <div className="card-pad">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Top Selling Items</h2>
        {stats?.topItems.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No sales data yet today</p>
        ) : (
          <div className="space-y-3">
            {stats?.topItems.map((item, i) => {
              const maxRevenue = stats.topItems[0]?.revenue || 1
              const pct = (item.revenue / maxRevenue) * 100
              return (
                <div key={item.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400 w-4">#{i + 1}</span>
                      <span className="font-medium text-gray-800">{item.name}</span>
                      <span className="text-xs text-gray-400">{item.qty} sold</span>
                    </div>
                    <span className="font-semibold text-gray-900">₹{item.revenue.toFixed(0)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
  }
  return (
    <div className="card-pad">
      <div className={`inline-flex p-2 rounded-xl border mb-3 ${colors[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}
