import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { Order, OrderItem, Restaurant, PaymentMethod } from '@/types/database'
import { ArrowLeft, Printer, CheckCircle2, Tag, Banknote, CreditCard, Smartphone } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'

export default function BillingScreen() {
  const navigate = useNavigate()
  const { id: orderId } = useParams()
  const { user } = useAuth()

  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [discountType, setDiscountType] = useState<'flat' | 'percent'>('percent')
  const [discountValue, setDiscountValue] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [cashGiven, setCashGiven] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const [ordRes, itemRes, restRes] = await Promise.all([
        supabase.from('orders').select('*').eq('id', orderId!).single(),
        supabase.from('order_items').select('*').eq('order_id', orderId!).neq('status', 'cancelled'),
        supabase.from('restaurant').select('*').limit(1).single(),
      ])
      setOrder(ordRes.data)
      setItems(itemRes.data || [])
      setRestaurant(restRes.data)
    }
    load()
  }, [orderId])

  const subtotal = items.reduce((sum, i) => sum + i.item_price * i.quantity, 0)
  const cgstRate = restaurant?.cgst_rate || 2.5
  const sgstRate = restaurant?.sgst_rate || 2.5

  const discountAmount = discountType === 'flat'
    ? Math.min(discountValue, subtotal)
    : (subtotal * discountValue) / 100

  const taxable = subtotal - discountAmount
  const cgstAmount = (taxable * cgstRate) / 100
  const sgstAmount = (taxable * sgstRate) / 100
  const totalAmount = taxable + cgstAmount + sgstAmount
  const changeAmount = paymentMethod === 'cash' ? Math.max(0, cashGiven - totalAmount) : 0

  async function generateBill() {
    setLoading(true)
    try {
      const { data: bill, error } = await supabase.from('bills').insert({
        order_id: orderId!,
        subtotal,
        discount_type: discountType,
        discount_value: discountValue,
        discount_amount: discountAmount,
        cgst_rate: cgstRate,
        sgst_rate: sgstRate,
        cgst_amount: cgstAmount,
        sgst_amount: sgstAmount,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        cash_given: paymentMethod === 'cash' ? cashGiven : null,
        change_amount: paymentMethod === 'cash' ? changeAmount : null,
        status: 'paid',
        created_by: user?.id,
      }).select().single()

      if (error) throw error

      // Update order status to paid
      await supabase.from('orders').update({ status: 'paid' }).eq('id', orderId!)

      // Free the table
      if (order?.table_id) {
        await supabase.from('dining_tables').update({ status: 'available' }).eq('id', order.table_id)
      }

      // Print receipt
      printBill(bill.bill_number)

      toast.success('Bill generated! Table is now free.')
      navigate('/cashier')
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate bill')
    } finally {
      setLoading(false)
    }
  }

  function printBill(billNumber: number) {
    const win = window.open('', '_blank', 'width=300,height=600')
    if (!win) return
    win.document.write(`
      <html><head><title>Receipt</title>
      <style>
        body { font-family: monospace; font-size: 13px; margin: 0; padding: 10px; width: 280px; }
        h2 { text-align:center; margin:0; font-size:16px; }
        .sub { text-align:center; font-size:11px; margin: 3px 0; }
        hr { border: 1px dashed #000; margin: 6px 0; }
        table { width:100%; }
        td { padding: 2px 0; font-size: 12px; }
        .right { text-align:right; }
        .bold { font-weight:bold; }
        .total-row td { font-weight:bold; font-size:14px; border-top: 1px solid #000; padding-top:4px; }
        .tax-row td { font-size: 11px; color: #555; }
        .footer { text-align:center; margin-top:10px; font-size:11px; }
      </style></head>
      <body>
      <h2>${restaurant?.name || 'Restaurant'}</h2>
      ${restaurant?.address ? `<div class="sub">${restaurant.address}</div>` : ''}
      ${restaurant?.phone ? `<div class="sub">Ph: ${restaurant.phone}</div>` : ''}
      ${restaurant?.gstin ? `<div class="sub">GSTIN: ${restaurant.gstin}</div>` : ''}
      <hr>
      <div class="sub">Bill #${billNumber} · ${new Date().toLocaleString()}</div>
      ${order?.table_id ? `<div class="sub bold">Table: T${order.order_number}</div>` : '<div class="sub">Takeaway</div>'}
      <hr>
      <table>
        <tr><td>Item</td><td class="right">Qty</td><td class="right">Amt</td></tr>
        <tr><td colspan="3"><hr style="margin:2px 0"></td></tr>
        ${items.map(i => `<tr><td>${i.item_name}</td><td class="right">${i.quantity}</td><td class="right">₹${(i.item_price * i.quantity).toFixed(2)}</td></tr>`).join('')}
        <tr><td colspan="3"><hr style="margin:2px 0"></td></tr>
        <tr><td colspan="2">Subtotal</td><td class="right">₹${subtotal.toFixed(2)}</td></tr>
        ${discountAmount > 0 ? `<tr class="tax-row"><td colspan="2">Discount</td><td class="right">-₹${discountAmount.toFixed(2)}</td></tr>` : ''}
        <tr class="tax-row"><td colspan="2">CGST @${cgstRate}%</td><td class="right">₹${cgstAmount.toFixed(2)}</td></tr>
        <tr class="tax-row"><td colspan="2">SGST @${sgstRate}%</td><td class="right">₹${sgstAmount.toFixed(2)}</td></tr>
        <tr class="total-row"><td colspan="2">TOTAL</td><td class="right">₹${totalAmount.toFixed(2)}</td></tr>
        ${paymentMethod === 'cash' ? `
        <tr><td colspan="2">Cash</td><td class="right">₹${cashGiven.toFixed(2)}</td></tr>
        <tr><td colspan="2">Change</td><td class="right">₹${changeAmount.toFixed(2)}</td></tr>
        ` : `<tr><td colspan="2">Paid via</td><td class="right">${paymentMethod.toUpperCase()}</td></tr>`}
      </table>
      <hr>
      <div class="footer">Thank you! Visit again 🙏</div>
      ${restaurant?.fssai ? `<div class="sub">FSSAI: ${restaurant.fssai}</div>` : ''}
      </body></html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 300)
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <p className="font-bold text-gray-900">Generate Bill</p>
          <p className="text-xs text-gray-500">Order #{order?.order_number}</p>
        </div>
      </div>

      {/* Items */}
      <div className="card-pad space-y-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Order Items</p>
        {items.map(i => (
          <div key={i.id} className="flex justify-between text-sm">
            <span className="text-gray-700">{i.quantity}× {i.item_name}</span>
            <span className="font-medium text-gray-900">₹{(i.item_price * i.quantity).toFixed(2)}</span>
          </div>
        ))}
        <div className="pt-2 border-t border-gray-100 flex justify-between text-sm font-semibold">
          <span>Subtotal</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Discount */}
      <div className="card-pad space-y-3">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-gray-500" />
          <p className="text-sm font-medium text-gray-700">Discount</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setDiscountType('percent')}
            className={clsx('flex-1 py-2 rounded-xl text-sm font-medium border transition-all',
              discountType === 'percent' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200')}
          >
            %
          </button>
          <button
            onClick={() => setDiscountType('flat')}
            className={clsx('flex-1 py-2 rounded-xl text-sm font-medium border transition-all',
              discountType === 'flat' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200')}
          >
            ₹ Flat
          </button>
        </div>
        <input
          type="number"
          className="input"
          placeholder={discountType === 'percent' ? 'Enter % (e.g. 10)' : 'Enter amount (e.g. 50)'}
          value={discountValue || ''}
          onChange={e => setDiscountValue(Number(e.target.value))}
          min={0}
          max={discountType === 'percent' ? 100 : subtotal}
        />
      </div>

      {/* Payment mode */}
      <div className="card-pad space-y-3">
        <p className="text-sm font-medium text-gray-700">Payment Method</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { method: 'cash' as PaymentMethod, label: 'Cash', icon: Banknote },
            { method: 'upi'  as PaymentMethod, label: 'UPI',  icon: Smartphone },
            { method: 'card' as PaymentMethod, label: 'Card', icon: CreditCard },
          ].map(({ method, label, icon: Icon }) => (
            <button
              key={method}
              onClick={() => setPaymentMethod(method)}
              className={clsx(
                'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-sm font-medium transition-all',
                paymentMethod === method
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600'
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </button>
          ))}
        </div>

        {paymentMethod === 'cash' && (
          <div>
            <label className="label">Cash Given</label>
            <input
              type="number"
              className="input"
              placeholder="0.00"
              value={cashGiven || ''}
              onChange={e => setCashGiven(Number(e.target.value))}
            />
            {cashGiven > 0 && (
              <p className="text-sm mt-2 text-green-700 font-medium">
                Change: ₹{changeAmount.toFixed(2)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Bill summary */}
      <div className="card-pad space-y-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Bill Summary</p>
        <Row label="Subtotal" value={`₹${subtotal.toFixed(2)}`} />
        {discountAmount > 0 && <Row label="Discount" value={`-₹${discountAmount.toFixed(2)}`} className="text-red-600" />}
        <Row label={`CGST @${cgstRate}%`} value={`₹${cgstAmount.toFixed(2)}`} small />
        <Row label={`SGST @${sgstRate}%`} value={`₹${sgstAmount.toFixed(2)}`} small />
        <div className="flex justify-between items-center pt-3 border-t border-gray-100">
          <span className="font-bold text-gray-900 text-lg">Total</span>
          <span className="font-bold text-gray-900 text-2xl">₹{totalAmount.toFixed(2)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 safe-bottom pb-4">
        <button
          onClick={() => printBill(0)}
          className="btn-secondary flex-1"
        >
          <Printer className="w-4 h-4" />
          Preview
        </button>
        <button
          onClick={generateBill}
          disabled={loading || (paymentMethod === 'cash' && cashGiven > 0 && cashGiven < totalAmount)}
          className="btn-success flex-1 btn-lg"
        >
          <CheckCircle2 className="w-5 h-5" />
          {loading ? 'Processing...' : 'Collect & Print'}
        </button>
      </div>
    </div>
  )
}

function Row({ label, value, small, className }: { label: string; value: string; small?: boolean; className?: string }) {
  return (
    <div className={clsx('flex justify-between', small ? 'text-xs text-gray-500' : 'text-sm text-gray-700')}>
      <span>{label}</span>
      <span className={clsx('font-medium', className)}>{value}</span>
    </div>
  )
}
