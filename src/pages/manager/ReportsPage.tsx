import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { Download, Calendar, TrendingUp } from 'lucide-react'

interface DayReport {
  date: string
  bills: number
  revenue: number
  tax: number
  discount: number
  cash: number
  upi: number
  card: number
}

export default function ReportsPage() {
  const [range, setRange] = useState(7)
  const [reports, setReports] = useState<DayReport[]>([])
  const [loading, setLoading] = useState(true)
  const [itemReport, setItemReport] = useState<{ name: string; qty: number; revenue: number }[]>([])

  useEffect(() => { loadReports() }, [range])

  async function loadReports() {
    setLoading(true)
    const from = format(subDays(new Date(), range - 1), 'yyyy-MM-dd')

    const { data: bills } = await supabase
      .from('bills')
      .select('*')
      .eq('status', 'paid')
      .gte('created_at', `${from}T00:00:00`)
      .order('created_at')

    // Group by day
    const dayMap: Record<string, DayReport> = {}
    bills?.forEach(b => {
      const day = format(new Date(b.created_at), 'yyyy-MM-dd')
      if (!dayMap[day]) dayMap[day] = { date: day, bills: 0, revenue: 0, tax: 0, discount: 0, cash: 0, upi: 0, card: 0 }
      dayMap[day].bills += 1
      dayMap[day].revenue += b.total_amount
      dayMap[day].tax += b.cgst_amount + b.sgst_amount
      dayMap[day].discount += b.discount_amount
      dayMap[day][b.payment_method as 'cash' | 'upi' | 'card'] += b.total_amount
    })

    // Fill missing days
    const result: DayReport[] = []
    for (let i = range - 1; i >= 0; i--) {
      const day = format(subDays(new Date(), i), 'yyyy-MM-dd')
      result.push(dayMap[day] || { date: day, bills: 0, revenue: 0, tax: 0, discount: 0, cash: 0, upi: 0, card: 0 })
    }
    setReports(result)

    // Item-wise report
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('item_name, quantity, item_price, orders!inner(created_at, status)')
      .gte('orders.created_at', `${from}T00:00:00`)
      .eq('orders.status', 'paid')

    const itemMap: Record<string, { qty: number; revenue: number }> = {}
    orderItems?.forEach((oi: any) => {
      if (!itemMap[oi.item_name]) itemMap[oi.item_name] = { qty: 0, revenue: 0 }
      itemMap[oi.item_name].qty += oi.quantity
      itemMap[oi.item_name].revenue += oi.quantity * oi.item_price
    })
    setItemReport(Object.entries(itemMap)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue))

    setLoading(false)
  }

  const totals = reports.reduce((acc, r) => ({
    revenue: acc.revenue + r.revenue,
    bills: acc.bills + r.bills,
    tax: acc.tax + r.tax,
    discount: acc.discount + r.discount,
  }), { revenue: 0, bills: 0, tax: 0, discount: 0 })

  const maxRevenue = Math.max(...reports.map(r => r.revenue), 1)

  function exportCSV() {
    const rows = [
      ['Date', 'Bills', 'Revenue', 'Tax', 'Discount', 'Cash', 'UPI', 'Card'],
      ...reports.map(r => [r.date, r.bills, r.revenue.toFixed(2), r.tax.toFixed(2), r.discount.toFixed(2), r.cash.toFixed(2), r.upi.toFixed(2), r.card.toFixed(2)])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `sales_report_${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Sales Report</h1>
          <p className="text-sm text-gray-500">Last {range} days</p>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30].map(d => (
            <button key={d} onClick={() => setRange(d)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${range === d ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}>
              {d}d
            </button>
          ))}
          <button onClick={exportCSV} className="btn-secondary">
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Revenue', value: `₹${totals.revenue.toFixed(0)}`, color: 'text-blue-700' },
          { label: 'Total Bills',   value: String(totals.bills),             color: 'text-green-700' },
          { label: 'Total Tax',     value: `₹${totals.tax.toFixed(0)}`,      color: 'text-orange-700' },
          { label: 'Discounts',     value: `₹${totals.discount.toFixed(0)}`, color: 'text-red-700' },
        ].map(s => (
          <div key={s.label} className="card-pad">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="card-pad">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-700">Daily Revenue</h2>
        </div>
        {loading ? (
          <div className="h-32 bg-gray-50 rounded-xl animate-pulse" />
        ) : (
          <div className="flex items-end gap-1 h-32 overflow-x-auto pb-2">
            {reports.map(r => (
              <div key={r.date} className="flex flex-col items-center gap-1 flex-1 min-w-[28px]">
                <div className="relative w-full flex justify-center">
                  <div
                    className="w-full max-w-[32px] bg-blue-500 rounded-t-md transition-all duration-500 hover:bg-blue-600"
                    style={{ height: `${(r.revenue / maxRevenue) * 100}px`, minHeight: r.revenue > 0 ? '4px' : '0' }}
                    title={`₹${r.revenue.toFixed(0)}`}
                  />
                </div>
                <span className="text-xs text-gray-400 rotate-0" style={{ fontSize: '9px' }}>
                  {format(new Date(r.date), 'd/M')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Day-wise table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-700">Day-wise Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Date', 'Bills', 'Revenue', 'Tax', 'Discount', 'Cash', 'UPI', 'Card'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.map((r, i) => (
                <tr key={r.date} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="px-4 py-2.5 font-medium text-gray-800 whitespace-nowrap">{format(new Date(r.date), 'dd MMM')}</td>
                  <td className="px-4 py-2.5 text-gray-600">{r.bills}</td>
                  <td className="px-4 py-2.5 font-semibold text-gray-900">₹{r.revenue.toFixed(0)}</td>
                  <td className="px-4 py-2.5 text-orange-600">₹{r.tax.toFixed(0)}</td>
                  <td className="px-4 py-2.5 text-red-600">₹{r.discount.toFixed(0)}</td>
                  <td className="px-4 py-2.5 text-green-700">₹{r.cash.toFixed(0)}</td>
                  <td className="px-4 py-2.5 text-blue-700">₹{r.upi.toFixed(0)}</td>
                  <td className="px-4 py-2.5 text-purple-700">₹{r.card.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-200 font-bold">
                <td className="px-4 py-2.5 text-gray-900">Total</td>
                <td className="px-4 py-2.5">{totals.bills}</td>
                <td className="px-4 py-2.5 text-blue-700">₹{totals.revenue.toFixed(0)}</td>
                <td className="px-4 py-2.5 text-orange-600">₹{totals.tax.toFixed(0)}</td>
                <td className="px-4 py-2.5 text-red-600">₹{totals.discount.toFixed(0)}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Item-wise report */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Item-wise Sales</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Item</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Qty Sold</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {itemReport.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400 text-sm">No data for this period</td></tr>
              ) : itemReport.map((item, i) => (
                <tr key={item.name} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="px-4 py-2.5 font-medium text-gray-800">{item.name}</td>
                  <td className="px-4 py-2.5 text-gray-600">{item.qty}</td>
                  <td className="px-4 py-2.5 font-semibold text-gray-900">₹{item.revenue.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
