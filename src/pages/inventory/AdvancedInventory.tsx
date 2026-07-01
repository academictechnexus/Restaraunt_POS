import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Package, Truck, ClipboardCheck, BookOpen, Trash2, Plus, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function AdvancedInventory() {
  const [tab, setTab] = useState<'stock' | 'suppliers' | 'po' | 'grn' | 'recipes' | 'wastage'>('stock')

  const tabs = [
    { key: 'stock',     label: 'Stock',     icon: Package },
    { key: 'suppliers', label: 'Suppliers', icon: Truck },
    { key: 'po',        label: 'Purchase Orders', icon: ClipboardCheck },
    { key: 'grn',       label: 'GRN',       icon: ClipboardCheck },
    { key: 'recipes',   label: 'Recipes',   icon: BookOpen },
    { key: 'wastage',   label: 'Wastage',   icon: Trash2 },
  ]

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-lg font-bold text-gray-900 mb-4">Advanced Inventory</h1>
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key as any)}
            className={clsx('flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium transition-all',
              tab === key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200')}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>
      {tab === 'stock'     && <StockManagement />}
      {tab === 'suppliers' && <SupplierManagement />}
      {tab === 'po'        && <PurchaseOrders />}
      {tab === 'grn'       && <GoodsReceived />}
      {tab === 'recipes'   && <RecipeManagement />}
      {tab === 'wastage'   && <WastageTracking />}
    </div>
  )
}

// ─── STOCK ─────────────────────────────────────────────────────────
function StockManagement() {
  const [items, setItems] = useState<any[]>([])

  useEffect(() => {
    supabase.from('inventory_items').select('*').eq('is_active', true).order('name')
      .then(({ data }) => setItems(data || []))
  }, [])

  const lowStock = items.filter(i => i.current_stock <= i.min_stock)

  return (
    <div className="space-y-4">
      {lowStock.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <p className="font-semibold text-red-700">{lowStock.length} items low on stock</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStock.map(i => (
              <span key={i.id} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-lg">
                {i.name} — {i.current_stock} {i.unit} left
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-2">
        {items.map(item => {
          const pct = Math.min(100, (item.current_stock / Math.max(item.min_stock * 3, 1)) * 100)
          const isLow = item.current_stock <= item.min_stock
          return (
            <div key={item.id} className="card p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-2 h-10 rounded-full flex-shrink-0 ${isLow ? 'bg-red-400' : 'bg-green-400'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className={`font-bold text-lg ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                      {item.current_stock} {item.unit}
                    </p>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full mt-2">
                    <div className={`h-full rounded-full ${isLow ? 'bg-red-400' : 'bg-green-400'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Min: {item.min_stock} {item.unit}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── SUPPLIERS ─────────────────────────────────────────────────────
function SupplierManagement() {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', gst: '' })

  async function load() {
    const { data } = await supabase.from('suppliers').select('*').order('name')
    setSuppliers(data || [])
  }

  useEffect(() => { load() }, [])

  async function save() {
    if (!form.name) { toast.error('Supplier name required'); return }
    const { error } = await supabase.from('suppliers').insert(form)
    if (error) { toast.error('Failed'); return }
    toast.success('Supplier added!'); setShowAdd(false); load()
    setForm({ name: '', phone: '', email: '', address: '', gst: '' })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Supplier</button>
      </div>
      {showAdd && (
        <div className="card-pad space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="label">Supplier Name *</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div><label className="label">Email</label><input className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div className="col-span-2"><label className="label">Address</label><input className="input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
            <div><label className="label">GSTIN</label><input className="input" value={form.gst} onChange={e => setForm({ ...form, gst: e.target.value })} /></div>
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="btn-primary flex-1">Save</button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {suppliers.map(s => (
          <div key={s.id} className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold">{s.name[0]}</div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{s.name}</p>
                <p className="text-xs text-gray-500">{s.phone} · {s.email}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── PURCHASE ORDERS ───────────────────────────────────────────────
function PurchaseOrders() {
  const [pos, setPOs] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ supplier_id: '', expected_date: '', lines: [{ item_id: '', qty: 0, unit_price: 0 }] })

  async function load() {
    const [poRes, supRes, itemRes] = await Promise.all([
      supabase.from('purchase_orders').select('*, suppliers(name)').order('created_at', { ascending: false }),
      supabase.from('suppliers').select('id, name'),
      supabase.from('inventory_items').select('id, name, unit'),
    ])
    setPOs(poRes.data || [])
    setSuppliers(supRes.data || [])
    setItems(itemRes.data || [])
  }

  useEffect(() => { load() }, [])

  function addLine() {
    setForm(f => ({ ...f, lines: [...f.lines, { item_id: '', qty: 0, unit_price: 0 }] }))
  }

  async function createPO() {
    if (!form.supplier_id) { toast.error('Select supplier'); return }
    const total = form.lines.reduce((s, l) => s + l.qty * l.unit_price, 0)
    const { error } = await supabase.from('purchase_orders').insert({
      supplier_id: form.supplier_id,
      expected_date: form.expected_date || null,
      lines: form.lines,
      total_amount: total,
      status: 'pending',
    })
    if (error) { toast.error('Failed'); return }
    toast.success('Purchase order created!'); setShowAdd(false); load()
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    received: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4" /> New PO</button>
      </div>
      {showAdd && (
        <div className="card-pad space-y-4">
          <p className="font-semibold">New Purchase Order</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Supplier *</label>
              <select className="input" value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })}>
                <option value="">Select supplier</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div><label className="label">Expected delivery</label>
              <input type="date" className="input" value={form.expected_date} onChange={e => setForm({ ...form, expected_date: e.target.value })} /></div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Items</p>
            {form.lines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-3 gap-2">
                <select className="input text-sm col-span-1" value={line.item_id}
                  onChange={e => setForm(f => ({ ...f, lines: f.lines.map((l, i) => i === idx ? { ...l, item_id: e.target.value } : l) }))}>
                  <option value="">Select item</option>
                  {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                </select>
                <input type="number" placeholder="Qty" className="input text-sm"
                  value={line.qty || ''} onChange={e => setForm(f => ({ ...f, lines: f.lines.map((l, i) => i === idx ? { ...l, qty: +e.target.value } : l) }))} />
                <input type="number" placeholder="Unit price ₹" className="input text-sm"
                  value={line.unit_price || ''} onChange={e => setForm(f => ({ ...f, lines: f.lines.map((l, i) => i === idx ? { ...l, unit_price: +e.target.value } : l) }))} />
              </div>
            ))}
            <button onClick={addLine} className="btn-secondary btn-sm">+ Add item</button>
          </div>
          <div className="flex gap-2">
            <button onClick={createPO} className="btn-primary flex-1">Create PO</button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {pos.map(po => (
          <div key={po.id} className="card p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-900">{po.suppliers?.name}</p>
                <p className="text-xs text-gray-500">{format(new Date(po.created_at), 'dd MMM yyyy')}</p>
              </div>
              <div className="text-right">
                <p className="font-bold">₹{po.total_amount?.toFixed(0)}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[po.status]}`}>{po.status}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── GRN ───────────────────────────────────────────────────────────
function GoodsReceived() {
  const [grns, setGRNs] = useState<any[]>([])

  useEffect(() => {
    supabase.from('grn').select('*, suppliers(name)').order('created_at', { ascending: false })
      .then(({ data }) => setGRNs(data || []))
  }, [])

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">GRNs are auto-created when a Purchase Order is marked as received. Stock updates automatically.</p>
      <div className="space-y-2">
        {grns.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No GRNs yet</p>
        ) : grns.map(g => (
          <div key={g.id} className="card p-4">
            <div className="flex justify-between">
              <div>
                <p className="font-medium text-gray-900">GRN #{g.grn_number}</p>
                <p className="text-xs text-gray-500">{g.suppliers?.name} · {format(new Date(g.created_at), 'dd MMM')}</p>
              </div>
              <p className="font-bold">₹{g.total_amount?.toFixed(0)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── RECIPES / BOM ─────────────────────────────────────────────────
function RecipeManagement() {
  const [recipes, setRecipes] = useState<any[]>([])
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [invItems, setInvItems] = useState<any[]>([])
  const [selected, setSelected] = useState<string>('')
  const [ingredients, setIngredients] = useState<{ item_id: string; qty: number; unit: string }[]>([])

  useEffect(() => {
    Promise.all([
      supabase.from('recipes').select('*, menu_items(name)'),
      supabase.from('menu_items').select('id, name').eq('is_active', true),
      supabase.from('inventory_items').select('id, name, unit').eq('is_active', true),
    ]).then(([r, m, i]) => { setRecipes(r.data || []); setMenuItems(m.data || []); setInvItems(i.data || []) })
  }, [])

  async function saveRecipe() {
    if (!selected || !ingredients.length) { toast.error('Select item and add ingredients'); return }
    await supabase.from('recipes').upsert({ menu_item_id: selected, ingredients })
    toast.success('Recipe saved!'); setSelected(''); setIngredients([])
    supabase.from('recipes').select('*, menu_items(name)').then(({ data }) => setRecipes(data || []))
  }

  return (
    <div className="space-y-4">
      <div className="card-pad space-y-3">
        <p className="font-semibold text-gray-900">Set Recipe / Bill of Materials</p>
        <div>
          <label className="label">Menu Item</label>
          <select className="input" value={selected} onChange={e => setSelected(e.target.value)}>
            <option value="">Select menu item</option>
            {menuItems.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        {ingredients.map((ing, idx) => (
          <div key={idx} className="grid grid-cols-3 gap-2">
            <select className="input text-sm" value={ing.item_id}
              onChange={e => setIngredients(prev => prev.map((i, n) => n === idx ? { ...i, item_id: e.target.value } : i))}>
              <option value="">Select ingredient</option>
              {invItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
            <input type="number" placeholder="Qty" className="input text-sm" value={ing.qty || ''}
              onChange={e => setIngredients(prev => prev.map((i, n) => n === idx ? { ...i, qty: +e.target.value } : i))} />
            <select className="input text-sm" value={ing.unit}
              onChange={e => setIngredients(prev => prev.map((i, n) => n === idx ? { ...i, unit: e.target.value } : i))}>
              {['g', 'kg', 'ml', 'litre', 'piece'].map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
        ))}
        <button onClick={() => setIngredients(prev => [...prev, { item_id: '', qty: 0, unit: 'g' }])} className="btn-secondary btn-sm">+ Add Ingredient</button>
        <button onClick={saveRecipe} className="btn-primary w-full">Save Recipe</button>
      </div>
      <div className="space-y-2">
        {recipes.map(r => (
          <div key={r.id} className="card p-4">
            <p className="font-medium text-gray-900">{r.menu_items?.name}</p>
            <p className="text-xs text-gray-500 mt-1">{r.ingredients?.length} ingredients</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── WASTAGE TRACKING ──────────────────────────────────────────────
function WastageTracking() {
  const [wastage, setWastage] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [form, setForm] = useState({ item_id: '', qty: 0, reason: '', cost: 0 })

  async function load() {
    const [w, i] = await Promise.all([
      supabase.from('wastage').select('*, inventory_items(name, unit)').order('created_at', { ascending: false }),
      supabase.from('inventory_items').select('id, name, unit'),
    ])
    setWastage(w.data || []); setItems(i.data || [])
  }

  useEffect(() => { load() }, [])

  async function logWastage() {
    if (!form.item_id || !form.qty) { toast.error('Select item and qty'); return }
    await supabase.from('wastage').insert(form)
    await supabase.from('inventory_items').update({ current_stock: supabase.rpc('decrement', { x: form.qty }) as any }).eq('id', form.item_id)
    toast.success('Wastage logged!'); setForm({ item_id: '', qty: 0, reason: '', cost: 0 }); load()
  }

  const totalWastageCost = wastage.reduce((s, w) => s + (w.cost || 0), 0)

  return (
    <div className="space-y-4">
      <div className="card-pad bg-red-50 border-red-100">
        <p className="text-sm text-red-600 font-medium">Total wastage cost this month</p>
        <p className="text-2xl font-bold text-red-700 mt-1">₹{totalWastageCost.toFixed(0)}</p>
      </div>
      <div className="card-pad space-y-3">
        <p className="font-semibold text-gray-900">Log Wastage</p>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Item</label>
            <select className="input" value={form.item_id} onChange={e => setForm({ ...form, item_id: e.target.value })}>
              <option value="">Select item</option>
              {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
            </select>
          </div>
          <div><label className="label">Quantity</label>
            <input type="number" className="input" value={form.qty || ''} onChange={e => setForm({ ...form, qty: +e.target.value })} /></div>
          <div><label className="label">Cost (₹)</label>
            <input type="number" className="input" value={form.cost || ''} onChange={e => setForm({ ...form, cost: +e.target.value })} /></div>
          <div><label className="label">Reason</label>
            <select className="input" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}>
              <option value="">Select reason</option>
              <option>Spoilage</option><option>Overcooked</option><option>Expired</option><option>Dropped</option><option>Other</option>
            </select>
          </div>
        </div>
        <button onClick={logWastage} className="btn-danger w-full">Log Wastage</button>
      </div>
      <div className="space-y-2">
        {wastage.map(w => (
          <div key={w.id} className="card p-3 flex justify-between items-center">
            <div>
              <p className="font-medium text-sm text-gray-900">{w.inventory_items?.name}</p>
              <p className="text-xs text-gray-500">{w.qty} {w.inventory_items?.unit} · {w.reason}</p>
            </div>
            <p className="text-sm font-bold text-red-600">₹{w.cost || 0}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
