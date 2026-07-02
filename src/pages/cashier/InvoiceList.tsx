// @ts-nocheck
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { Printer, XCircle, Search, FileText } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'

export default function InvoiceList() {
  const [bills, setBills]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState('today')

  useEffect(() => { load() }, [filter])

  async function load() {
    setLoading(true)
    let query = supabase.from('bills').select('*, orders(order_number, dining_tables(name), order_type)').order('created_at', { ascending: false })

    if (filter === 'today') {
      query = query.gte('created_at', new Date().toISOString().split('T')[0] + 'T00:00:00')
    } else if (filter === 'paid') {
      query = query.eq('status', 'paid')
    } else if (filter === 'void') {
      query = query.in('status', ['cancelled', 'refunded'])
    }

    const { data } = await query.limit(100)
    setBills(data || [])
    setLoading(false)
  }

  async function voidBill(bill) {
    const reason = prompt('Reason for voiding this invoice?')
    if (!reason) return
    await supabase.from('bills').update({ status: 'cancelled' }).eq('id', bill.id)
    await supabase.from('orders').update({ status: 'cancelled' }).eq('id', bill.order_id)
    toast.success('Invoice voided')
    load()
  }

  function reprintBill(bill) {
    const win = window.open('', '_blank', 'width=320,height=600')
    if (!win) return
    const tableName = bill.orders?.dining_tables?.name || 'Takeaway'
    win.document.write(`<!DOCTYPE html><html><head><title>Reprint Invoice</title>
    <style>body{font-family:monospace;font-size:13px;padding:10px;width:280px}
    h2{text-align:center}.sub{text-align:center;font-size:11px}
    hr{border:1px dashed #000}.row{display:flex;justify-content:space-between;font-size:12px;padding:2px 0}
    .total{font-weight:bold;font-size:15px;border-top:1px solid #000}</style></head><body>
    <h2>TAX INVOICE (REPRINT)</h2>
    <div class="sub">Invoice #${bill.bill_number}</div>
    <div class="sub">${format(new Date(bill.created_at), 'dd/MM/yyyy hh:mm aa')}</div>
    <div class="sub">Table: ${tableName}</div>
    <hr>
    <div class="row"><span>Subtotal</span><span>Rs.${bill.subtotal?.toFixed(2)}</span></div>
    ${bill.discount_amount > 0 ? `<div class="row"><span>Discount</span><span>-Rs.${bill.discount_amount?.toFixed(2)}</span></div>` : ''}
    <div class="row"><span>CGST @${bill.cgst_rate}%</span><span>Rs.${bill.cgst_amount?.toFixed(2)}</span></div>
    <div class="row"><span>SGST @${bill.sgst_rate}%</span><span>Rs.${bill.sgst_amount?.toFixed(2)}</span></div>
    <div class="row total"><span>TOTAL</span><span>Rs.${bill.total_amount?.toFixed(2)}</span></div>
    <hr>
    <div class="row"><span>Payment</span><span>${bill.payment_method?.toUpperCase()}</span></div>
    <div class="sub" style="margin-top:10px">** REPRINT **</div>
    </body></html>`)
    win.document.close(); win.focus()
    setTimeout(() => { win.print(); win.close() }, 300)
  }

  const filtered = bills.filter(b =>
    String(b.bill_number).includes(search) ||
    b.orders?.dining_tables?.name?.toLowerCase().includes(search.toLowerCase()) ||
    b.payment_method?.includes(search.toLowerCase())
  )

  const statusColors = {
    paid:      'bg-green-100 text-green-700',
    draft:     'bg-yellow-100 text-yellow-700',
    cancelled: 'bg-red-100 text-red-700',
    refunded:  'bg-purple-100 text-purple-700',
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-900">Invoices</h1>
        <div className="text-sm text-gray-500">{filtered.length} invoices</div>
      </div>

      {/* Search + filter */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9 text-sm" placeholder="Search by bill no, table..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {[['today','Today'],['paid','All Paid'],['void','Void/Refund'],['all','All']].map(([k,l]) => (
          <button key={k} onClick={() => setFilter(k)} className={clsx('flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all', filter===k ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200')}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{Array(5).fill(0).map((_,i) => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse"/>)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30"/>
          <p>No invoices found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(bill => (
            <div key={bill.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900">Invoice #{bill.bill_number}</span>
                    <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', statusColors[bill.status] || 'bg-gray-100 text-gray-600')}>
                      {bill.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {bill.orders?.dining_tables?.name ? `Table ${bill.orders.dining_tables.name}` : 'Takeaway'} ·
                    {format(new Date(bill.created_at), ' dd MMM yyyy · hh:mm aa')}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">
                    {bill.payment_method} payment
                    {bill.discount_amount > 0 ? ` · Discount: Rs.${bill.discount_amount.toFixed(0)}` : ''}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-lg text-gray-900">Rs.{bill.total_amount?.toFixed(0)}</p>
                  <div className="flex gap-1.5 mt-2 justify-end">
                    <button onClick={() => reprintBill(bill)} className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Reprint">
                      <Printer className="w-4 h-4"/>
                    </button>
                    {bill.status === 'paid' && (
                      <button onClick={() => voidBill(bill)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Void invoice">
                        <XCircle className="w-4 h-4"/>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
