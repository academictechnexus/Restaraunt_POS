// @ts-nocheck
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'
import { Download, TrendingUp, TrendingDown, IndianRupee, Percent } from 'lucide-react'
import clsx from 'clsx'

export default function FinanceReports() {
  const [tab, setTab] = useState<'pl' | 'foodcost' | 'tax' | 'menueng' | 'waiter' | 'expense'>('pl')

  const tabs = [
    { key: 'pl',      label: 'P&L' },
    { key: 'foodcost',label: 'Food Cost' },
    { key: 'tax',     label: 'GST Report' },
    { key: 'menueng', label: 'Menu Engineering' },
    { key: 'waiter',  label: 'Staff Performance' },
    { key: 'expense', label: 'Expenses' },
  ]

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-lg font-bold text-gray-900 mb-4">Finance & Reports</h1>
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={clsx('flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all',
              tab === t.key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200')}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'pl'       && <ProfitLoss />}
      {tab === 'foodcost' && <FoodCostReport />}
      {tab === 'tax'      && <GSTReport />}
      {tab === 'menueng'  && <MenuEngineering />}
      {tab === 'waiter'   && <StaffPerformance />}
      {tab === 'expense'  && <ExpenseReport />}
    </div>
  )
}

// ─── P&L REPORT ────────────────────────────────────────────────────
function ProfitLoss() {
  const [data, setData] = useState<any>(null)
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'))

  useEffect(() => { load() }, [month])

  async function load() {
    const from = `${month}-01T00:00:00`
    const to = format(endOfMonth(new Date(`${month}-01`)), "yyyy-MM-dd'T'23:59:59")

    const [billsRes, wastageRes, expenseRes] = await Promise.all([
      supabase.from('bills').select('total_amount, cgst_amount, sgst_amount, discount_amount').eq('status', 'paid').gte('created_at', from).lte('created_at', to),
      supabase.from('wastage').select('cost').gte('created_at', from).lte('created_at', to),
      supabase.from('expenses').select('amount, category').gte('created_at', from).lte('created_at', to),
    ])

    const revenue = billsRes.data?.reduce((s, b) => s + b.total_amount, 0) || 0
    const tax = billsRes.data?.reduce((s, b) => s + b.cgst_amount + b.sgst_amount, 0) || 0
    const discount = billsRes.data?.reduce((s, b) => s + b.discount_amount, 0) || 0
    const wastage = wastageRes.data?.reduce((s, w) => s + (w.cost || 0), 0) || 0
    const expenses = expenseRes.data?.reduce((s, e) => s + e.amount, 0) || 0
    const netRevenue = revenue - tax
    const grossProfit = netRevenue - wastage
    const netProfit = grossProfit - expenses

    setData({ revenue, tax, discount, wastage, expenses, netRevenue, grossProfit, netProfit,
      margin: revenue > 0 ? (netProfit / revenue * 100).toFixed(1) : 0 })
  }

  function exportPL() {
    if (!data) return
    const csv = [
      ['P&L Report', month],
      [''],
      ['Revenue', data.revenue.toFixed(2)],
      ['Less: GST', data.tax.toFixed(2)],
      ['Net Revenue', data.netRevenue.toFixed(2)],
      ['Less: Wastage', data.wastage.toFixed(2)],
      ['Gross Profit', data.grossProfit.toFixed(2)],
      ['Less: Expenses', data.expenses.toFixed(2)],
      ['NET PROFIT', data.netProfit.toFixed(2)],
      ['Profit Margin', `${data.margin}%`],
    ].map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `pl_${month}.csv`; a.click()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input type="month" className="input w-40" value={month} onChange={e => setMonth(e.target.value)} />
        <button onClick={exportPL} className="btn-secondary"><Download className="w-4 h-4" /> Export</button>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Gross Revenue', value: data.revenue, color: 'text-blue-700', icon: TrendingUp },
              { label: 'Net Revenue', value: data.netRevenue, color: 'text-green-700', icon: IndianRupee },
              { label: 'Net Profit', value: data.netProfit, color: data.netProfit >= 0 ? 'text-green-700' : 'text-red-700', icon: TrendingUp },
              { label: 'Profit Margin', value: `${data.margin}%`, isStr: true, color: data.margin >= 0 ? 'text-purple-700' : 'text-red-700', icon: Percent },
            ].map(({ label, value, color, isStr, icon: Icon }) => (
              <div key={label} className="card-pad">
                <Icon className={`w-4 h-4 mb-2 ${color}`} />
                <p className={`text-xl font-bold ${color}`}>{isStr ? value : `₹${(value as number).toFixed(0)}`}</p>
                <p className="text-xs text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>

          <div className="card overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b font-semibold text-sm text-gray-700">Profit & Loss Statement — {month}</div>
            <div className="divide-y divide-gray-100">
              {[
                { label: 'Total Revenue (Gross)', value: data.revenue, bold: false, indent: false },
                { label: 'Less: GST Collected', value: -data.tax, bold: false, indent: true },
                { label: 'Discounts Given', value: -data.discount, bold: false, indent: true },
                { label: 'NET REVENUE', value: data.netRevenue, bold: true, indent: false },
                { label: 'Less: Food Wastage', value: -data.wastage, bold: false, indent: true },
                { label: 'GROSS PROFIT', value: data.grossProfit, bold: true, indent: false },
                { label: 'Less: Operating Expenses', value: -data.expenses, bold: false, indent: true },
                { label: 'NET PROFIT', value: data.netProfit, bold: true, indent: false, highlight: true },
              ].map(row => (
                <div key={row.label} className={clsx('flex justify-between px-4 py-3 text-sm',
                  row.indent && 'pl-8 text-gray-500',
                  row.bold && 'font-bold bg-gray-50',
                  row.highlight && (data.netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'))}>
                  <span>{row.label}</span>
                  <span className={row.value < 0 ? 'text-red-600' : row.bold ? 'text-gray-900' : ''}>
                    {row.value < 0 ? `-₹${Math.abs(row.value).toFixed(2)}` : `₹${row.value.toFixed(2)}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── FOOD COST REPORT ──────────────────────────────────────────────
function FoodCostReport() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const from = format(subDays(new Date(), 30), 'yyyy-MM-dd')
      const { data: items } = await supabase
        .from('order_items')
        .select('item_name, item_price, quantity, orders!inner(status, created_at)')
        .gte('orders.created_at', `${from}T00:00:00`)
        .eq('orders.status', 'paid')

      const map: Record<string, { revenue: number; qty: number; cost: number }> = {}
      items?.forEach((i: any) => {
        if (!map[i.item_name]) map[i.item_name] = { revenue: 0, qty: 0, cost: 0 }
        map[i.item_name].revenue += i.item_price * i.quantity
        map[i.item_name].qty += i.quantity
        map[i.item_name].cost += i.item_price * i.quantity * 0.3 // estimated 30% food cost
      })

      setData(Object.entries(map).map(([name, v]) => ({
        name, ...v,
        foodCostPct: ((v.cost / v.revenue) * 100).toFixed(1),
        margin: (((v.revenue - v.cost) / v.revenue) * 100).toFixed(1)
      })).sort((a, b) => b.revenue - a.revenue))
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="text-center py-8 text-gray-400">Loading...</div>

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Food cost % = ingredient cost / selling price. Target: keep below 35%.</p>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              {['Item', 'Qty', 'Revenue', 'Est. Cost', 'Food Cost %', 'Margin'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={row.name} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                <td className="px-4 py-2.5 font-medium text-gray-900">{row.name}</td>
                <td className="px-4 py-2.5 text-gray-600">{row.qty}</td>
                <td className="px-4 py-2.5 font-semibold">₹{row.revenue.toFixed(0)}</td>
                <td className="px-4 py-2.5 text-red-600">₹{row.cost.toFixed(0)}</td>
                <td className="px-4 py-2.5">
                  <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium',
                    parseFloat(row.foodCostPct) <= 35 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                    {row.foodCostPct}%
                  </span>
                </td>
                <td className="px-4 py-2.5 text-green-700 font-semibold">{row.margin}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── GST REPORT ────────────────────────────────────────────────────
function GSTReport() {
  const [data, setData] = useState<any>(null)
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'))

  useEffect(() => { load() }, [month])

  async function load() {
    const from = `${month}-01T00:00:00`
    const to = format(endOfMonth(new Date(`${month}-01`)), "yyyy-MM-dd'T'23:59:59")
    const { data: bills } = await supabase.from('bills').select('*').eq('status', 'paid').gte('created_at', from).lte('created_at', to)
    if (!bills) return

    const totalTaxable = bills.reduce((s, b) => s + (b.total_amount - b.cgst_amount - b.sgst_amount), 0)
    const totalCGST = bills.reduce((s, b) => s + b.cgst_amount, 0)
    const totalSGST = bills.reduce((s, b) => s + b.sgst_amount, 0)
    const totalGST = totalCGST + totalSGST

    setData({ totalTaxable, totalCGST, totalSGST, totalGST, billCount: bills.length, month })
  }

  function exportGSTR1() {
    if (!data) return
    const csv = [
      ['GSTR-1 Summary', data.month],
      [''],
      ['Total Taxable Value', data.totalTaxable.toFixed(2)],
      ['CGST', data.totalCGST.toFixed(2)],
      ['SGST', data.totalSGST.toFixed(2)],
      ['Total GST', data.totalGST.toFixed(2)],
      ['Total Invoices', data.billCount],
    ].map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `gstr1_${data.month}.csv`; a.click()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input type="month" className="input w-40" value={month} onChange={e => setMonth(e.target.value)} />
        <button onClick={exportGSTR1} className="btn-secondary"><Download className="w-4 h-4" /> GSTR-1 Export</button>
      </div>

      {data && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Taxable Value', value: data.totalTaxable, color: 'text-blue-700' },
              { label: 'Total GST', value: data.totalGST, color: 'text-orange-700' },
              { label: 'CGST', value: data.totalCGST, color: 'text-purple-700' },
              { label: 'SGST', value: data.totalSGST, color: 'text-purple-700' },
            ].map(s => (
              <div key={s.label} className="card-pad">
                <p className={`text-xl font-bold ${s.color}`}>₹{s.value.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="card-pad bg-blue-50">
            <p className="text-sm text-blue-700 font-medium">GSTR-3B Summary</p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Total Outward Taxable Supplies</span><span className="font-semibold">₹{data.totalTaxable.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Total Tax Payable (CGST)</span><span className="font-semibold">₹{data.totalCGST.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Total Tax Payable (SGST)</span><span className="font-semibold">₹{data.totalSGST.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold border-t pt-2"><span>Total Tax Liability</span><span>₹{data.totalGST.toFixed(2)}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── MENU ENGINEERING ──────────────────────────────────────────────
function MenuEngineering() {
  const [items, setItems] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const from = format(subDays(new Date(), 30), 'yyyy-MM-dd')
      const { data } = await supabase
        .from('order_items')
        .select('item_name, item_price, quantity, orders!inner(status)')
        .gte('orders.created_at', `${from}T00:00:00`)
        .eq('orders.status', 'paid')

      const map: Record<string, { qty: number; revenue: number; price: number }> = {}
      data?.forEach((i: any) => {
        if (!map[i.item_name]) map[i.item_name] = { qty: 0, revenue: 0, price: i.item_price }
        map[i.item_name].qty += i.quantity
        map[i.item_name].revenue += i.item_price * i.quantity
      })

      const items = Object.entries(map).map(([name, v]) => ({ name, ...v }))
      const avgQty = items.reduce((s, i) => s + i.qty, 0) / Math.max(items.length, 1)
      const avgRevenue = items.reduce((s, i) => s + i.revenue, 0) / Math.max(items.length, 1)

      setItems(items.map(item => ({
        ...item,
        category: item.qty >= avgQty && item.revenue >= avgRevenue ? 'Star' :
                  item.qty >= avgQty && item.revenue < avgRevenue  ? 'Plow Horse' :
                  item.qty < avgQty  && item.revenue >= avgRevenue ? 'Puzzle' : 'Dog'
      })).sort((a, b) => b.revenue - a.revenue))
    }
    load()
  }, [])

  const catConfig: Record<string, { color: string; desc: string; action: string }> = {
    'Star':       { color: 'bg-green-100 text-green-700',  desc: 'High popularity + High profit',  action: 'Keep & promote' },
    'Plow Horse': { color: 'bg-blue-100 text-blue-700',    desc: 'High popularity + Low profit',   action: 'Increase price slightly' },
    'Puzzle':     { color: 'bg-yellow-100 text-yellow-700',desc: 'Low popularity + High profit',   action: 'Promote more' },
    'Dog':        { color: 'bg-red-100 text-red-700',      desc: 'Low popularity + Low profit',    action: 'Consider removing' },
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(catConfig).map(([cat, cfg]) => (
          <div key={cat} className={`card-pad ${cfg.color}`}>
            <p className="font-bold">{cat}</p>
            <p className="text-xs mt-1 opacity-80">{cfg.desc}</p>
            <p className="text-xs mt-1 font-medium">{cfg.action}</p>
            <p className="text-lg font-bold mt-2">{items.filter(i => i.category === cat).length} items</p>
          </div>
        ))}
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              {['Item', 'Category', 'Qty Sold', 'Revenue', 'Action'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const cfg = catConfig[item.category]
              return (
                <tr key={item.name} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{item.name}</td>
                  <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>{item.category}</span></td>
                  <td className="px-4 py-2.5 text-gray-600">{item.qty}</td>
                  <td className="px-4 py-2.5 font-semibold">₹{item.revenue.toFixed(0)}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{cfg.action}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── STAFF PERFORMANCE ─────────────────────────────────────────────
function StaffPerformance() {
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const from = format(subDays(new Date(), 30), 'yyyy-MM-dd')
      const { data: bills } = await supabase
        .from('bills')
        .select('total_amount, discount_amount, created_by, profiles!created_by(full_name)')
        .eq('status', 'paid')
        .gte('created_at', `${from}T00:00:00`)

      const map: Record<string, any> = {}
      bills?.forEach((b: any) => {
        const id = b.created_by
        if (!id) return
        if (!map[id]) map[id] = { name: b.profiles?.full_name || 'Unknown', bills: 0, revenue: 0, discounts: 0 }
        map[id].bills += 1
        map[id].revenue += b.total_amount
        map[id].discounts += b.discount_amount
      })

      setData(Object.values(map).map(s => ({
        ...s,
        avgBill: s.bills > 0 ? s.revenue / s.bills : 0,
        discountPct: s.revenue > 0 ? (s.discounts / s.revenue * 100).toFixed(1) : '0'
      })).sort((a, b) => b.revenue - a.revenue))
    }
    load()
  }, [])

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b text-sm font-semibold text-gray-700">Staff Performance — Last 30 Days</div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            {['Staff', 'Bills', 'Revenue', 'Avg Bill', 'Discounts Given'].map(h => (
              <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No data yet</td></tr>
          ) : data.map((s, i) => (
            <tr key={s.name} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
              <td className="px-4 py-2.5 font-medium text-gray-900">{s.name}</td>
              <td className="px-4 py-2.5 text-gray-600">{s.bills}</td>
              <td className="px-4 py-2.5 font-semibold text-green-700">₹{s.revenue.toFixed(0)}</td>
              <td className="px-4 py-2.5 text-gray-700">₹{s.avgBill.toFixed(0)}</td>
              <td className="px-4 py-2.5">
                <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium',
                  parseFloat(s.discountPct) > 10 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700')}>
                  {s.discountPct}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── EXPENSE REPORT ────────────────────────────────────────────────
function ExpenseReport() {
  const [expenses, setExpenses] = useState<any[]>([])
  const [form, setForm] = useState({ category: 'Rent', amount: 0, description: '', date: format(new Date(), 'yyyy-MM-dd') })
  const [showAdd, setShowAdd] = useState(false)

  const categories = ['Rent', 'Electricity', 'Gas', 'Staff Salary', 'Raw Materials', 'Packaging', 'Marketing', 'Maintenance', 'Other']

  async function load() {
    const { data } = await supabase.from('expenses').select('*').order('date', { ascending: false }).limit(50)
    setExpenses(data || [])
  }

  useEffect(() => { load() }, [])

  async function addExpense() {
    if (!form.amount) { return }
    await supabase.from('expenses').insert(form)
    setShowAdd(false); load()
    setForm({ category: 'Rent', amount: 0, description: '', date: format(new Date(), 'yyyy-MM-dd') })
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0)
  const byCategory = categories.map(cat => ({
    cat, total: expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0)
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="card-pad">
          <p className="text-2xl font-bold text-red-600">₹{total.toFixed(0)}</p>
          <p className="text-xs text-gray-500">Total expenses</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">+ Add Expense</button>
      </div>

      {showAdd && (
        <div className="card-pad space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Category</label>
              <select className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label className="label">Amount (₹)</label>
              <input type="number" className="input" value={form.amount || ''} onChange={e => setForm({ ...form, amount: +e.target.value })} /></div>
            <div><label className="label">Date</label>
              <input type="date" className="input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
            <div><label className="label">Description</label>
              <input className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <div className="flex gap-2">
            <button onClick={addExpense} className="btn-danger flex-1">Add Expense</button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {byCategory.map(({ cat, total: t }) => (
          <div key={cat} className="card p-3 flex justify-between items-center">
            <span className="text-sm text-gray-700">{cat}</span>
            <span className="font-bold text-red-600">₹{t.toFixed(0)}</span>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {expenses.map(e => (
          <div key={e.id} className="card p-3 flex justify-between items-center">
            <div>
              <p className="font-medium text-sm text-gray-900">{e.category}</p>
              <p className="text-xs text-gray-400">{e.description} · {format(new Date(e.date), 'dd MMM')}</p>
            </div>
            <p className="font-bold text-red-600">₹{e.amount.toFixed(0)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
