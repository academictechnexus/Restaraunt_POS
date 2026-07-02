// @ts-nocheck
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Order, OrderItem } from '@/types/database'
import { Clock, Users, ChevronRight, RefreshCw, Receipt } from 'lucide-react'
import clsx from 'clsx'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

interface OrderWithItems extends Order {
  items: OrderItem[]
  table_name?: string
}

const statusConfig = {
  open:        { label: 'Open',        bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200' },
  kot_printed: { label: 'In Kitchen',  bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  served:      { label: 'Served',      bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
  billed:      { label: 'Billed',      bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  paid:        { label: 'Paid',        bg: 'bg-gray-50',   text: 'text-gray-500',   border: 'border-gray-200' },
  cancelled:   { label: 'Cancelled',   bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200' },
}

export default function ActiveOrders() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tableFilter = searchParams.get('table')

  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('active')

  async function loadOrders() {
    setLoading(true)
    let query = supabase
      .from('orders')
      .select('*, dining_tables(name)')
      .order('created_at', { ascending: false })

    if (filter === 'active') {
      query = query.in('status', ['open', 'kot_printed', 'served'])
    } else if (filter === 'paid') {
      query = query.eq('status', 'paid')
    }

    if (tableFilter) query = query.eq('table_id', tableFilter)

    const { data: ordersData, error } = await query.limit(50)
    if (error) { toast.error('Failed to load orders'); setLoading(false); return }

    // Load items for each order
    const ordersWithItems = await Promise.all((ordersData || []).map(async (ord: any) => {
      const { data: items } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', ord.id)
        .neq('status', 'cancelled')
      return {
        ...ord,
        table_name: ord.dining_tables?.name,
        items: items || []
      }
    }))

    setOrders(ordersWithItems)
    setLoading(false)
  }

  useEffect(() => { loadOrders() }, [filter, tableFilter])

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('orders-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, loadOrders)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const totalRevenue = orders
    .filter(o => o.status === 'paid')
    .reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.item_price * i.quantity, 0), 0)

  return (
    <div className="p-4 max-w-3xl mx-auto">
      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {[
          { key: 'active', label: 'Active Orders' },
          { key: 'paid',   label: 'Paid Today' },
          { key: 'all',    label: 'All' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={clsx(
              'flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all',
              filter === f.key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200'
            )}
          >
            {f.label}
          </button>
        ))}
        <button onClick={loadOrders} className="ml-auto flex-shrink-0 p-2 rounded-full bg-white border border-gray-200 text-gray-500">
          <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="space-y-3">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No orders found</p>
          <p className="text-sm mt-1">Active orders will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const cfg = statusConfig[order.status]
            const runningTotal = order.items.reduce((s, i) => s + i.item_price * i.quantity, 0)
            return (
              <button
                key={order.id}
                onClick={() => navigate(
                  order.status === 'paid'
                    ? `/cashier/orders`
                    : `/cashier/order/${order.id}`
                )}
                className="w-full card p-4 text-left hover:shadow-md transition-all active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900">
                        {order.table_name ? `Table ${order.table_name}` : 'Takeaway'}
                      </span>
                      <span className={clsx('text-xs px-2 py-0.5 rounded-full border font-medium', cfg.bg, cfg.text, cfg.border)}>
                        {cfg.label}
                      </span>
                      <span className="text-xs text-gray-400 capitalize">
                        {order.order_type.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {order.guests} guest{order.guests > 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                      </span>
                    </div>

                    {/* Item summary */}
                    <p className="text-xs text-gray-400 mt-1.5 truncate">
                      {order.items.slice(0, 3).map(i => `${i.quantity}× ${i.item_name}`).join(', ')}
                      {order.items.length > 3 && ` +${order.items.length - 3} more`}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-gray-900 text-lg">₹{runningTotal.toFixed(0)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">#{order.order_number}</p>
                    {order.status !== 'paid' && (
                      <div className="flex items-center justify-end gap-1 mt-2 text-blue-600 text-xs font-medium">
                        <span>Open</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Bill button for served orders */}
                {order.status === 'served' && (
                  <button
                    onClick={e => { e.stopPropagation(); navigate(`/cashier/bill/${order.id}`) }}
                    className="mt-3 w-full btn-success text-sm py-2 rounded-xl"
                  >
                    Generate Bill
                  </button>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
