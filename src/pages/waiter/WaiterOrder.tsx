// @ts-nocheck
import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { ArrowLeft, Search, Plus, Minus, Printer, ClipboardList, ChefHat } from 'lucide-react'
import toast from 'react-hot-toast'

export default function WaiterOrder() {
  const navigate = useNavigate()
  const { id: orderId } = useParams()
  const [sp] = useSearchParams()
  const { user } = useAuth()

  const tableId   = sp.get('table')
  const tableName = sp.get('tableName') || 'Table'
  const orderType = sp.get('type') || 'dine_in'

  const [tab, setTab]       = useState('menu')
  const [cats, setCats]     = useState([])
  const [items, setItems]   = useState([])
  const [activeCat, setActiveCat] = useState('all')
  const [search, setSearch] = useState('')
  const [cart, setCart]     = useState([])
  const [existing, setExisting] = useState([])
  const [kots, setKots]     = useState([])
  const [order, setOrder]   = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('categories').select('*').eq('is_active', true).order('sort_order').then(({ data }) => setCats(data || []))
    supabase.from('menu_items').select('*').eq('is_active', true).eq('is_available', true).then(({ data }) => setItems(data || []))
    if (orderId) loadOrder()
  }, [orderId])

  async function loadOrder() {
    const [o, i, k] = await Promise.all([
      supabase.from('orders').select('*').eq('id', orderId).single(),
      supabase.from('order_items').select('*').eq('order_id', orderId).neq('status', 'cancelled'),
      supabase.from('kot').select('*').eq('order_id', orderId).order('printed_at'),
    ])
    setOrder(o.data); setExisting(i.data || []); setKots(k.data || [])
  }

  // Realtime
  useEffect(() => {
    if (!orderId) return
    const ch = supabase.channel(`wo-${orderId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items', filter: `order_id=eq.${orderId}` }, loadOrder)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [orderId])

  const add = (item) => setCart(p => { const e = p.find(c => c.id === item.id); return e ? p.map(c => c.id === item.id ? { ...c, qty: c.qty+1 } : c) : [...p, { ...item, qty: 1, notes: '' }] })
  const upd = (id, d) => setCart(p => p.map(c => c.id === id ? { ...c, qty: c.qty+d } : c).filter(c => c.qty > 0))
  const note = (id, n) => setCart(p => p.map(c => c.id === id ? { ...c, notes: n } : c))

  const filtered = items.filter(i => (activeCat === 'all' || i.category_id === activeCat) && i.name.toLowerCase().includes(search.toLowerCase()))
  const cartTotal = cart.reduce((s, c) => s + c.price * c.qty, 0)
  const cartCount = cart.reduce((s, c) => s + c.qty, 0)

  function printKOT(oId, cartItems, tName, num) {
    const w = window.open('', '_blank', 'width=300,height=500')
    if (!w) return
    w.document.write(`<!DOCTYPE html><html><head><title>KOT</title>
    <style>body{font-family:monospace;font-size:13px;padding:10px;width:280px}
    h2{text-align:center;margin:0;font-size:15px}.sub{text-align:center;font-size:11px}
    hr{border:1px dashed #000;margin:5px 0}.row{display:flex;padding:2px 0}
    .qty{font-weight:700;min-width:28px}.note{font-size:10px;color:#666;padding-left:28px}</style>
    </head><body>
    <h2>🍽 KITCHEN ORDER</h2>
    <div class="sub">${new Date().toLocaleString('en-IN')}</div>
    <div class="sub" style="font-weight:700;font-size:14px">Table: ${tName} · KOT #${num}</div>
    <hr>
    ${cartItems.map(i => `<div class="row"><span class="qty">${i.qty}×</span><span>${i.name || i.item_name}</span></div>${(i.notes||'') ? `<div class="note">* ${i.notes}</div>` : ''}`).join('')}
    <hr><div class="sub">Order #${oId.slice(-6).toUpperCase()}</div>
    </body></html>`)
    w.document.close(); w.focus()
    setTimeout(() => { w.print(); w.close() }, 300)
  }

  async function sendKOT() {
    if (!cart.length) { toast.error('Add items first'); return }
    setLoading(true)
    try {
      let oid = orderId
      if (!oid) {
        const { data: no, error } = await supabase.from('orders').insert({
          table_id: tableId || null, order_type: orderType,
          status: 'open', created_by: user?.id,
        }).select().single()
        if (error) throw error
        oid = no.id
        if (tableId) await supabase.from('dining_tables').update({ status: 'occupied' }).eq('id', tableId)
      }
      await supabase.from('order_items').insert(cart.map(c => ({
        order_id: oid, item_id: c.id, item_name: c.name,
        item_price: c.price, quantity: c.qty, notes: c.notes || null, status: 'pending',
      })))
      await supabase.from('kot').insert({ order_id: oid, items: cart.map(c => ({ name: c.name, quantity: c.qty, notes: c.notes })), printed_by: user?.id })
      await supabase.from('orders').update({ status: 'kot_printed' }).eq('id', oid)
      const kotNum = kots.length + 1
      printKOT(oid, cart, tableName, kotNum)
      toast.success(`✅ KOT #${kotNum} sent to kitchen!`)
      setCart([])
      if (!orderId) navigate(`/waiter/order/${oid}?table=${tableId}&tableName=${tableName}`, { replace: true })
      else loadOrder()
    } catch (err) {
      toast.error(err.message || 'Failed to send KOT')
    } finally { setLoading(false) }
  }

  const vegColor = { veg: '#16a34a', non_veg: '#dc2626', egg: '#d97706' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f9fafb', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#059669', padding: '12px 14px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <button onClick={() => navigate('/waiter')} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: 'white', display: 'flex' }}>
            <ArrowLeft size={18} />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>Table {tableName}</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{existing.length} items ordered · {kots.length} KOTs sent</div>
          </div>
          {cartCount > 0 && (
            <div style={{ background: '#dc2626', color: 'white', borderRadius: 20, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}>
              {cartCount} new
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { k: 'menu', label: '🍽 Menu', },
            { k: 'orders', label: `📋 Orders (${existing.length})` },
          ].map(t => (
            <button key={t.k} onClick={() => setTab(t.k)}
              style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: tab === t.k ? 'white' : 'rgba(255,255,255,0.2)', color: tab === t.k ? '#059669' : 'white' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'orders' ? (
        /* Orders & KOT view */
        <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
          {existing.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
              <ChefHat size={48} style={{ margin: '0 auto 12px', opacity: 0.3, display: 'block' }} />
              <p>No orders sent yet for this table</p>
            </div>
          ) : (
            <div>
              <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e5e7eb', marginBottom: 12, overflow: 'hidden' }}>
                <div style={{ background: '#f9fafb', padding: '10px 14px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: '#374151' }}>All Items Ordered</span>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>{existing.length} items</span>
                </div>
                {existing.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid #f9fafb' }}>
                    <span style={{ fontWeight: 700, color: '#374151', minWidth: 28 }}>{item.quantity}×</span>
                    <span style={{ flex: 1, fontSize: 13, color: '#111827' }}>{item.item_name}</span>
                    {item.notes && <span style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>{item.notes}</span>}
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500,
                      background: item.status==='pending' ? '#fef9c3' : item.status==='preparing' ? '#dbeafe' : item.status==='ready' ? '#dcfce7' : '#f3f4f6',
                      color: item.status==='pending' ? '#854d0e' : item.status==='preparing' ? '#1e40af' : item.status==='ready' ? '#166534' : '#6b7280',
                    }}>{item.status}</span>
                  </div>
                ))}
              </div>

              {/* KOT history */}
              {kots.map((k, i) => (
                <div key={k.id} style={{ background: '#fff7ed', borderRadius: 14, border: '1px solid #fed7aa', marginBottom: 10, overflow: 'hidden' }}>
                  <div style={{ padding: '8px 14px', borderBottom: '1px solid #fed7aa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#c2410c' }}>KOT #{i+1}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#9a3412' }}>{new Date(k.printed_at).toLocaleTimeString('en-IN')}</span>
                      <button onClick={() => printKOT(k.order_id, k.items || [], tableName, i+1)}
                        style={{ background: '#c2410c', color: 'white', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Printer size={12} /> Reprint
                      </button>
                    </div>
                  </div>
                  {(k.items || []).map((it, j) => (
                    <div key={j} style={{ padding: '6px 14px', fontSize: 13, color: '#374151' }}>
                      {it.quantity}× {it.name}{it.notes ? ` — ${it.notes}` : ''}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Menu view */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* Search */}
          <div style={{ padding: '10px 14px', background: 'white', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search menu..."
                style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>

          {/* Category tabs */}
          <div style={{ display: 'flex', gap: 6, padding: '8px 14px', overflowX: 'auto', background: 'white', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
            {['all', ...cats.map(c => c.id)].map((cid, i) => {
              const label = cid === 'all' ? 'All' : cats.find(c => c.id === cid)?.name
              return (
                <button key={cid} onClick={() => setActiveCat(cid)}
                  style={{ flexShrink: 0, padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, background: activeCat === cid ? '#059669' : '#f3f4f6', color: activeCat === cid ? 'white' : '#6b7280' }}>
                  {label}
                </button>
              )
            })}
          </div>

          {/* Items */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {filtered.map(item => {
                const inCart = cart.find(c => c.id === item.id)
                return (
                  <div key={item.id} style={{ background: 'white', borderRadius: 12, padding: 12, border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <div style={{ width: 12, height: 12, border: `2px solid ${vegColor[item.food_type] || '#6b7280'}`, borderRadius: 2, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: vegColor[item.food_type] }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#111827', lineHeight: 1.3 }}>{item.name}</span>
                    </div>
                    {item.description && <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 6, lineHeight: 1.4 }}>{item.description}</div>}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>₹{item.price}</span>
                      {!inCart ? (
                        <button onClick={() => add(item)}
                          style={{ width: 30, height: 30, background: '#059669', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Plus size={16} />
                        </button>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0fdf4', borderRadius: 8, padding: '3px 8px' }}>
                          <button onClick={() => upd(item.id, -1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#059669', display: 'flex' }}><Minus size={14} /></button>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#059669', minWidth: 16, textAlign: 'center' }}>{inCart.qty}</span>
                          <button onClick={() => upd(item.id, 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#059669', display: 'flex' }}><Plus size={14} /></button>
                        </div>
                      )}
                    </div>
                    {inCart && (
                      <input value={inCart.notes || ''} onChange={e => note(item.id, e.target.value)}
                        placeholder="Special note..." maxLength={50}
                        style={{ marginTop: 8, width: '100%', padding: '5px 8px', fontSize: 11, border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none', boxSizing: 'border-box', color: '#374151' }} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Send KOT bar */}
          {cart.length > 0 && (
            <div style={{ background: 'white', borderTop: '1px solid #e5e7eb', padding: 14, flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10, color: '#6b7280' }}>
                <span>{cartCount} new items to send</span>
                <span style={{ fontWeight: 700, color: '#111827' }}>₹{cartTotal.toFixed(0)}</span>
              </div>
              <button onClick={sendKOT} disabled={loading}
                style={{ width: '100%', padding: 14, background: loading ? '#6ee7b7' : '#059669', color: 'white', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Printer size={20} />
                {loading ? 'Sending to Kitchen...' : `Send KOT to Kitchen`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
