// @ts-nocheck
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { ArrowLeft, Printer, CheckCircle2, Tag, Banknote, CreditCard, Smartphone, Trash2, MessageCircle, Edit2, X, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'

export default function BillingScreen() {
  const navigate = useNavigate()
  const { id: orderId } = useParams()
  const { user } = useAuth()

  const [order, setOrder]           = useState(null)
  const [items, setItems]           = useState([])
  const [kots, setKots]             = useState([])
  const [restaurant, setRestaurant] = useState(null)
  const [discountType, setDiscountType]   = useState('percent')
  const [discountValue, setDiscountValue] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [cashGiven, setCashGiven]         = useState(0)
  const [customerPhone, setCustomerPhone] = useState('')
  const [loading, setLoading]             = useState(false)
  const [editingItem, setEditingItem]     = useState(null)
  const [showKOTs, setShowKOTs]           = useState(false)

  useEffect(() => { loadData() }, [orderId])

  async function loadData() {
    const [ordRes, itemRes, kotRes, restRes] = await Promise.all([
      supabase.from('orders').select('*, dining_tables(name)').eq('id', orderId).single(),
      supabase.from('order_items').select('*').eq('order_id', orderId).neq('status', 'cancelled'),
      supabase.from('kot').select('*').eq('order_id', orderId).order('printed_at'),
      supabase.from('restaurant').select('*').single(),
    ])
    setOrder(ordRes.data)
    setItems(itemRes.data || [])
    setKots(kotRes.data || [])
    setRestaurant(restRes.data)
    if (ordRes.data?.customer_phone) setCustomerPhone(ordRes.data.customer_phone)
  }

  const subtotal       = items.reduce((s, i) => s + i.item_price * i.quantity, 0)
  const cgstRate       = restaurant?.cgst_rate || 2.5
  const sgstRate       = restaurant?.sgst_rate || 2.5
  const discountAmount = discountType === 'flat'
    ? Math.min(discountValue, subtotal)
    : (subtotal * discountValue) / 100
  const taxable    = subtotal - discountAmount
  const cgstAmount = (taxable * cgstRate) / 100
  const sgstAmount = (taxable * sgstRate) / 100
  const totalAmount = taxable + cgstAmount + sgstAmount
  const changeAmount = paymentMethod === 'cash' ? Math.max(0, cashGiven - totalAmount) : 0

  async function removeItem(itemId, itemName) {
    if (!confirm(`Remove "${itemName}" from bill? (Item was not delivered)`)) return
    await supabase.from('order_items').update({ status: 'cancelled' }).eq('id', itemId)
    toast.success(`${itemName} removed from bill`)
    loadData()
  }

  async function saveItemEdit(itemId, newQty) {
    if (newQty <= 0) { await removeItem(itemId, 'Item'); return }
    await supabase.from('order_items').update({ quantity: newQty }).eq('id', itemId)
    setEditingItem(null)
    loadData()
  }

  async function generateBill() {
    if (items.length === 0) { toast.error('No items in order'); return }
    setLoading(true)
    try {
      const { data: bill, error } = await supabase.from('bills').insert({
        order_id:        orderId,
        subtotal,
        discount_type:   discountType,
        discount_value:  discountValue,
        discount_amount: discountAmount,
        cgst_rate:       cgstRate,
        sgst_rate:       sgstRate,
        cgst_amount:     cgstAmount,
        sgst_amount:     sgstAmount,
        total_amount:    totalAmount,
        payment_method:  paymentMethod,
        cash_given:      paymentMethod === 'cash' ? cashGiven : null,
        change_amount:   paymentMethod === 'cash' ? changeAmount : null,
        status:          'paid',
        created_by:      user?.id,
      }).select().single()
      if (error) throw error
      await supabase.from('orders').update({ status: 'paid', customer_phone: customerPhone || null }).eq('id', orderId)
      if (order?.table_id) await supabase.from('dining_tables').update({ status: 'available' }).eq('id', order.table_id)
      printBill(bill.bill_number)
      toast.success('Invoice generated! Table is now free.')
      navigate('/cashier')
    } catch (err) {
      toast.error(err.message || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  function printBill(billNumber) {
    const win = window.open('', '_blank', 'width=320,height=700')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><title>Invoice</title>
    <style>body{font-family:monospace;font-size:13px;margin:0;padding:10px;width:280px}
    h2{text-align:center;margin:0;font-size:16px}.sub{text-align:center;font-size:11px;margin:2px 0}
    hr{border:1px dashed #000;margin:6px 0}.row{display:flex;justify-content:space-between;padding:2px 0;font-size:12px}
    .total{font-weight:bold;font-size:15px;border-top:1px solid #000;padding-top:4px;margin-top:4px}
    .footer{text-align:center;margin-top:10px;font-size:11px}</style></head><body>
    <h2>${restaurant?.name || 'Restaurant'}</h2>
    ${restaurant?.address ? `<div class="sub">${restaurant.address}</div>` : ''}
    ${restaurant?.phone ? `<div class="sub">Ph: ${restaurant.phone}</div>` : ''}
    ${restaurant?.gstin ? `<div class="sub">GSTIN: ${restaurant.gstin}</div>` : ''}
    <hr><div class="sub">Invoice #${billNumber}</div>
    <div class="sub">${new Date().toLocaleString('en-IN')}</div>
    <div class="sub" style="font-weight:bold">${order?.dining_tables?.name ? 'Table: ' + order.dining_tables.name : 'Takeaway'}</div>
    <hr>
    ${items.map(i => `<div class="row"><span>${i.item_name}</span><span>${i.quantity}x</span><span>Rs.${(i.item_price*i.quantity).toFixed(2)}</span></div>`).join('')}
    <hr>
    <div class="row"><span>Subtotal</span><span>Rs.${subtotal.toFixed(2)}</span></div>
    ${discountAmount > 0 ? `<div class="row"><span>Discount</span><span>-Rs.${discountAmount.toFixed(2)}</span></div>` : ''}
    <div class="row" style="font-size:11px"><span>CGST @${cgstRate}%</span><span>Rs.${cgstAmount.toFixed(2)}</span></div>
    <div class="row" style="font-size:11px"><span>SGST @${sgstRate}%</span><span>Rs.${sgstAmount.toFixed(2)}</span></div>
    <div class="row total"><span>TOTAL</span><span>Rs.${totalAmount.toFixed(2)}</span></div>
    <hr><div class="row"><span>Payment</span><span>${paymentMethod.toUpperCase()}</span></div>
    ${paymentMethod === 'cash' ? `<div class="row"><span>Cash</span><span>Rs.${cashGiven.toFixed(2)}</span></div><div class="row"><span>Change</span><span>Rs.${changeAmount.toFixed(2)}</span></div>` : ''}
    <div class="footer">Thank you! Visit again</div>
    <div class="sub">Powered by RestaurantOS</div>
    </body></html>`)
    win.document.close(); win.focus()
    setTimeout(() => { win.print(); win.close() }, 300)
  }

  function sendWhatsApp() {
    if (!customerPhone) { toast.error('Enter customer phone number'); return }
    const msg = encodeURIComponent(
      `*${restaurant?.name || 'Restaurant'}*\nThank you for dining with us!\n\n` +
      `*Invoice Summary*\n${new Date().toLocaleString('en-IN')}\n` +
      `Table: ${order?.dining_tables?.name || 'Takeaway'}\n\n` +
      items.map(i => `${i.quantity}x ${i.item_name} - Rs.${(i.item_price*i.quantity).toFixed(0)}`).join('\n') +
      `\n\nSubtotal: Rs.${subtotal.toFixed(0)}\n` +
      `${discountAmount > 0 ? `Discount: -Rs.${discountAmount.toFixed(0)}\n` : ''}` +
      `GST: Rs.${(cgstAmount+sgstAmount).toFixed(0)}\n` +
      `*Total: Rs.${totalAmount.toFixed(0)}*\nPayment: ${paymentMethod.toUpperCase()}\n\nVisit again!`
    )
    window.open(`https://wa.me/91${customerPhone.replace(/\D/g,'')}?text=${msg}`, '_blank')
    toast.success('WhatsApp receipt opened!')
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <p className="font-bold text-gray-900">Generate Invoice</p>
          <p className="text-xs text-gray-500">
            {order?.dining_tables?.name ? `Table ${order.dining_tables.name}` : 'Takeaway'} · {items.length} items · {kots.length} KOTs
          </p>
        </div>
        <button onClick={() => setShowKOTs(!showKOTs)} className="text-xs text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg">
          KOTs ({kots.length})
        </button>
      </div>

      {showKOTs && (
        <div className="card-pad space-y-2">
          <p className="font-semibold text-gray-900 text-sm">KOT History</p>
          {kots.map((kot, i) => (
            <div key={kot.id} className="bg-orange-50 rounded-xl p-3">
              <p className="text-xs font-bold text-orange-700 mb-1">KOT #{i+1} · {new Date(kot.printed_at).toLocaleTimeString('en-IN')}</p>
              {kot.items?.map((item, j) => (
                <p key={j} className="text-xs text-gray-700">{item.quantity}x {item.name}{item.notes ? ` (${item.notes})` : ''}</p>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Editable items */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">Order Items</p>
          <span className="text-xs text-orange-600 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Edit before finalizing
          </span>
        </div>
        {items.length === 0 && (
          <p className="px-4 py-6 text-sm text-gray-400 text-center">No items in order</p>
        )}
        {items.map(item => (
          <div key={item.id} className={clsx('flex items-center gap-3 px-4 py-3 border-b border-gray-50', editingItem === item.id && 'bg-blue-50')}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{item.item_name}</p>
              <p className="text-xs text-gray-400">Rs.{item.item_price} each</p>
            </div>
            {editingItem === item.id ? (
              <div className="flex items-center gap-2">
                <input type="number" min={0} defaultValue={item.quantity} className="w-16 input text-center text-sm" id={`qty-${item.id}`} autoFocus />
                <button onClick={() => saveItemEdit(item.id, +document.getElementById(`qty-${item.id}`).value)} className="p-1.5 bg-green-600 text-white rounded-lg"><CheckCircle2 className="w-4 h-4" /></button>
                <button onClick={() => setEditingItem(null)} className="p-1.5 bg-gray-200 rounded-lg"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 text-sm">{item.quantity}x</span>
                <span className="font-semibold text-gray-900 min-w-[60px] text-right">Rs.{(item.item_price*item.quantity).toFixed(0)}</span>
                <button onClick={() => setEditingItem(item.id)} className="p-1.5 text-blue-400 hover:text-blue-600 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => removeItem(item.id, item.item_name)} className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Discount */}
      <div className="card-pad space-y-3">
        <div className="flex items-center gap-2"><Tag className="w-4 h-4 text-gray-500" /><p className="text-sm font-medium text-gray-700">Discount</p></div>
        <div className="flex gap-2">
          {['percent','flat'].map(t => (
            <button key={t} onClick={() => setDiscountType(t)} className={clsx('flex-1 py-2 rounded-xl text-sm font-medium border transition-all', discountType===t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200')}>
              {t==='percent' ? '% Off' : 'Rs. Flat'}
            </button>
          ))}
        </div>
        <input type="number" className="input" placeholder={discountType==='percent' ? 'Enter % (e.g. 10)' : 'Enter amount'} value={discountValue||''} onChange={e=>setDiscountValue(+e.target.value)} min={0} />
      </div>

      {/* Payment */}
      <div className="card-pad space-y-3">
        <p className="text-sm font-medium text-gray-700">Payment Method</p>
        <div className="grid grid-cols-3 gap-2">
          {[{m:'cash',label:'Cash',icon:Banknote},{m:'upi',label:'UPI',icon:Smartphone},{m:'card',label:'Card',icon:CreditCard}].map(({m,label,icon:Icon})=>(
            <button key={m} onClick={()=>setPaymentMethod(m)} className={clsx('flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-sm font-medium transition-all', paymentMethod===m ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600')}>
              <Icon className="w-5 h-5"/>{label}
            </button>
          ))}
        </div>
        {paymentMethod==='cash' && (
          <div>
            <label className="label">Cash Given (Rs.)</label>
            <input type="number" className="input" placeholder="0.00" value={cashGiven||''} onChange={e=>setCashGiven(+e.target.value)}/>
            {cashGiven>0 && <p className="text-sm mt-2 text-green-700 font-medium">Change: Rs.{changeAmount.toFixed(2)}</p>}
          </div>
        )}
      </div>

      {/* WhatsApp */}
      <div className="card-pad space-y-2">
        <div className="flex items-center gap-2"><MessageCircle className="w-4 h-4 text-green-500"/><p className="text-sm font-medium text-gray-700">WhatsApp Receipt</p></div>
        <div className="flex gap-2">
          <input type="tel" className="input flex-1" placeholder="Customer phone (98765 43210)" value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)}/>
          <button onClick={sendWhatsApp} disabled={!customerPhone} className="btn-secondary px-4 flex items-center gap-1.5">
            <MessageCircle className="w-4 h-4 text-green-500"/><span className="text-sm">Send</span>
          </button>
        </div>
        <p className="text-xs text-gray-400">Enter customer phone to send bill via WhatsApp</p>
      </div>

      {/* Summary */}
      <div className="card-pad space-y-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Invoice Summary</p>
        <div className="flex justify-between text-sm"><span className="text-gray-600">Subtotal</span><span>Rs.{subtotal.toFixed(2)}</span></div>
        {discountAmount>0 && <div className="flex justify-between text-sm text-red-600"><span>Discount</span><span>-Rs.{discountAmount.toFixed(2)}</span></div>}
        <div className="flex justify-between text-xs text-gray-500"><span>CGST @{cgstRate}%</span><span>Rs.{cgstAmount.toFixed(2)}</span></div>
        <div className="flex justify-between text-xs text-gray-500"><span>SGST @{sgstRate}%</span><span>Rs.{sgstAmount.toFixed(2)}</span></div>
        <div className="flex justify-between items-center pt-3 border-t border-gray-100">
          <span className="font-bold text-gray-900 text-lg">Total</span>
          <span className="font-bold text-gray-900 text-2xl">Rs.{totalAmount.toFixed(2)}</span>
        </div>
      </div>

      <div className="flex gap-3 pb-6">
        <button onClick={()=>printBill(0)} className="btn-secondary flex-1"><Printer className="w-4 h-4"/>Preview</button>
        <button onClick={generateBill} disabled={loading||items.length===0} className="btn-success flex-1 btn-lg">
          <CheckCircle2 className="w-5 h-5"/>{loading ? 'Processing...' : 'Collect & Print'}
        </button>
      </div>
    </div>
  )
}
