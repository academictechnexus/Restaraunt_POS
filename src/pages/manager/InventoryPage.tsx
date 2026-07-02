// @ts-nocheck
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { InventoryItem } from '@/types/database'
import { Plus, AlertTriangle, Package, Edit2, Check, X } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editStock, setEditStock] = useState(0)
  const [form, setForm] = useState({ name: '', unit: 'kg', current_stock: 0, min_stock: 0, cost_per_unit: 0 })

  async function load() {
    const { data } = await supabase.from('inventory_items').select('*').eq('is_active', true).order('name')
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addItem() {
    if (!form.name.trim()) { toast.error('Enter item name'); return }
    const { error } = await supabase.from('inventory_items').insert(form)
    if (error) { toast.error('Failed to add'); return }
    toast.success('Item added!')
    setShowAdd(false)
    setForm({ name: '', unit: 'kg', current_stock: 0, min_stock: 0, cost_per_unit: 0 })
    load()
  }

  async function updateStock(id: string, newStock: number, changeType: 'add' | 'deduct' | 'adjust') {
    const { error } = await supabase.from('inventory_items').update({ current_stock: newStock }).eq('id', id)
    if (error) { toast.error('Failed to update'); return }
    await supabase.from('inventory_logs').insert({ item_id: id, change_type: changeType, quantity: newStock })
    toast.success('Stock updated!')
    setEditingId(null)
    load()
  }

  const lowStock = items.filter(i => i.current_stock <= i.min_stock)

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500">{items.length} items</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <p className="text-sm font-semibold text-red-700">{lowStock.length} item{lowStock.length > 1 ? 's' : ''} running low</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStock.map(i => (
              <span key={i.id} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-lg">
                {i.name} ({i.current_stock} {i.unit})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="card-pad space-y-3">
          <p className="font-semibold text-gray-900">Add Inventory Item</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Item Name</label>
              <input className="input" placeholder="e.g. Chicken, Rice, Oil" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Unit</label>
              <select className="input" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                {['kg', 'g', 'litre', 'ml', 'piece', 'dozen', 'pack', 'bottle'].map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Current Stock</label>
              <input className="input" type="number" value={form.current_stock} onChange={e => setForm({ ...form, current_stock: +e.target.value })} />
            </div>
            <div>
              <label className="label">Min Stock (alert level)</label>
              <input className="input" type="number" value={form.min_stock} onChange={e => setForm({ ...form, min_stock: +e.target.value })} />
            </div>
            <div>
              <label className="label">Cost per unit (₹)</label>
              <input className="input" type="number" value={form.cost_per_unit} onChange={e => setForm({ ...form, cost_per_unit: +e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addItem} className="btn-primary flex-1">Save Item</button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </div>
      )}

      {/* Items list */}
      {loading ? (
        <div className="space-y-3">
          {Array(5).fill(0).map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No inventory items yet</p>
          <p className="text-sm mt-1">Add items to track your stock</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => {
            const isLow = item.current_stock <= item.min_stock
            const isEditing = editingId === item.id
            return (
              <div key={item.id} className={clsx('card p-4 flex items-center gap-3', isLow && 'border-red-200')}>
                <div className={clsx('w-2 h-10 rounded-full flex-shrink-0', isLow ? 'bg-red-400' : 'bg-green-400')} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 truncate">{item.name}</p>
                    {isLow && <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Min: {item.min_stock} {item.unit}
                    {item.cost_per_unit ? ` · ₹${item.cost_per_unit}/${item.unit}` : ''}
                  </p>
                </div>

                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      className="input w-24 text-center"
                      value={editStock}
                      onChange={e => setEditStock(+e.target.value)}
                      autoFocus
                    />
                    <span className="text-xs text-gray-500">{item.unit}</span>
                    <button onClick={() => updateStock(item.id, editStock, 'adjust')} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-lg">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={clsx('font-bold text-lg', isLow ? 'text-red-600' : 'text-gray-900')}>
                        {item.current_stock}
                      </p>
                      <p className="text-xs text-gray-400">{item.unit}</p>
                    </div>
                    <button
                      onClick={() => { setEditingId(item.id); setEditStock(item.current_stock) }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
