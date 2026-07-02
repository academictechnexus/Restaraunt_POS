// @ts-nocheck
import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { Category, MenuItem, Order, OrderItem } from '@/types/database'
import { Search, Plus, Minus, Trash2, Printer, ChevronRight, ArrowLeft } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'

export default function OrderScreen() {
  const navigate = useNavigate()
  const { id: orderId } = useParams()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  const tableId   = searchParams.get('table')
  const tableName = searchParams.get('tableName') || 'Takeaway'
  const orderType = searchParams.get('type') || 'dine_in'

  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [selectedCat, setSelectedCat] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<{ item: MenuItem; qty: number; notes?: string }[]>([])
  const [order, setOrder] = useState<Order | null>(null)
  const [existingItems, setExistingItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(false)
  const [showCart, setShowCart] = useState(false)

  // Load menu
  useEffect(() => {
    async function load() {
      const [catRes, itemRes] = await Promise.all([
        supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('menu_items').select('*,category:categories(*)').eq('is_active', true).eq('is_available', true)
      ])
      setCategories(catRes.data || [])
      setMenuItems(itemRes.data || [])
    }
    load()
  }, [])

  // Load existing order if editing
  useEffect(() => {
    if (!orderId) return
    async function loadOrder() {
      const { data: ord } = await supabase.from('orders').select('*').eq('id', orderId).single()
      const { data: items } = await supabase.from('order_items').select('*').eq('order_id', orderId)
      setOrder(ord)
      setExistingItems(items || [])
    }
    loadOrder()
  }, [orderId])

  const filteredItems = menuItems.filter(item => {
    const matchCat = selectedCat === 'all' || item.category_id === selectedCat
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  function addToCart(item: MenuItem) {
    setCart(prev => {
      const existing = prev.find(c => c.item.id === item.id)
      if (existing) return prev.map(c => c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { item, qty: 1 }]
    })
  }

  function updateQty(itemId: string, delta: number) {
    setCart(prev => prev
      .map(c => c.item.id === itemId ? { ...c, qty: c.qty + delta } : c)
      .filter(c => c.qty > 0)
    )
  }

  const cartTotal = cart.reduce((sum, c) => sum + c.item.price * c.qty, 0)
  const cartCount = cart.reduce((sum, c) => sum + c.qty, 0)

  async function placeOrderAndKOT() {
    if (cart.length === 0) { toast.error('Add items first'); return }
    setLoading(true)
    try {
      let currentOrderId = orderId

      // Create order if new
      if (!currentOrderId) {
        const { data: newOrder, error } = await supabase
          .from('orders')
          .insert({
            table_id: tableId || null,
            order_type: orderType as any,
            status: 'open',
            created_by: user?.id,
          })
          .select().single()
        if (error) throw error
        currentOrderId = newOrder.id

        // Mark table as occupied
        if (tableId) {
          await supabase.from('dining_tables').update({ status: 'occupied' }).eq('id', tableId)
        }
      }

      // Insert order items
      const { error: itemError } = await supabase.from('order_items').insert(
        cart.map(c => ({
          order_id: currentOrderId!,
          item_id: c.item.id,
          item_name: c.item.name,
          item_price: c.item.price,
          quantity: c.qty,
          notes: c.notes || null,
        }))
      )
      if (itemError) throw itemError

      // Create KOT record
      await supabase.from('kot').insert({
        order_id: currentOrderId!,
        items: cart.map(c => ({ name: c.item.name, quantity: c.qty, notes: c.notes })),
        printed_by: user?.id,
      })

      // Update order status
      await supabase.from('orders').update({ status: 'kot_printed' }).eq('id', currentOrderId!)

      // Print KOT
      printKOT(currentOrderId!, cart, tableName)

      toast.success('KOT sent to kitchen!')
      navigate(`/cashier/order/${currentOrderId}`)
      setCart([])
    } catch (err: any) {
      toast.error(err.message || 'Failed to place order')
    } finally {
      setLoading(false)
    }
  }

  function printKOT(orderId: string, items: typeof cart, table: string) {
    const win = window.open('', '_blank', 'width=300,height=500')
    if (!win) return
    win.document.write(`
      <html><head><title>KOT</title>
      <style>
        body { font-family: monospace; font-size: 14px; margin: 0; padding: 10px; width: 280px; }
        h2 { text-align:center; margin:0 0 4px; font-size:16px; }
        .sub { text-align:center; font-size:12px; margin-bottom:8px; }
        hr { border: 1px dashed #000; }
        table { width:100%; }
        td { padding: 3px 0; }
        .qty { width:30px; font-weight:bold; }
        .bold { font-weight:bold; }
      </style></head>
      <body>
      <h2>KITCHEN ORDER</h2>
      <div class="sub">${new Date().toLocaleString()}</div>
      <div class="sub bold">Table: ${table}</div>
      <hr>
      <table>
        ${items.map(c => `<tr><td class="qty">${c.qty}x</td><td>${c.item.name}</td></tr>${c.notes ? `<tr><td></td><td style="font-size:11px;color:#555">* ${c.notes}</td></tr>` : ''}`).join('')}
      </table>
      <hr>
      <div class="sub"># ${orderId.slice(-6).toUpperCase()}</div>
      </body></html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 300)
  }

  return (
    <div className="flex flex-col h-full md:flex-row">
      {/* Left — Menu */}
      <div className={clsx('flex-1 flex flex-col min-h-0', showCart && 'hidden md:flex')}>
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button onClick={() => navigate('/cashier')} className="p-1.5 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <p className="font-semibold text-gray-900">{orderId ? 'Add Items' : `New Order`}</p>
            <p className="text-xs text-gray-500">{tableName} · {orderType.replace('_', ' ')}</p>
          </div>
          {cartCount > 0 && (
            <button
              onClick={() => setShowCart(true)}
              className="ml-auto md:hidden flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-xl text-sm font-medium"
            >
              <span>{cartCount} items</span>
              <span>₹{cartTotal.toFixed(0)}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search */}
        <div className="px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              className="input pl-9"
              placeholder="Search menu items..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 px-4 py-2 overflow-x-auto bg-white border-b border-gray-100 flex-shrink-0 scroll-touch">
          <button
            onClick={() => setSelectedCat('all')}
            className={clsx('flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all',
              selectedCat === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600')}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              className={clsx('flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all',
                selectedCat === cat.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600')}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 scroll-touch">
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredItems.map(item => {
              const inCart = cart.find(c => c.item.id === item.id)
              return (
                <div key={item.id} className="card p-3 flex flex-col gap-2">
                  <div className="flex items-start gap-2">
                    {/* Veg/Non-veg indicator */}
                    <div className={clsx(
                      'mt-0.5 w-4 h-4 flex-shrink-0 border-2 rounded-sm flex items-center justify-center',
                      item.food_type === 'veg' ? 'border-green-600' : 'border-red-600'
                    )}>
                      <div className={clsx('w-2 h-2 rounded-full', item.food_type === 'veg' ? 'bg-green-600' : 'bg-red-600')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 leading-tight">{item.name}</p>
                      {item.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-1">
                    <p className="font-bold text-gray-900">₹{item.price}</p>
                    {!inCart ? (
                      <button onClick={() => addToCart(item)} className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95">
                        <Plus className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-2 py-1">
                        <button onClick={() => updateQty(item.id, -1)} className="text-blue-600 hover:text-blue-800">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-sm font-bold text-blue-700 min-w-[16px] text-center">{inCart.qty}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="text-blue-600 hover:text-blue-800">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Right — Cart */}
      <div className={clsx(
        'flex flex-col bg-white border-l border-gray-100',
        'md:w-80 md:flex-shrink-0',
        !showCart && 'hidden md:flex',
        showCart && 'flex flex-1 md:flex'
      )}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <button onClick={() => setShowCart(false)} className="md:hidden p-1.5 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <p className="font-semibold text-gray-900">Order — {tableName}</p>
          <span className="ml-auto text-sm text-gray-500">{cartCount} items</span>
        </div>

        {/* Existing items */}
        {existingItems.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-b">
            <p className="text-xs font-medium text-gray-500 mb-2">Already ordered</p>
            {existingItems.map(i => (
              <div key={i.id} className="flex justify-between text-sm py-1">
                <span className="text-gray-600">{i.quantity}× {i.item_name}</span>
                <span className="text-gray-900">₹{(i.quantity * i.item_price).toFixed(0)}</span>
              </div>
            ))}
          </div>
        )}

        {/* New cart items */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 scroll-touch">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <p className="text-sm">No items added yet</p>
              <p className="text-xs mt-1">Select items from the menu</p>
            </div>
          ) : (
            cart.map(c => (
              <div key={c.item.id} className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-2 py-1">
                  <button onClick={() => updateQty(c.item.id, -1)} className="text-gray-600 hover:text-red-600">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sm font-bold text-gray-900 min-w-[20px] text-center">{c.qty}</span>
                  <button onClick={() => updateQty(c.item.id, 1)} className="text-gray-600 hover:text-blue-600">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{c.item.name}</p>
                  <p className="text-xs text-gray-500">₹{c.item.price} each</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">₹{(c.item.price * c.qty).toFixed(0)}</p>
                </div>
                <button onClick={() => updateQty(c.item.id, -c.qty)} className="text-gray-300 hover:text-red-500 ml-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Total + KOT */}
        {cart.length > 0 && (
          <div className="p-4 border-t border-gray-100 space-y-3 safe-bottom">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal ({cartCount} items)</span>
              <span className="font-bold text-gray-900">₹{cartTotal.toFixed(2)}</span>
            </div>
            <button
              onClick={placeOrderAndKOT}
              disabled={loading}
              className="btn-primary btn-lg w-full"
            >
              <Printer className="w-5 h-5" />
              {loading ? 'Sending...' : 'Send KOT & Print'}
            </button>
          </div>
        )}

        {/* Bill button if existing order */}
        {orderId && existingItems.length > 0 && cart.length === 0 && (
          <div className="p-4 border-t border-gray-100 safe-bottom">
            <button
              onClick={() => navigate(`/cashier/bill/${orderId}`)}
              className="btn-success btn-lg w-full"
            >
              Generate Bill
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
