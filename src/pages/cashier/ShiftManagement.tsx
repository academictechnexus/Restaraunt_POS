import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Lock, Unlock, Printer, IndianRupee } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

interface Shift {
  id: string
  opened_by: string
  opened_at: string
  closed_at: string | null
  opening_cash: number
  closing_cash: number | null
  total_sales: number | null
  cash_sales: number | null
  upi_sales: number | null
  card_sales: number | null
  status: 'open' | 'closed'
}

export default function ShiftManagement() {
  const { user, profile } = useAuth()
  const [currentShift, setCurrentShift] = useState<Shift | null>(null)
  const [openingCash, setOpeningCash] = useState(0)
  const [closingCash, setClosingCash] = useState(0)
  const [loading, setLoading] = useState(false)
  const [shiftStats, setShiftStats] = useState<any>(null)

  useEffect(() => { loadCurrentShift() }, [])

  async function loadCurrentShift() {
    const { data } = await supabase
      .from('shifts')
      .select('*')
      .eq('status', 'open')
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setCurrentShift(data)
    if (data) loadShiftStats(data.opened_at)
  }

  async function loadShiftStats(from: string) {
    const { data: bills } = await supabase
      .from('bills')
      .select('*')
      .eq('status', 'paid')
      .gte('created_at', from)
    if (!bills) return
    setShiftStats({
      totalBills: bills.length,
      totalSales: bills.reduce((s, b) => s + b.total_amount, 0),
      cashSales: bills.filter(b => b.payment_method === 'cash').reduce((s, b) => s + b.total_amount, 0),
      upiSales: bills.filter(b => b.payment_method === 'upi').reduce((s, b) => s + b.total_amount, 0),
      cardSales: bills.filter(b => b.payment_method === 'card').reduce((s, b) => s + b.total_amount, 0),
    })
  }

  async function openShift() {
    setLoading(true)
    const { error } = await supabase.from('shifts').insert({
      opened_by: user?.id,
      opening_cash: openingCash,
      status: 'open',
    })
    if (error) { toast.error('Failed to open shift'); setLoading(false); return }
    toast.success('Shift opened!')
    loadCurrentShift()
    setLoading(false)
  }

  async function closeShift() {
    if (!currentShift) return
    setLoading(true)
    const { error } = await supabase.from('shifts').update({
      closed_at: new Date().toISOString(),
      closing_cash: closingCash,
      total_sales: shiftStats?.totalSales || 0,
      cash_sales: shiftStats?.cashSales || 0,
      upi_sales: shiftStats?.upiSales || 0,
      card_sales: shiftStats?.cardSales || 0,
      status: 'closed',
    }).eq('id', currentShift.id)
    if (error) { toast.error('Failed to close shift'); setLoading(false); return }
    printZReport()
    toast.success('Shift closed! Z-Report printed.')
    setCurrentShift(null)
    setShiftStats(null)
    setLoading(false)
  }

  function printXReport() {
    const win = window.open('', '_blank', 'width=300,height=600')
    if (!win) return
    win.document.write(`
      <html><head><title>X Report</title>
      <style>body{font-family:monospace;font-size:13px;padding:10px;width:280px}
      h2{text-align:center}hr{border:1px dashed #000}.row{display:flex;justify-content:space-between}</style>
      </head><body>
      <h2>X REPORT (MID-SHIFT)</h2>
      <div style="text-align:center">${format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
      <hr>
      <div class="row"><span>Total Bills</span><span>${shiftStats?.totalBills || 0}</span></div>
      <div class="row"><span>Total Sales</span><span>₹${(shiftStats?.totalSales || 0).toFixed(2)}</span></div>
      <hr>
      <div class="row"><span>Cash</span><span>₹${(shiftStats?.cashSales || 0).toFixed(2)}</span></div>
      <div class="row"><span>UPI</span><span>₹${(shiftStats?.upiSales || 0).toFixed(2)}</span></div>
      <div class="row"><span>Card</span><span>₹${(shiftStats?.cardSales || 0).toFixed(2)}</span></div>
      <hr>
      <div style="text-align:center">** SHIFT STILL OPEN **</div>
      </body></html>
    `)
    win.document.close(); win.focus()
    setTimeout(() => { win.print(); win.close() }, 300)
  }

  function printZReport() {
    const win = window.open('', '_blank', 'width=300,height=600')
    if (!win) return
    win.document.write(`
      <html><head><title>Z Report</title>
      <style>body{font-family:monospace;font-size:13px;padding:10px;width:280px}
      h2{text-align:center}hr{border:1px dashed #000}.row{display:flex;justify-content:space-between}
      .big{font-size:16px;font-weight:bold}</style>
      </head><body>
      <h2>Z REPORT (END OF SHIFT)</h2>
      <div style="text-align:center">${format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
      <hr>
      <div class="row"><span>Shift opened</span><span>${currentShift ? format(new Date(currentShift.opened_at), 'HH:mm') : '-'}</span></div>
      <div class="row"><span>Shift closed</span><span>${format(new Date(), 'HH:mm')}</span></div>
      <div class="row"><span>Opening cash</span><span>₹${currentShift?.opening_cash || 0}</span></div>
      <div class="row"><span>Closing cash</span><span>₹${closingCash}</span></div>
      <hr>
      <div class="row"><span>Total Bills</span><span>${shiftStats?.totalBills || 0}</span></div>
      <div class="row big"><span>TOTAL SALES</span><span>₹${(shiftStats?.totalSales || 0).toFixed(2)}</span></div>
      <hr>
      <div class="row"><span>Cash Sales</span><span>₹${(shiftStats?.cashSales || 0).toFixed(2)}</span></div>
      <div class="row"><span>UPI Sales</span><span>₹${(shiftStats?.upiSales || 0).toFixed(2)}</span></div>
      <div class="row"><span>Card Sales</span><span>₹${(shiftStats?.cardSales || 0).toFixed(2)}</span></div>
      <hr>
      <div style="text-align:center">** SHIFT CLOSED **</div>
      </body></html>
    `)
    win.document.close(); win.focus()
    setTimeout(() => { win.print(); win.close() }, 300)
  }

  return (
    <div className="p-4 max-w-xl mx-auto space-y-4">
      <h1 className="text-lg font-bold text-gray-900">Shift Management</h1>

      {!currentShift ? (
        <div className="card-pad space-y-4">
          <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
            <Lock className="w-5 h-5 text-red-600" />
            <div>
              <p className="font-semibold text-red-700">No shift open</p>
              <p className="text-xs text-red-600">Open a shift to start billing</p>
            </div>
          </div>
          <div>
            <label className="label">Opening cash in drawer (₹)</label>
            <input type="number" className="input" value={openingCash}
              onChange={e => setOpeningCash(+e.target.value)} placeholder="0.00" />
          </div>
          <button onClick={openShift} disabled={loading} className="btn-success btn-lg w-full">
            <Unlock className="w-5 h-5" /> Open Shift
          </button>
        </div>
      ) : (
        <>
          <div className="card-pad space-y-3">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
              <Unlock className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-semibold text-green-700">Shift is open</p>
                <p className="text-xs text-green-600">Since {format(new Date(currentShift.opened_at), 'hh:mm a')}</p>
              </div>
            </div>

            {shiftStats && (
              <div className="grid grid-cols-2 gap-3">
                <div className="card-pad text-center">
                  <p className="text-2xl font-bold text-blue-700">₹{shiftStats.totalSales.toFixed(0)}</p>
                  <p className="text-xs text-gray-500">Total sales</p>
                </div>
                <div className="card-pad text-center">
                  <p className="text-2xl font-bold text-green-700">{shiftStats.totalBills}</p>
                  <p className="text-xs text-gray-500">Bills</p>
                </div>
                <div className="card-pad text-center">
                  <p className="text-lg font-bold text-gray-700">₹{shiftStats.cashSales.toFixed(0)}</p>
                  <p className="text-xs text-gray-500">Cash</p>
                </div>
                <div className="card-pad text-center">
                  <p className="text-lg font-bold text-gray-700">₹{shiftStats.upiSales.toFixed(0)}</p>
                  <p className="text-xs text-gray-500">UPI</p>
                </div>
              </div>
            )}

            <button onClick={printXReport} className="btn-secondary w-full">
              <Printer className="w-4 h-4" /> Print X Report (Mid-shift)
            </button>
          </div>

          <div className="card-pad space-y-4">
            <p className="font-semibold text-gray-900">Close Shift</p>
            <div>
              <label className="label">Closing cash in drawer (₹)</label>
              <input type="number" className="input" value={closingCash}
                onChange={e => setClosingCash(+e.target.value)} placeholder="0.00" />
            </div>
            {shiftStats && closingCash > 0 && (
              <div className="bg-yellow-50 rounded-xl p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Expected cash</span>
                  <span className="font-semibold">₹{(currentShift.opening_cash + shiftStats.cashSales).toFixed(2)}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-gray-600">Actual cash</span>
                  <span className="font-semibold">₹{closingCash.toFixed(2)}</span>
                </div>
                <div className={`flex justify-between mt-1 font-bold ${closingCash >= currentShift.opening_cash + shiftStats.cashSales ? 'text-green-700' : 'text-red-700'}`}>
                  <span>Difference</span>
                  <span>₹{(closingCash - currentShift.opening_cash - shiftStats.cashSales).toFixed(2)}</span>
                </div>
              </div>
            )}
            <button onClick={closeShift} disabled={loading} className="btn-danger btn-lg w-full">
              <Lock className="w-5 h-5" /> {loading ? 'Closing...' : 'Close Shift & Print Z Report'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
