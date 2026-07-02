// @ts-nocheck
// Advanced POS features: split bill, merge, transfer, hold, multi-payment, refund, void
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { Order, OrderItem, Bill } from '@/types/database'
import { ArrowLeftRight, GitMerge, PauseCircle, PlayCircle, Receipt, Undo2, XCircle, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

// ─── SPLIT BILL ────────────────────────────────────────────────────
export function SplitBill({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const [items, setItems] = useState<OrderItem[]>([])
  const [splits, setSplits] = useState<{ person: string; itemIds: string[] }[]>([
    { person: 'Person 1', itemIds: [] },
    { person: 'Person 2', itemIds: [] },
  ])

  useEffect(() => {
    supabase.from('order_items').select('*').eq('order_id', orderId)
      .then(({ data }) => setItems(data || []))
  }, [orderId])

  function assignItem(itemId: string, personIdx: number) {
    setSplits(prev => prev.map((s, i) => ({
      ...s,
      itemIds: i === personIdx
        ? s.itemIds.includes(itemId) ? s.itemIds.filter(id => id !== itemId) : [...s.itemIds, itemId]
        : s.itemIds.filter(id => id !== itemId)
    })))
  }

  function addPerson() {
    setSplits(prev => [...prev, { person: `Person ${prev.length + 1}`, itemIds: [] }])
  }

  function getTotal(personIdx: number) {
    return splits[personIdx].itemIds.reduce((sum, id) => {
      const item = items.find(i => i.id === id)
      return sum + (item ? item.item_price * item.quantity : 0)
    }, 0)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center gap-3 p-4 border-b">
          <Receipt className="w-5 h-5 text-blue-600" />
          <h2 className="font-bold text-gray-900">Split Bill</h2>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600"><XCircle className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${splits.length}, 1fr)` }}>
            {splits.map((split, idx) => (
              <div key={idx} className="card-pad">
                <input className="input mb-3 text-sm" value={split.person}
                  onChange={e => setSplits(prev => prev.map((s, i) => i === idx ? { ...s, person: e.target.value } : s))} />
                <div className="space-y-2">
                  {items.map(item => (
                    <button key={item.id} onClick={() => assignItem(item.id, idx)}
                      className={clsx('w-full text-left p-2 rounded-lg text-xs border transition-all',
                        split.itemIds.includes(item.id) ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-gray-200 text-gray-600')}>
                      <span className="font-medium">{item.quantity}× {item.item_name}</span>
                      <span className="float-right">₹{(item.item_price * item.quantity).toFixed(0)}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t flex justify-between font-bold text-sm">
                  <span>{split.person}</span>
                  <span className="text-blue-600">₹{getTotal(idx).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 border-t flex gap-3">
          <button onClick={addPerson} className="btn-secondary flex-1">
            <Plus className="w-4 h-4" /> Add Person
          </button>
          <button onClick={() => { toast.success('Bills split! Print each separately.'); onClose() }} className="btn-primary flex-1">
            <Receipt className="w-4 h-4" /> Generate Split Bills
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── MERGE TABLES ──────────────────────────────────────────────────
export function MergeTables({ currentOrderId, onClose }: { currentOrderId: string; onClose: () => void }) {
  const [orders, setOrders] = useState<any[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('orders').select('*, dining_tables(name)')
      .in('status', ['open', 'kot_printed', 'served'])
      .neq('id', currentOrderId)
      .then(({ data }) => setOrders(data || []))
  }, [])

  async function merge() {
    if (!selected.length) { toast.error('Select tables to merge'); return }
    setLoading(true)
    for (const orderId of selected) {
      await (supabase.from('order_items') as any).update({ order_id: currentOrderId }).eq('order_id', orderId)
      await (supabase.from('orders') as any).update({ status: 'cancelled' }).eq('id', orderId)
    }
    toast.success('Tables merged!')
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center gap-3 p-4 border-b">
          <GitMerge className="w-5 h-5 text-purple-600" />
          <h2 className="font-bold text-gray-900">Merge Tables</h2>
          <button onClick={onClose} className="ml-auto text-gray-400"><XCircle className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-2">
          <p className="text-sm text-gray-500 mb-3">Select tables to merge into current order:</p>
          {orders.map(o => (
            <button key={o.id} onClick={() => setSelected(prev => prev.includes(o.id) ? prev.filter(id => id !== o.id) : [...prev, o.id])}
              className={clsx('w-full text-left p-3 rounded-xl border transition-all text-sm',
                selected.includes(o.id) ? 'border-purple-400 bg-purple-50' : 'border-gray-200')}>
              <span className="font-medium">Table {o.dining_tables?.name}</span>
              <span className="text-gray-500 ml-2">Order #{o.order_number}</span>
            </button>
          ))}
          {orders.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No other active orders</p>}
        </div>
        <div className="p-4 border-t flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={merge} disabled={loading || !selected.length} className="btn-primary flex-1">
            <GitMerge className="w-4 h-4" /> Merge
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── TRANSFER TABLE ────────────────────────────────────────────────
export function TransferTable({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const [tables, setTables] = useState<any[]>([])
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('dining_tables').select('*').eq('status', 'available').eq('is_active', true)
      .then(({ data }) => setTables(data || []))
  }, [])

  async function transfer() {
    if (!selected) { toast.error('Select a table'); return }
    await (supabase.from('orders') as any).update({ table_id: selected }).eq('id', orderId)
    await (supabase.from('dining_tables') as any).update({ status: 'occupied' }).eq('id', selected)
    toast.success('Order transferred!')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm">
        <div className="flex items-center gap-3 p-4 border-b">
          <ArrowLeftRight className="w-5 h-5 text-green-600" />
          <h2 className="font-bold text-gray-900">Transfer Table</h2>
          <button onClick={onClose} className="ml-auto text-gray-400"><XCircle className="w-5 h-5" /></button>
        </div>
        <div className="p-4">
          <p className="text-sm text-gray-500 mb-3">Move order to which available table?</p>
          <div className="grid grid-cols-3 gap-2">
            {tables.map(t => (
              <button key={t.id} onClick={() => setSelected(t.id)}
                className={clsx('p-3 rounded-xl border-2 text-sm font-bold transition-all',
                  selected === t.id ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-700')}>
                {t.name}
              </button>
            ))}
          </div>
        </div>
        <div className="p-4 border-t flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={transfer} disabled={!selected} className="btn-success flex-1">Transfer</button>
        </div>
      </div>
    </div>
  )
}

// ─── HOLD & RESUME ORDERS ──────────────────────────────────────────
export function useHoldOrders() {
  const HOLD_KEY = 'restaurantos_held_orders'

  function holdOrder(orderId: string, cart: any[], tableName: string) {
    const held = JSON.parse(localStorage.getItem(HOLD_KEY) || '[]')
    held.push({ orderId, cart, tableName, heldAt: new Date().toISOString() })
    localStorage.setItem(HOLD_KEY, JSON.stringify(held))
    toast.success(`Order held! You can resume it anytime.`)
  }

  function getHeldOrders() {
    return JSON.parse(localStorage.getItem(HOLD_KEY) || '[]')
  }

  function resumeOrder(orderId: string) {
    const held = JSON.parse(localStorage.getItem(HOLD_KEY) || '[]')
    const order = held.find((h: any) => h.orderId === orderId)
    const remaining = held.filter((h: any) => h.orderId !== orderId)
    localStorage.setItem(HOLD_KEY, JSON.stringify(remaining))
    return order
  }

  function removeHeld(orderId: string) {
    const held = JSON.parse(localStorage.getItem(HOLD_KEY) || '[]')
    localStorage.setItem(HOLD_KEY, JSON.stringify(held.filter((h: any) => h.orderId !== orderId)))
  }

  return { holdOrder, getHeldOrders, resumeOrder, removeHeld }
}

// ─── HELD ORDERS LIST ──────────────────────────────────────────────
export function HeldOrders({ onResume, onClose }: { onResume: (order: any) => void; onClose: () => void }) {
  const { getHeldOrders, removeHeld } = useHoldOrders()
  const held = getHeldOrders()

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm">
        <div className="flex items-center gap-3 p-4 border-b">
          <PauseCircle className="w-5 h-5 text-yellow-600" />
          <h2 className="font-bold text-gray-900">Held Orders ({held.length})</h2>
          <button onClick={onClose} className="ml-auto text-gray-400"><XCircle className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
          {held.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No orders on hold</p>
          ) : held.map((h: any) => (
            <div key={h.orderId} className="card p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-sm">{h.tableName}</span>
                <span className="text-xs text-gray-400">{new Date(h.heldAt).toLocaleTimeString()}</span>
              </div>
              <div className="text-xs text-gray-500 mb-3">{h.cart.length} items</div>
              <div className="flex gap-2">
                <button onClick={() => { onResume(h); onClose() }} className="btn-primary flex-1 text-xs py-1.5">
                  <PlayCircle className="w-3.5 h-3.5" /> Resume
                </button>
                <button onClick={() => removeHeld(h.orderId)} className="btn-danger text-xs py-1.5 px-3">
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── MULTI PAYMENT ─────────────────────────────────────────────────
export function MultiPayment({ total, onComplete, onClose }: {
  total: number; onComplete: (payments: { method: string; amount: number }[]) => void; onClose: () => void
}) {
  const [payments, setPayments] = useState<{ method: string; amount: number }[]>([
    { method: 'cash', amount: total }
  ])

  const paidTotal = payments.reduce((s, p) => s + p.amount, 0)
  const remaining = total - paidTotal

  function addPayment() {
    setPayments(prev => [...prev, { method: 'upi', amount: remaining > 0 ? remaining : 0 }])
  }

  function update(idx: number, field: 'method' | 'amount', value: any) {
    setPayments(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p))
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm">
        <div className="flex items-center gap-3 p-4 border-b">
          <Receipt className="w-5 h-5 text-blue-600" />
          <h2 className="font-bold text-gray-900">Split Payment</h2>
          <button onClick={onClose} className="ml-auto text-gray-400"><XCircle className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex justify-between text-sm mb-4">
            <span className="text-gray-500">Total bill</span>
            <span className="font-bold text-lg">₹{total.toFixed(2)}</span>
          </div>
          {payments.map((p, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <select className="input flex-1 text-sm"
                value={p.method} onChange={e => update(idx, 'method', e.target.value)}>
                <option value="cash">💵 Cash</option>
                <option value="upi">📱 UPI</option>
                <option value="card">💳 Card</option>
              </select>
              <input type="number" className="input w-28 text-sm"
                value={p.amount} onChange={e => update(idx, 'amount', +e.target.value)} />
              {payments.length > 1 && (
                <button onClick={() => setPayments(prev => prev.filter((_, i) => i !== idx))}
                  className="text-red-400 hover:text-red-600"><XCircle className="w-4 h-4" /></button>
              )}
            </div>
          ))}
          {remaining > 0 && (
            <div className="text-sm text-amber-600 font-medium">
              Remaining: ₹{remaining.toFixed(2)}
            </div>
          )}
          <button onClick={addPayment} className="btn-secondary w-full text-sm">
            <Plus className="w-4 h-4" /> Add Payment Mode
          </button>
        </div>
        <div className="p-4 border-t flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={() => remaining <= 0 ? onComplete(payments) : toast.error('Total must be fully covered')}
            disabled={remaining > 0}
            className="btn-success flex-1">
            Confirm Payment
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── REFUND & VOID ─────────────────────────────────────────────────
export function RefundVoid({ billId, onClose }: { billId: string; onClose: () => void }) {
  const { user } = useAuth()
  const [reason, setReason] = useState('')
  const [type, setType] = useState<'refund' | 'void'>('refund')
  const [loading, setLoading] = useState(false)

  async function process() {
    if (!reason.trim()) { toast.error('Enter reason'); return }
    setLoading(true)
    const { error } = await (supabase.from('bills') as any).update({ status: type === 'void' ? 'cancelled' : 'refunded' }).eq('id', billId)
    if (error) { toast.error('Failed'); setLoading(false); return }
    await supabase.from('inventory_logs').insert({
      item_id: billId, change_type: type, quantity: 0,
      notes: `${type.toUpperCase()} - ${reason}`, created_by: user?.id
    }).maybeSingle()
    toast.success(`Bill ${type}ed successfully!`)
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm">
        <div className="flex items-center gap-3 p-4 border-b">
          <Undo2 className="w-5 h-5 text-red-600" />
          <h2 className="font-bold text-gray-900">Refund / Void Bill</h2>
          <button onClick={onClose} className="ml-auto text-gray-400"><XCircle className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {(['refund', 'void'] as const).map(t => (
              <button key={t} onClick={() => setType(t)}
                className={clsx('p-3 rounded-xl border-2 text-sm font-medium capitalize transition-all',
                  type === t ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600')}>
                {t === 'refund' ? '↩️ Refund' : '❌ Void'}
              </button>
            ))}
          </div>
          <div>
            <label className="label">Reason *</label>
            <textarea className="input resize-none" rows={3} placeholder="Enter reason for refund/void"
              value={reason} onChange={e => setReason(e.target.value)} />
          </div>
          <div className="bg-red-50 rounded-xl p-3 text-sm text-red-700">
            {type === 'void' ? '⚠️ Void cancels the bill. No money returned.' : '⚠️ Refund returns money to customer.'}
          </div>
        </div>
        <div className="p-4 border-t flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={process} disabled={loading} className="btn-danger flex-1">
            {loading ? 'Processing...' : `Process ${type}`}
          </button>
        </div>
      </div>
    </div>
  )
}
