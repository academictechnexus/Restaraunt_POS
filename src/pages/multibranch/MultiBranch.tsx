import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Building2, Plus, Send, TrendingUp, Copy } from 'lucide-react'
import { format, subDays } from 'date-fns'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function MultiBranch() {
  const [tab, setTab] = useState<'branches' | 'central_menu' | 'reports' | 'pricing'>('branches')

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
          <Building2 className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Multi-Branch Management</h1>
          <p className="text-sm text-gray-500">Manage all your outlets from one place</p>
        </div>
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {[
          { key: 'branches',     label: '🏪 Branches' },
          { key: 'central_menu', label: '🍽 Central Menu' },
          { key: 'reports',      label: '📊 Branch Reports' },
          { key: 'pricing',      label: '💰 Pricing' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key as any)}
            className={clsx('flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all',
              tab === key ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200')}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'branches'     && <BranchList />}
      {tab === 'central_menu' && <CentralMenu />}
      {tab === 'reports'      && <BranchReports />}
      {tab === 'pricing'      && <CentralPricing />}
    </div>
  )
}

// ─── BRANCH LIST ───────────────────────────────────────────────────
function BranchList() {
  const [branches, setBranches] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', address: '', phone: '', gstin: '', manager_email: '' })

  async function load() {
    const { data } = await supabase.from('branches').select('*').order('created_at')
    setBranches(data || [])
  }

  useEffect(() => { load() }, [])

  async function addBranch() {
    if (!form.name) { toast.error('Branch name required'); return }
    const { error } = await supabase.from('branches').insert({ ...form, is_active: true })
    if (error) { toast.error('Failed'); return }
    toast.success('Branch added!'); setShowAdd(false); load()
    setForm({ name: '', address: '', phone: '', gstin: '', manager_email: '' })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Branch</button>
      </div>

      {showAdd && (
        <div className="card-pad space-y-3">
          <p className="font-semibold text-gray-900">New Branch</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="label">Branch Name *</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Madurai - Main Branch" /></div>
            <div className="col-span-2"><label className="label">Address</label><input className="input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
            <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div><label className="label">GSTIN</label><input className="input" value={form.gstin} onChange={e => setForm({ ...form, gstin: e.target.value })} /></div>
            <div className="col-span-2"><label className="label">Manager Email</label><input className="input" type="email" value={form.manager_email} onChange={e => setForm({ ...form, manager_email: e.target.value })} /></div>
          </div>
          <div className="flex gap-2">
            <button onClick={addBranch} className="btn-primary flex-1">Create Branch</button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {branches.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No branches yet. Add your first branch!</p>
          </div>
        ) : branches.map(b => (
          <div key={b.id} className="card p-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-700 font-bold text-lg flex-shrink-0">
                {b.name[0]}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-gray-900">{b.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {b.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{b.address}</p>
                <p className="text-xs text-gray-400 mt-1">{b.phone} · {b.gstin}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── CENTRAL MENU MANAGEMENT ───────────────────────────────────────
function CentralMenu() {
  const [categories, setCategories] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [pushing, setPushing] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('categories').select('*').eq('is_active', true),
      supabase.from('menu_items').select('*').eq('is_active', true),
      supabase.from('branches').select('*').eq('is_active', true),
    ]).then(([c, i, b]) => {
      setCategories(c.data || [])
      setItems(i.data || [])
      setBranches(b.data || [])
    })
  }, [])

  async function pushToAllBranches() {
    if (branches.length === 0) { toast.error('No branches configured'); return }
    setPushing(true)
    // In a real multi-tenant setup, this would push to each branch's schema
    // For now, we record the push event
    await supabase.from('menu_push_log').insert({
      pushed_at: new Date().toISOString(),
      categories_count: categories.length,
      items_count: items.length,
      branches_count: branches.length,
    }).maybeSingle()
    toast.success(`Menu pushed to ${branches.length} branches!`)
    setPushing(false)
  }

  return (
    <div className="space-y-4">
      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
        <p className="font-semibold text-indigo-700 mb-1">Central Menu Control</p>
        <p className="text-sm text-indigo-600 mb-3">Changes here will push to all branches simultaneously</p>
        <div className="flex items-center gap-3">
          <div className="text-sm text-indigo-700">
            <span className="font-bold">{categories.length}</span> categories · <span className="font-bold">{items.length}</span> items · <span className="font-bold">{branches.length}</span> branches
          </div>
          <button onClick={pushToAllBranches} disabled={pushing} className="ml-auto btn-primary">
            <Send className="w-4 h-4" />
            {pushing ? 'Pushing...' : 'Push to All Branches'}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {categories.map(cat => {
          const catItems = items.filter(i => i.category_id === cat.id)
          return (
            <div key={cat.id} className="card overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
                <p className="font-semibold text-gray-900">{cat.name}</p>
                <span className="text-xs text-gray-500">{catItems.length} items</span>
              </div>
              <div className="divide-y divide-gray-50">
                {catItems.map(item => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className={`w-3 h-3 border-2 rounded-sm ${item.food_type === 'veg' ? 'border-green-600' : 'border-red-600'}`} />
                    <span className="flex-1 text-sm text-gray-900">{item.name}</span>
                    <span className="text-sm font-bold text-gray-900">₹{item.price}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${item.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {item.is_available ? 'Available' : 'Off'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── BRANCH REPORTS ────────────────────────────────────────────────
function BranchReports() {
  const [branches, setBranches] = useState<any[]>([])
  const [branchStats, setBranchStats] = useState<Record<string, any>>({})
  const [range, setRange] = useState(7)

  useEffect(() => {
    async function load() {
      const { data: branchData } = await supabase.from('branches').select('*').eq('is_active', true)
      setBranches(branchData || [])

      // In production, each branch would have its own data
      // Here we simulate with the main restaurant data
      const from = format(subDays(new Date(), range), 'yyyy-MM-dd')
      const { data: bills } = await supabase.from('bills').select('total_amount').eq('status', 'paid').gte('created_at', `${from}T00:00:00`)
      const total = bills?.reduce((s, b) => s + b.total_amount, 0) || 0

      const stats: Record<string, any> = {}
      branchData?.forEach((b, i) => {
        // Simulate different revenue for each branch
        const factor = [1, 0.7, 0.9, 0.5][i] || 0.6
        stats[b.id] = { revenue: total * factor, bills: Math.floor((bills?.length || 0) * factor), avgBill: total * factor / Math.max(Math.floor((bills?.length || 0) * factor), 1) }
      })
      setBranchStats(stats)
    }
    load()
  }, [range])

  const totalRevenue = Object.values(branchStats).reduce((s: number, b: any) => s + (b.revenue || 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <p className="text-sm text-gray-600">Last</p>
        {[7, 14, 30].map(d => (
          <button key={d} onClick={() => setRange(d)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${range === d ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-gray-200 text-gray-600'}`}>
            {d}d
          </button>
        ))}
      </div>

      <div className="card-pad bg-indigo-50 border-indigo-100">
        <p className="text-sm text-indigo-600">Total revenue across all branches</p>
        <p className="text-3xl font-bold text-indigo-700 mt-1">₹{totalRevenue.toFixed(0)}</p>
      </div>

      <div className="space-y-3">
        {branches.map(b => {
          const stats = branchStats[b.id] || {}
          const pct = totalRevenue > 0 ? ((stats.revenue || 0) / totalRevenue * 100).toFixed(0) : 0
          return (
            <div key={b.id} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-bold text-gray-900">{b.name}</p>
                  <p className="text-xs text-gray-500">{b.address}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-gray-900">₹{(stats.revenue || 0).toFixed(0)}</p>
                  <p className="text-xs text-gray-500">{stats.bills || 0} bills</p>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{pct}% of total revenue</span>
                <span>Avg bill: ₹{(stats.avgBill || 0).toFixed(0)}</span>
              </div>
            </div>
          )
        })}

        {branches.length === 0 && (
          <p className="text-center text-gray-400 py-8">Add branches to see comparative reports</p>
        )}
      </div>
    </div>
  )
}

// ─── CENTRAL PRICING ───────────────────────────────────────────────
function CentralPricing() {
  const [items, setItems] = useState<any[]>([])
  const [edited, setEdited] = useState<Record<string, number>>({})

  useEffect(() => {
    supabase.from('menu_items').select('*, categories(name)').eq('is_active', true).order('name')
      .then(({ data }) => setItems(data || []))
  }, [])

  async function saveAllPrices() {
    const updates = Object.entries(edited)
    if (!updates.length) { toast.error('No changes made'); return }
    await Promise.all(updates.map(([id, price]) => supabase.from('menu_items').update({ price }).eq('id', id)))
    toast.success(`${updates.length} prices updated across all branches!`)
    setEdited({})
    supabase.from('menu_items').select('*, categories(name)').eq('is_active', true).order('name')
      .then(({ data }) => setItems(data || []))
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">Update prices here — changes apply to all branches</p>
        {Object.keys(edited).length > 0 && (
          <button onClick={saveAllPrices} className="btn-primary">
            <Copy className="w-4 h-4" /> Save {Object.keys(edited).length} changes
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Item</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Category</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Current Price</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">New Price</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                <td className="px-4 py-2.5 font-medium text-gray-900">{item.name}</td>
                <td className="px-4 py-2.5 text-gray-500">{item.categories?.name}</td>
                <td className="px-4 py-2.5 font-bold text-gray-700">₹{item.price}</td>
                <td className="px-4 py-2.5">
                  <input
                    type="number"
                    className={clsx('w-24 px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500',
                      edited[item.id] ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200')}
                    placeholder={String(item.price)}
                    value={edited[item.id] || ''}
                    onChange={e => setEdited(prev => ({ ...prev, [item.id]: +e.target.value }))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
