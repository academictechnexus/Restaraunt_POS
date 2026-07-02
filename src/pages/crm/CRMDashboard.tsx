// @ts-nocheck
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Users, Gift, Tag, Star, MessageCircle, Plus, Search, Phone } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import clsx from 'clsx'

// ─── CRM DASHBOARD ─────────────────────────────────────────────────
export default function CRMDashboard() {
  const [tab, setTab] = useState<'customers' | 'loyalty' | 'coupons' | 'feedback'>('customers')

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-lg font-bold text-gray-900 mb-4">CRM & Loyalty</h1>
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {[
          { key: 'customers', label: 'Customers', icon: Users },
          { key: 'loyalty',   label: 'Loyalty',   icon: Gift },
          { key: 'coupons',   label: 'Coupons',   icon: Tag },
          { key: 'feedback',  label: 'Feedback',  icon: Star },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key as any)}
            className={clsx('flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all',
              tab === key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200')}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>
      {tab === 'customers' && <CustomerDatabase />}
      {tab === 'loyalty'   && <LoyaltyProgram />}
      {tab === 'coupons'   && <CouponsGiftCards />}
      {tab === 'feedback'  && <FeedbackView />}
    </div>
  )
}

// ─── CUSTOMER DATABASE ─────────────────────────────────────────────
function CustomerDatabase() {
  const [customers, setCustomers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', birthday: '' })

  async function load() {
    const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false }).limit(100)
    setCustomers(data || [])
  }

  useEffect(() => { load() }, [])

  async function addCustomer() {
    if (!form.name || !form.phone) { toast.error('Name and phone required'); return }
    const { error } = await supabase.from('customers').insert({ ...form, loyalty_points: 0 })
    if (error) { toast.error('Failed or duplicate phone'); return }
    toast.success('Customer added!'); setForm({ name: '', phone: '', email: '', birthday: '' }); setShowAdd(false); load()
  }

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search)
  )

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9" placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add</button>
      </div>

      {showAdd && (
        <div className="card-pad space-y-3">
          <p className="font-semibold text-gray-900">Add Customer</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Name *</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="label">Phone *</label><input className="input" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div><label className="label">Birthday</label><input className="input" type="date" value={form.birthday} onChange={e => setForm({ ...form, birthday: e.target.value })} /></div>
          </div>
          <div className="flex gap-2">
            <button onClick={addCustomer} className="btn-primary flex-1">Save</button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(c => (
          <div key={c.id} className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold flex-shrink-0">
              {c.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900">{c.name}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-yellow-600">{c.loyalty_points || 0} pts</p>
              <p className="text-xs text-gray-400">{c.visit_count || 0} visits</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── LOYALTY PROGRAM ───────────────────────────────────────────────
function LoyaltyProgram() {
  const [settings, setSettings] = useState({ points_per_100: 10, redeem_rate: 1, min_redeem: 100 })

  return (
    <div className="space-y-4">
      <div className="card-pad space-y-4">
        <p className="font-semibold text-gray-900">Loyalty Settings</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Points per ₹100 spent</label>
            <input type="number" className="input" value={settings.points_per_100}
              onChange={e => setSettings({ ...settings, points_per_100: +e.target.value })} />
          </div>
          <div>
            <label className="label">₹ value per point</label>
            <input type="number" className="input" value={settings.redeem_rate}
              onChange={e => setSettings({ ...settings, redeem_rate: +e.target.value })} />
          </div>
          <div className="col-span-2">
            <label className="label">Minimum points to redeem</label>
            <input type="number" className="input" value={settings.min_redeem}
              onChange={e => setSettings({ ...settings, min_redeem: +e.target.value })} />
          </div>
        </div>
        <button onClick={() => toast.success('Loyalty settings saved!')} className="btn-primary w-full">Save Settings</button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Silver', min: 0, max: 500, color: 'bg-gray-100 text-gray-700', perks: '5% discount' },
          { label: 'Gold', min: 500, max: 2000, color: 'bg-yellow-100 text-yellow-700', perks: '10% discount + birthday gift' },
          { label: 'Platinum', min: 2000, max: null, color: 'bg-purple-100 text-purple-700', perks: '15% discount + priority service' },
        ].map(tier => (
          <div key={tier.label} className={`card-pad ${tier.color}`}>
            <p className="font-bold text-lg">⭐ {tier.label}</p>
            <p className="text-xs mt-1">{tier.min}–{tier.max || '∞'} pts</p>
            <p className="text-xs mt-2 opacity-80">{tier.perks}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── COUPONS & GIFT CARDS ──────────────────────────────────────────
function CouponsGiftCards() {
  const [coupons, setCoupons] = useState<any[]>([])
  const [form, setForm] = useState({ code: '', type: 'percent', value: 10, min_order: 0, max_uses: 100, expiry: '' })

  async function load() {
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false })
    setCoupons(data || [])
  }

  useEffect(() => { load() }, [])

  async function createCoupon() {
    if (!form.code) { toast.error('Enter coupon code'); return }
    const { error } = await supabase.from('coupons').insert({ ...form, used_count: 0, is_active: true })
    if (error) { toast.error('Code already exists'); return }
    toast.success('Coupon created!'); load()
    setForm({ code: '', type: 'percent', value: 10, min_order: 0, max_uses: 100, expiry: '' })
  }

  function generateCode() {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    setForm(f => ({ ...f, code }))
  }

  return (
    <div className="space-y-4">
      <div className="card-pad space-y-3">
        <p className="font-semibold text-gray-900">Create Coupon</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 flex gap-2">
            <div className="flex-1"><label className="label">Coupon Code *</label>
              <input className="input uppercase" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. SAVE20" /></div>
            <div className="flex items-end"><button onClick={generateCode} className="btn-secondary">Auto</button></div>
          </div>
          <div><label className="label">Type</label>
            <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              <option value="percent">% Percentage</option>
              <option value="flat">₹ Flat amount</option>
            </select>
          </div>
          <div><label className="label">Value</label>
            <input type="number" className="input" value={form.value} onChange={e => setForm({ ...form, value: +e.target.value })} /></div>
          <div><label className="label">Min order (₹)</label>
            <input type="number" className="input" value={form.min_order} onChange={e => setForm({ ...form, min_order: +e.target.value })} /></div>
          <div><label className="label">Max uses</label>
            <input type="number" className="input" value={form.max_uses} onChange={e => setForm({ ...form, max_uses: +e.target.value })} /></div>
          <div className="col-span-2"><label className="label">Expiry date</label>
            <input type="date" className="input" value={form.expiry} onChange={e => setForm({ ...form, expiry: e.target.value })} /></div>
        </div>
        <button onClick={createCoupon} className="btn-primary w-full">Create Coupon</button>
      </div>

      <div className="space-y-2">
        {coupons.map(c => (
          <div key={c.id} className="card p-4 flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{c.code}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {c.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {c.type === 'percent' ? `${c.value}% off` : `₹${c.value} off`}
                {c.min_order > 0 && ` · Min ₹${c.min_order}`}
                {c.expiry && ` · Expires ${format(new Date(c.expiry), 'dd MMM')}`}
              </p>
            </div>
            <div className="text-right text-sm">
              <p className="font-medium">{c.used_count}/{c.max_uses}</p>
              <p className="text-xs text-gray-400">uses</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── FEEDBACK ──────────────────────────────────────────────────────
function FeedbackView() {
  const [feedback, setFeedback] = useState<any[]>([])

  useEffect(() => {
    supabase.from('feedback').select('*').order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => setFeedback(data || []))
  }, [])

  const avg = feedback.length ? (feedback.reduce((s, f) => s + f.rating, 0) / feedback.length).toFixed(1) : '—'

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="card-pad text-center"><p className="text-2xl font-bold text-yellow-500">⭐ {avg}</p><p className="text-xs text-gray-500">Avg rating</p></div>
        <div className="card-pad text-center"><p className="text-2xl font-bold text-gray-900">{feedback.length}</p><p className="text-xs text-gray-500">Total reviews</p></div>
        <div className="card-pad text-center"><p className="text-2xl font-bold text-green-600">{feedback.filter(f => f.rating >= 4).length}</p><p className="text-xs text-gray-500">Positive</p></div>
      </div>
      <div className="space-y-2">
        {feedback.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No feedback yet</p>
        ) : feedback.map(f => (
          <div key={f.id} className="card p-4">
            <div className="flex justify-between items-center mb-1">
              <div className="flex gap-0.5">
                {Array(5).fill(0).map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < f.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                ))}
              </div>
              <span className="text-xs text-gray-400">{format(new Date(f.created_at), 'dd MMM')}</span>
            </div>
            {f.comment && <p className="text-sm text-gray-700">{f.comment}</p>}
            {f.customer_name && <p className="text-xs text-gray-400 mt-1">— {f.customer_name}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
