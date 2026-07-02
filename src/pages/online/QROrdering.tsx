// @ts-nocheck
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { QrCode, Hash, Volume2 } from 'lucide-react'

// ─── QR CODE ORDERING PAGE ─────────────────────────────────────────
export function QROrderPage() {
  const [tableId] = useState(() => new URLSearchParams(window.location.search).get('table') || '')
  const [tableName] = useState(() => new URLSearchParams(window.location.search).get('name') || 'Table')
  const [categories, setCategories] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [cart, setCart] = useState<any[]>([])
  const [activeCat, setActiveCat] = useState('All')
  const [placed, setPlaced] = useState(false)
  const [restaurant, setRestaurant] = useState<any>(null)

  useEffect(() => {
    Promise.all([
      supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('menu_items').select('*').eq('is_active', true).eq('is_available', true),
      supabase.from('restaurant').select('*').single(),
    ]).then(([cats, menu, rest]) => {
      setCategories(cats.data || [])
      setItems(menu.data || [])
      setRestaurant(rest.data)
    })
  }, [])

  function addToCart(item: any) {
    setCart(prev => {
      const ex = prev.find(c => c.id === item.id)
      if (ex) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { ...item, qty: 1 }]
    })
  }

  function updateQty(id: string, delta: number) {
    setCart(prev => prev.map(c => c.id === id ? { ...c, qty: c.qty + delta } : c).filter(c => c.qty > 0))
  }

  async function placeOrder() {
    if (!cart.length) return
    const { data: order } = await supabase.from('orders').insert({
      table_id: tableId || null,
      order_type: tableId ? 'dine_in' : 'takeaway',
      status: 'open',
    }).select().single()

    if (!order) return

    await supabase.from('order_items').insert(
      cart.map(c => ({ order_id: order.id, item_id: c.id, item_name: c.name, item_price: c.price, quantity: c.qty }))
    )
    await supabase.from('kot').insert({ order_id: order.id, items: cart.map(c => ({ name: c.name, quantity: c.qty })) })
    setPlaced(true)
  }

  const filtered = activeCat === 'All' ? items : items.filter(i => {
    const cat = categories.find(c => c.id === i.category_id)
    return cat?.name === activeCat
  })

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0)

  if (placed) return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="text-6xl mb-4">✅</div>
      <h1 className="text-2xl font-bold text-green-800">Order Placed!</h1>
      <p className="text-green-600 mt-2">Your order has been sent to the kitchen.</p>
      <p className="text-green-600">Please wait — we'll serve you shortly!</p>
      <button onClick={() => { setCart([]); setPlaced(false) }} className="mt-6 btn-success">Order More</button>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 text-center">
        <p className="font-bold text-lg">{restaurant?.name || 'Restaurant'}</p>
        <p className="text-blue-200 text-sm">{tableName}</p>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 p-3 overflow-x-auto bg-white border-b">
        {['All', ...categories.map(c => c.name)].map(cat => (
          <button key={cat} onClick={() => setActiveCat(cat)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium ${activeCat === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Items */}
      <div className="p-3 grid grid-cols-2 gap-3 pb-40">
        {filtered.map(item => {
          const inCart = cart.find(c => c.id === item.id)
          return (
            <div key={item.id} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-1.5 mb-2">
                <div className={`w-3 h-3 border-2 rounded-sm flex items-center justify-center ${item.food_type === 'veg' ? 'border-green-600' : 'border-red-600'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${item.food_type === 'veg' ? 'bg-green-600' : 'bg-red-600'}`} />
                </div>
                <p className="text-sm font-medium text-gray-900 leading-tight">{item.name}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="font-bold text-gray-900">₹{item.price}</p>
                {!inCart ? (
                  <button onClick={() => addToCart(item)} className="w-8 h-8 bg-blue-600 text-white rounded-lg text-lg flex items-center justify-center">+</button>
                ) : (
                  <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-2 py-1">
                    <button onClick={() => updateQty(item.id, -1)} className="text-blue-600 font-bold">−</button>
                    <span className="text-sm font-bold text-blue-700">{inCart.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="text-blue-600 font-bold">+</button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Cart bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
          <button onClick={placeOrder} className="btn-primary btn-lg w-full">
            Place Order · {cart.reduce((s, c) => s + c.qty, 0)} items · ₹{total.toFixed(0)}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── QR CODE GENERATOR (Admin) ─────────────────────────────────────
export function QRCodeGenerator() {
  const [tables, setTables] = useState<any[]>([])
  const baseUrl = window.location.origin

  useEffect(() => {
    supabase.from('dining_tables').select('*').eq('is_active', true).order('name')
      .then(({ data }) => setTables(data || []))
  }, [])

  function getQRUrl(table: any) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${baseUrl}/order?table=${table.id}&name=${table.name}`)}`
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <QrCode className="w-6 h-6 text-blue-600" />
        <div>
          <h1 className="text-lg font-bold text-gray-900">QR Code Ordering</h1>
          <p className="text-sm text-gray-500">Print and place on tables — customers scan to order</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {tables.map(table => (
          <div key={table.id} className="card p-4 text-center">
            <img src={getQRUrl(table)} alt={`QR for ${table.name}`} className="w-full rounded-lg mb-3" />
            <p className="font-bold text-gray-900">{table.name}</p>
            <p className="text-xs text-gray-500">{table.section}</p>
            <button onClick={() => window.open(getQRUrl(table), '_blank')} className="btn-secondary btn-sm w-full mt-2">
              Download
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── TOKEN DISPLAY SYSTEM ──────────────────────────────────────────
export function TokenDisplay() {
  const [readyTokens, setReadyTokens] = useState<number[]>([])
  const [preparingTokens, setPreparingTokens] = useState<number[]>([])

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('orders')
        .select('order_number, status')
        .in('status', ['kot_printed', 'served'])
        .order('created_at')
        .limit(20)
      setPreparingTokens(data?.filter(o => o.status === 'kot_printed').map(o => o.order_number) || [])
      setReadyTokens(data?.filter(o => o.status === 'served').map(o => o.order_number) || [])
    }
    load()
    const channel = supabase.channel('tokens')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  function announce(token: number) {
    if ('speechSynthesis' in window) {
      const msg = new SpeechSynthesisUtterance(`Token number ${token} please collect your order`)
      msg.lang = 'en-IN'
      window.speechSynthesis.speak(msg)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white">Order Ready</h1>
        <p className="text-gray-400 mt-1">{new Date().toLocaleTimeString()}</p>
      </div>

      {/* Ready tokens */}
      <div className="mb-8">
        <h2 className="text-green-400 font-bold text-lg mb-4 flex items-center gap-2">
          <Hash className="w-5 h-5" /> Ready to Collect
        </h2>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
          {readyTokens.map(token => (
            <button key={token} onClick={() => announce(token)}
              className="bg-green-500 text-white rounded-2xl p-4 text-3xl font-black text-center hover:bg-green-400 transition-all">
              {token}
              <div className="text-xs mt-1 font-normal opacity-80 flex items-center justify-center gap-1">
                <Volume2 className="w-3 h-3" /> Call
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Preparing tokens */}
      <div>
        <h2 className="text-yellow-400 font-bold text-lg mb-4 flex items-center gap-2">
          <Hash className="w-5 h-5" /> Preparing
        </h2>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
          {preparingTokens.map(token => (
            <div key={token} className="bg-yellow-900/50 border border-yellow-700 text-yellow-400 rounded-2xl p-4 text-3xl font-black text-center">
              {token}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
