import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Clock, CheckCircle2, ChefHat, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'
import toast from 'react-hot-toast'

interface KDSOrder {
  id: string
  order_number: number
  table_name: string
  order_type: string
  created_at: string
  items: { name: string; qty: number; notes?: string; status: string }[]
  elapsed: number
}

export default function KitchenDisplay() {
  const [orders, setOrders] = useState<KDSOrder[]>([])
  const [tick, setTick] = useState(0)

  async function loadOrders() {
    const { data: kotData } = await supabase
      .from('kot')
      .select('*, orders(order_number, order_type, created_at, dining_tables(name))')
      .order('printed_at', { ascending: true })
      .limit(20)

    const { data: activeOrders } = await supabase
      .from('orders')
      .select('id')
      .in('status', ['open', 'kot_printed'])

    const activeIds = new Set(activeOrders?.map(o => o.id) || [])

    const kdsOrders: KDSOrder[] = (kotData || [])
      .filter((k: any) => activeIds.has(k.order_id))
      .map((k: any) => ({
        id: k.id,
        order_id: k.order_id,
        order_number: k.orders?.order_number,
        table_name: k.orders?.dining_tables?.name || 'Takeaway',
        order_type: k.orders?.order_type,
        created_at: k.printed_at,
        items: k.items || [],
        elapsed: Math.floor((Date.now() - new Date(k.printed_at).getTime()) / 60000),
      }))

    setOrders(kdsOrders)
  }

  useEffect(() => {
    loadOrders()
    const channel = supabase.channel('kds')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kot' }, loadOrders)
      .subscribe()
    const interval = setInterval(() => setTick(t => t + 1), 30000)
    return () => { supabase.removeChannel(channel); clearInterval(interval) }
  }, [])

  async function markReady(kotId: string, orderId: string) {
    await supabase.from('orders').update({ status: 'served' }).eq('id', orderId)
    toast.success('Order marked as ready!')
    loadOrders()
  }

  function urgencyColor(elapsed: number) {
    if (elapsed < 10) return { card: 'border-green-200 bg-green-50', badge: 'bg-green-100 text-green-700' }
    if (elapsed < 20) return { card: 'border-yellow-200 bg-yellow-50', badge: 'bg-yellow-100 text-yellow-700' }
    return { card: 'border-red-300 bg-red-50', badge: 'bg-red-100 text-red-700' }
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ChefHat className="w-8 h-8 text-orange-400" />
          <div>
            <h1 className="text-xl font-bold text-white">Kitchen Display</h1>
            <p className="text-gray-400 text-sm">{orders.length} orders pending</p>
          </div>
        </div>
        <div className="text-white text-lg font-mono">
          {new Date().toLocaleTimeString()}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <CheckCircle2 className="w-16 h-16 mb-4 text-green-500 opacity-50" />
          <p className="text-xl font-medium text-gray-400">All caught up!</p>
          <p className="text-sm mt-2">No pending orders</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {orders.map(order => {
            const colors = urgencyColor(order.elapsed)
            return (
              <div key={order.id} className={clsx('border-2 rounded-2xl overflow-hidden', colors.card)}>
                {/* Card header */}
                <div className="p-3 border-b border-current/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-gray-900 text-lg">
                      {order.order_type === 'dine_in' ? `Table ${order.table_name}` : '🥡 Takeaway'}
                    </span>
                    <span className="font-bold text-gray-700">#{order.order_number}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1', colors.badge)}>
                      <Clock className="w-3 h-3" />
                      {order.elapsed} min
                    </span>
                    {order.elapsed >= 20 && (
                      <span className="text-xs text-red-600 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> URGENT
                      </span>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div className="p-3 space-y-2">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="font-bold text-gray-900 text-lg leading-none min-w-[28px]">{item.qty}×</span>
                      <div>
                        <p className="font-semibold text-gray-900">{item.name}</p>
                        {item.notes && <p className="text-xs text-gray-500 italic">* {item.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Ready button */}
                <div className="p-3 pt-0">
                  <button
                    onClick={() => markReady(order.id, (order as any).order_id)}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Mark Ready
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
