// @ts-nocheck
import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Search, Plus, Minus, Trash2, Printer, ArrowLeft, ChefHat, CheckCircle2, AlertCircle } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'

export default function WaiterOrderScreen() {
  const navigate = useNavigate()
  const { id: orderId } = useParams()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  const tableId   = searchParams.get('table')
  const tableName = searchParams.get('tableName') || 'Table'

  const [categories, setCategories]     = useState([])
  const [menuItems, setMenuItems]       = useState([])
  const [activeCat, setActiveCat]       = useState('all')
  const [search, setSearch]             = useState('')
  const [cart, setCart]                 = useState([])
  const [existingItems, setExistingItems] = useState([])
  const [kots, setKots]                 = useState([])
  const [order, setOrder]               = useState(null)
  const [loading, setLoading]           = useState(false)
  const [tab, setTab]                   = useState('menu') // menu | kot

  useEffect(() => {
    loadMenu()
    if (orderId) loadOrder()
  }, [orderId])

  async function loadMenu() {
    const [catRes, itemRes] = await Promise.all([
      supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('menu_items').select('*').eq('is_active', true).eq('is_available', true)
    ])
    setCategories(catRes.data || [])
    setMenuItems(itemRes.data || [])
  }

  async function loadOrder() {
    const { data: ord } = await supabase.from('orders').select('*').eq('id', orderId).single()
    const { data: items } = await supabase.from('order_items').select('*').eq('order_id', orderId).neq('status', 'cancelled')
    const { data: kotData } = await supabase.from('kot').select('*').eq('order_id', orderId).order('printed_at')
    setOrder(ord)
    setExistingItems(items || [])
    setKots(kotData || [])
  }

  // Realtime updates
  useEffect(() => {
    if (!orderId) return
    const channel = supabase.channel(`order-${orderId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items', filter: `order_id=eq.${orderId}` }, loadOrder)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kot', filter: `order_id=eq.${orderId}` }, loadOrder)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [orderId])

  function addToCart(item) {
    setCart(prev => {
      const ex = prev.find(c => c.id === item.id)
      if (ex) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { ...item, qty: 1, notes: '' }]
    })
  }

  function updateQty(id, delta) {
    setCart(prev => prev.map(c => c.id === id ? { ...c, qty: c.qty + delta } : c).filter(c => c.qty > 0))
  }

  function updateNotes(id, notes) {
    setCart(prev => prev.map(c => c.id === id ? { ...c, notes } : c))
  }

  const filtered = menuItems.filter(i => {
    const matchCat  = activeCat === 'all' || i.category_id === activeCat
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const cartTotal = cart.reduce((s, c) => s + c.price * c.qty, 0)
  const cartCount = cart.reduce((s, c) => s + c.qty, 0)

  async function sendKOT() {
    if (!cart.length) { toast.error('Add items first'); return }
    setLoading(true)
    try {
      let currentOrderId = orderId

      if (!currentOrderId) {
        const { data: newOrder, error } = await supabase.from('orders').insert({
          table_id: tableId || null,
          order_type: tableId ? 'dine_in' : 'takeaway',
          status: 'open',
          created_by: user?.id,
        }).select().single()
        if (error) throw error
        currentOrderId = newOrder.id
        if (tableId) await supabase.from('dining_tables').update({ status: 'occupied' }).eq('id', tableId)
      }

      // Insert new order items
      await supabase.from('order_items').insert(
        cart.map(c => ({
          order_id: currentOrderId,
          item_id: c.id,
          item_name: c.name,
          item_price: c.price,
          quantity: c.qty,
          notes: c.notes || null,
          status: 'pending',
        }))
      )

      // Create KOT record
      const kotNumber = kots.length + 1
      await supabase.from('kot').insert({
        order_id: currentOrderId,
        items: cart.map(c => ({ name: c.name, quantity: c.qty, notes: c.notes })),
        printed_by: user?.id,
      })

      // Update order status
      await supabase.from('orders').update({ status: 'kot_printed' }).eq('id', currentOrderId)

      // Print KOT
      printKOT(currentOrderId, cart, tableName, kotNumber)

      toast.success(`KOT #${kotNumber} sent to kitchen!`)
      setCart([])
      if (!orderId) navigate(`/cashier/order/${currentOrderId}?tableName=${tableName}`)
      else loadOrder()
    } catch (err) {
      toast.error(err.message || 'Failed to send KOT')
    } finally {
      setLoading(false)
    }
  }

  function printKOT(orderId, items, table, kotNum) {
    const win = window.open('', '_blank', 'width=300,height=500')
    if (!win) return
    win.document.write(`
      <html><head><title>KOT</title>
      <style>
        body{font-family:monospace;font-size:13px;margin:0;padding:10px;width:280px}
        h2{text-align:center;margin:0 0 4px;font-size:15px}
        .sub{text-align:center;font-size:11px;margin-bottom:6px}
        hr{border:1px dashed #000;margin:6px 0}
        .row{display:flex;justify-content:space-between;padding:2px 0}
        .qty{font-weight:bold;min-width:30px}
        .note{font-size:10px;color:#555;padding-left:30px}
      </style></head><body>
      <h2>🍽 KITCHEN ORDER</h2>
      <div class="sub">${new Date().toLocaleString('en-IN')}</div>
      <div class="sub" style="font-weight:bold;font-size:14px">Table: ${table} · KOT #${kotNum}</div>
      <hr>
      ${items.map(i => `
        <div class="row"><span class="qty">${i.qty}×</span><span>${i.name}</span></div>
        ${i.notes ? `<div class="note">* ${i.notes}</div>` : ''}
      `).join('')}
      <hr>
      <div class="sub">Order ID: ${orderId.slice(-6).toUpperCase()}</div>
      </body></html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 300)
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-600 text-white px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button onClick={() => navigate(-1)} className="p-1 rounded-lg bg-white/20">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <p className="font-bold text-sm">Table {tableName}</p>
          <p className="text-xs text-green-200">
            {existingItems.length} items ordered · {kots.length} KOTs sent
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab('menu')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${tab === 'menu' ? 'bg-white text-green-700' : 'bg-white/20 text-white'}`}
          >
            Menu
          </button>
          <button
            onClick={() => setTab('kot')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium relative ${tab === 'kot' ? 'bg-white text-green-700' : 'bg-white/20 text-white'}`}
          >
            KOTs
            {kots.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                {kots.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {tab === 'kot' ? (
        /* KOT View */
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* All items ordered */}
          {existingItems.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b text-sm font-semibold text-gray-700 flex items-center gap-2">
                <ChefHat className="w-4 h-4 text-orange-500" />
                All Items Ordered
              </div>
              {existingItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50">
                  <span className="font-bold text-gray-700 min-w-[28px]">{item.quantity}×</span>
                  <span className="flex-1 text-sm text-gray-900">{item.item_name}</span>
                  {item.notes && <span className="text-xs text-gray-400 italic">{item.notes}</span>}
                  <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', {
                    'bg-yellow-100 text-yellow-700': item.status === 'pending',
                    'bg-blue-100 text-blue-700': item.status === 'preparing',
                    'bg-green-100 text-green-700': item.status === 'ready',
                    'bg-gray-100 text-gray-500': item.status === 'served',
                  })}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* KOT history */}
          {kots.map((kot, i) => (
            <div key={kot.id} className="card overflow-hidden">
              <div className="px-4 py-3 bg-orange-50 border-b text-sm font-semibold text-orange-700 flex items-center justify-between">
                <span>KOT #{i + 1}</span>
                <span className="text-xs text-orange-500">{new Date(kot.printed_at).toLocaleTimeString('en-IN')}</span>
              </div>
              {kot.items?.map((item, j) => (
                <div key={j} className="flex items-center gap-3 px-4 py-2 border-b border-gray-50 text-sm">
                  <span className="font-bold text-gray-700 min-w-[28px]">{item.quantity}×</span>
                  <span className="flex-1 text-gray-900">{item.name}</span>
                  {item.notes && <span className="text-xs text-gray-400 italic">{item.notes}</span>}
                </div>
              ))}
              <button
                onClick={() => printKOT(kot.order_id, kot.items, tableName, i + 1)}
                className="w-full text-center py-2 text-xs text-orange-600 font-medium hover:bg-orange-50 flex items-center justify-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" /> Reprint KOT #{i + 1}
              </button>
            </div>
          ))}

          {existingItems.length === 0 && kots.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <ChefHat className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No orders yet for this table</p>
            </div>
          )}

          {/* Generate bill button */}
          {existingItems.length > 0 && orderId && (
            <button
              onClick={() => navigate(`/cashier/bill/${orderId}`)}
              className="btn-success btn-lg w-full"
            >
              <CheckCircle2 className="w-5 h-5" />
              Generate Invoice
            </button>
          )}
        </div>
      ) : (
        /* Menu View */
        <div className="flex flex-col flex-1 min-h-0">
          {/* Search */}
          <div className="px-4 py-2 bg-white border-b flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input className="input pl-9 text-sm" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 px-4 py-2 overflow-x-auto bg-white border-b flex-shrink-0">
            <button onClick={() => setActiveCat('all')} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${activeCat === 'all' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>All</button>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setActiveCat(cat.id)} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${activeCat === cat.id ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {cat.name}
              </button>
            ))}
          </div>

          {/* Items grid */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {filtered.map(item => {
                const inCart = cart.find(c => c.id === item.id)
                return (
                  <div key={item.id} className="card p-3 flex flex-col gap-2">
                    <div className="flex items-start gap-1.5">
                      <div className={`mt-0.5 w-3 h-3 flex-shrink-0 border-2 rounded-sm ${item.food_type === 'veg' ? 'border-green-600' : 'border-red-600'}`}>
                        <div className={`w-full h-full rounded-sm ${item.food_type === 'veg' ? 'bg-green-600' : 'bg-red-600'}`} style={{ transform: 'scale(0.5)' }} />
                      </div>
                      <p className="text-xs font-medium text-gray-900 leading-tight">{item.name}</p>
                    </div>
                    <div className="flex items-center justify-between mt-auto">
                      <p className="text-sm font-bold text-gray-900">₹{item.price}</p>
                      {!inCart ? (
                        <button onClick={() => addToCart(item)} className="w-7 h-7 bg-green-600 text-white rounded-lg flex items-center justify-center active:scale-95">
                          <Plus className="w-4 h-4" />
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-green-50 rounded-lg px-2 py-1">
                          <button onClick={() => updateQty(item.id, -1)} className="text-green-600"><Minus className="w-3 h-3" /></button>
                          <span className="text-xs font-bold text-green-700 min-w-[16px] text-center">{inCart.qty}</span>
                          <button onClick={() => updateQty(item.id, 1)} className="text-green-600"><Plus className="w-3 h-3" /></button>
                        </div>
                      )}
                    </div>
                    {inCart && (
                      <input
                        type="text"
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 w-full"
                        placeholder="Special note..."
                        value={inCart.notes || ''}
                        onChange={e => updateNotes(item.id, e.target.value)}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Cart summary + Send KOT */}
          {cart.length > 0 && (
            <div className="p-3 bg-white border-t safe-bottom flex-shrink-0">
              <div className="flex items-center justify-between text-sm mb-3">
                <span className="text-gray-600">{cartCount} new items</span>
                <span className="font-bold text-gray-900">₹{cartTotal.toFixed(0)}</span>
              </div>
              <button onClick={sendKOT} disabled={loading} className="btn-success btn-lg w-full">
                <Printer className="w-5 h-5" />
                {loading ? 'Sending...' : `Send KOT to Kitchen`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
