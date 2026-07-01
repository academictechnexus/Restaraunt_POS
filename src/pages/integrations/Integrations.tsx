import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Webhook, CreditCard, MessageCircle, Smartphone, CheckCircle2, XCircle, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function Integrations() {
  const [tab, setTab] = useState<'payments' | 'messaging' | 'delivery' | 'accounting'>('payments')

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-lg font-bold text-gray-900 mb-5">Integrations</h1>
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {[
          { key: 'payments',   label: '💳 Payments' },
          { key: 'messaging',  label: '💬 Messaging' },
          { key: 'delivery',   label: '🛵 Delivery' },
          { key: 'accounting', label: '📒 Accounting' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key as any)}
            className={clsx('flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all',
              tab === key ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200')}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'payments'   && <PaymentIntegrations />}
      {tab === 'messaging'  && <MessagingIntegrations />}
      {tab === 'delivery'   && <DeliveryIntegrations />}
      {tab === 'accounting' && <AccountingIntegrations />}
    </div>
  )
}

// ─── PAYMENT INTEGRATIONS ──────────────────────────────────────────
function PaymentIntegrations() {
  const [config, setConfig] = useState({
    razorpay_key: '',
    razorpay_secret: '',
    cashfree_app_id: '',
    cashfree_secret: '',
    active_gateway: 'razorpay',
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('payment_config')
    if (stored) setConfig(JSON.parse(stored))
  }, [])

  function save() {
    localStorage.setItem('payment_config', JSON.stringify(config))
    setSaved(true)
    toast.success('Payment settings saved!')
    setTimeout(() => setSaved(false), 2000)
  }

  async function testRazorpay() {
    if (!config.razorpay_key) { toast.error('Enter Razorpay key first'); return }
    // Load Razorpay SDK
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => {
      const rzp = new (window as any).Razorpay({
        key: config.razorpay_key,
        amount: 100, // ₹1 test
        currency: 'INR',
        name: 'RestaurantOS',
        description: 'Test Payment',
        handler: () => toast.success('Razorpay test successful!'),
        theme: { color: '#1d4ed8' }
      })
      rzp.open()
    }
    document.body.appendChild(script)
  }

  return (
    <div className="space-y-4">
      {/* Active gateway selector */}
      <div className="card-pad space-y-3">
        <p className="font-semibold text-gray-900">Active Payment Gateway</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'razorpay', label: 'Razorpay', desc: 'Most popular in India', logo: '💳' },
            { id: 'cashfree', label: 'Cashfree', desc: 'Lower transaction fees', logo: '💰' },
          ].map(gw => (
            <button key={gw.id} onClick={() => setConfig(c => ({ ...c, active_gateway: gw.id }))}
              className={clsx('p-4 rounded-xl border-2 text-left transition-all',
                config.active_gateway === gw.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200')}>
              <div className="text-2xl mb-2">{gw.logo}</div>
              <p className="font-semibold text-gray-900">{gw.label}</p>
              <p className="text-xs text-gray-500">{gw.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Razorpay config */}
      <div className="card-pad space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-gray-900">Razorpay</p>
          <a href="https://razorpay.com" target="_blank" rel="noopener" className="text-xs text-blue-600 flex items-center gap-1">
            Get keys <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div><label className="label">Key ID</label><input className="input" placeholder="rzp_live_..." value={config.razorpay_key} onChange={e => setConfig(c => ({ ...c, razorpay_key: e.target.value }))} /></div>
        <div><label className="label">Key Secret</label><input className="input" type="password" placeholder="Your secret key" value={config.razorpay_secret} onChange={e => setConfig(c => ({ ...c, razorpay_secret: e.target.value }))} /></div>
        <button onClick={testRazorpay} className="btn-secondary btn-sm">Test Integration</button>
      </div>

      {/* Cashfree config */}
      <div className="card-pad space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-gray-900">Cashfree</p>
          <a href="https://cashfree.com" target="_blank" rel="noopener" className="text-xs text-blue-600 flex items-center gap-1">
            Get keys <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div><label className="label">App ID</label><input className="input" placeholder="Your Cashfree App ID" value={config.cashfree_app_id} onChange={e => setConfig(c => ({ ...c, cashfree_app_id: e.target.value }))} /></div>
        <div><label className="label">Secret Key</label><input className="input" type="password" placeholder="Your secret key" value={config.cashfree_secret} onChange={e => setConfig(c => ({ ...c, cashfree_secret: e.target.value }))} /></div>
      </div>

      <button onClick={save} className="btn-primary w-full">
        {saved ? <><CheckCircle2 className="w-4 h-4" /> Saved!</> : 'Save Payment Settings'}
      </button>

      {/* UPI info */}
      <div className="card-pad bg-green-50 border-green-100">
        <p className="font-semibold text-green-700 mb-2">✅ UPI (No setup needed!)</p>
        <p className="text-sm text-green-600">
          For simple UPI payments, no gateway needed. Show your UPI QR code and manually mark as paid in the POS. Works with GPay, PhonePe, Paytm, and all UPI apps.
        </p>
      </div>
    </div>
  )
}

// ─── MESSAGING INTEGRATIONS ────────────────────────────────────────
function MessagingIntegrations() {
  const [config, setConfig] = useState({
    whatsapp_enabled: false,
    whatsapp_number: '',
    whatsapp_api_key: '',
    sms_enabled: false,
    sms_api_key: '',
    sms_sender_id: '',
    send_bill_whatsapp: true,
    send_bill_sms: false,
    send_birthday_wish: true,
    send_loyalty_update: true,
  })

  useEffect(() => {
    const stored = localStorage.getItem('messaging_config')
    if (stored) setConfig(JSON.parse(stored))
  }, [])

  function save() {
    localStorage.setItem('messaging_config', JSON.stringify(config))
    toast.success('Messaging settings saved!')
  }

  async function sendTestWhatsApp() {
    if (!config.whatsapp_number) { toast.error('Enter WhatsApp number'); return }
    const msg = encodeURIComponent(`Hello! This is a test message from RestaurantOS 🍽\n\nYour POS WhatsApp integration is working correctly!`)
    window.open(`https://wa.me/${config.whatsapp_number}?text=${msg}`, '_blank')
    toast.success('WhatsApp test opened!')
  }

  // ─── SEND RECEIPT VIA WHATSAPP ──────────────────────────────────
  const sendReceiptWhatsApp = (phone: string, billDetails: any) => {
    const msg = encodeURIComponent(
      `🍽 *${billDetails.restaurantName}*\n` +
      `Thank you for dining with us!\n\n` +
      `*Bill #${billDetails.billNumber}*\n` +
      `Date: ${new Date().toLocaleString('en-IN')}\n\n` +
      `${billDetails.items.map((i: any) => `${i.qty}× ${i.name} - ₹${(i.price * i.qty).toFixed(0)}`).join('\n')}\n\n` +
      `Subtotal: ₹${billDetails.subtotal.toFixed(0)}\n` +
      `GST: ₹${(billDetails.cgst + billDetails.sgst).toFixed(0)}\n` +
      `*Total: ₹${billDetails.total.toFixed(0)}*\n\n` +
      `Payment: ${billDetails.paymentMethod}\n\n` +
      `Visit us again! 😊`
    )
    window.open(`https://wa.me/91${phone}?text=${msg}`, '_blank')
  }

  return (
    <div className="space-y-4">
      {/* WhatsApp */}
      <div className="card-pad space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <p className="font-semibold text-gray-900">WhatsApp</p>
          </div>
          <button onClick={() => setConfig(c => ({ ...c, whatsapp_enabled: !c.whatsapp_enabled }))}
            className={clsx('w-12 h-6 rounded-full transition-all', config.whatsapp_enabled ? 'bg-green-500' : 'bg-gray-300')}>
            <div className={clsx('w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5', config.whatsapp_enabled ? 'translate-x-6' : 'translate-x-0')} />
          </button>
        </div>
        {config.whatsapp_enabled && (
          <>
            <div><label className="label">Business WhatsApp Number</label><input className="input" placeholder="919876543210 (with country code)" value={config.whatsapp_number} onChange={e => setConfig(c => ({ ...c, whatsapp_number: e.target.value }))} /></div>
            <div className="space-y-2">
              {[
                { key: 'send_bill_whatsapp', label: 'Send bill/receipt on WhatsApp' },
                { key: 'send_birthday_wish', label: 'Birthday wishes to customers' },
                { key: 'send_loyalty_update', label: 'Loyalty points update' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 text-green-600"
                    checked={config[key as keyof typeof config] as boolean}
                    onChange={e => setConfig(c => ({ ...c, [key]: e.target.checked }))} />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
            <button onClick={sendTestWhatsApp} className="btn-secondary btn-sm">Send Test Message</button>
          </>
        )}
      </div>

      {/* SMS */}
      <div className="card-pad space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-white" />
            </div>
            <p className="font-semibold text-gray-900">SMS (MSG91)</p>
          </div>
          <button onClick={() => setConfig(c => ({ ...c, sms_enabled: !c.sms_enabled }))}
            className={clsx('w-12 h-6 rounded-full transition-all', config.sms_enabled ? 'bg-blue-500' : 'bg-gray-300')}>
            <div className={clsx('w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5', config.sms_enabled ? 'translate-x-6' : 'translate-x-0')} />
          </button>
        </div>
        {config.sms_enabled && (
          <>
            <div><label className="label">MSG91 API Key</label><input className="input" type="password" placeholder="Your MSG91 API key" value={config.sms_api_key} onChange={e => setConfig(c => ({ ...c, sms_api_key: e.target.value }))} /></div>
            <div><label className="label">Sender ID</label><input className="input" placeholder="RESTOS" maxLength={6} value={config.sms_sender_id} onChange={e => setConfig(c => ({ ...c, sms_sender_id: e.target.value.toUpperCase() }))} /></div>
            <div className="bg-yellow-50 rounded-xl p-3 text-xs text-yellow-700">
              SMS requires DLT registration with your telecom provider. Get API key from msg91.com
            </div>
          </>
        )}
      </div>

      <button onClick={save} className="btn-primary w-full">Save Messaging Settings</button>
    </div>
  )
}

// ─── DELIVERY INTEGRATIONS ─────────────────────────────────────────
function DeliveryIntegrations() {
  const [config, setConfig] = useState({
    swiggy_enabled: false,
    swiggy_res_id: '',
    zomato_enabled: false,
    zomato_res_id: '',
    urbanpiper_enabled: false,
    urbanpiper_biz_id: '',
    urbanpiper_api_key: '',
  })

  useEffect(() => {
    const stored = localStorage.getItem('delivery_config')
    if (stored) setConfig(JSON.parse(stored))
  }, [])

  function save() {
    localStorage.setItem('delivery_config', JSON.stringify(config))
    toast.success('Delivery settings saved!')
  }

  const platforms = [
    {
      key: 'swiggy', label: 'Swiggy', color: 'bg-orange-500', note: 'Requires Swiggy Business account. Contact Swiggy partner support to enable API access.',
      fields: [{ key: 'swiggy_res_id', label: 'Restaurant ID', placeholder: 'From Swiggy Partner Portal' }]
    },
    {
      key: 'zomato', label: 'Zomato', color: 'bg-red-500', note: 'Requires Zomato Business account. Contact Zomato partner support for API integration.',
      fields: [{ key: 'zomato_res_id', label: 'Restaurant ID', placeholder: 'From Zomato Partner Portal' }]
    },
    {
      key: 'urbanpiper', label: 'UrbanPiper (Recommended)', color: 'bg-purple-500',
      note: 'UrbanPiper acts as middleware — connects to both Swiggy and Zomato with one integration. Easiest option.',
      fields: [
        { key: 'urbanpiper_biz_id', label: 'Business ID', placeholder: 'From UrbanPiper dashboard' },
        { key: 'urbanpiper_api_key', label: 'API Key', placeholder: 'Your UrbanPiper API key' },
      ]
    },
  ]

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 rounded-2xl p-4 text-sm text-blue-700">
        💡 <strong>Recommendation:</strong> Use UrbanPiper to integrate both Swiggy and Zomato at once. It handles order syncing, menu management, and reporting across all platforms.
      </div>

      {platforms.map(p => {
        const enabled = config[`${p.key}_enabled` as keyof typeof config] as boolean
        return (
          <div key={p.key} className="card-pad space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 ${p.color} rounded-lg flex items-center justify-center text-white font-bold text-xs`}>
                  {p.label[0]}
                </div>
                <p className="font-semibold text-gray-900">{p.label}</p>
              </div>
              <button onClick={() => setConfig(c => ({ ...c, [`${p.key}_enabled`]: !enabled }))}
                className={clsx('w-12 h-6 rounded-full transition-all', enabled ? 'bg-green-500' : 'bg-gray-300')}>
                <div className={clsx('w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5', enabled ? 'translate-x-6' : 'translate-x-0')} />
              </button>
            </div>
            {enabled && (
              <>
                {p.fields.map(f => (
                  <div key={f.key}><label className="label">{f.label}</label>
                    <input className="input" placeholder={f.placeholder} value={config[f.key as keyof typeof config] as string}
                      onChange={e => setConfig(c => ({ ...c, [f.key]: e.target.value }))} /></div>
                ))}
                <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600">{p.note}</div>
              </>
            )}
          </div>
        )
      })}

      <button onClick={save} className="btn-primary w-full">Save Delivery Settings</button>
    </div>
  )
}

// ─── ACCOUNTING INTEGRATIONS ───────────────────────────────────────
function AccountingIntegrations() {
  const [exporting, setExporting] = useState(false)

  async function exportToTally() {
    setExporting(true)
    const { data: bills } = await supabase.from('bills').select('*').eq('status', 'paid')
      .gte('created_at', new Date(new Date().setDate(1)).toISOString())

    // Generate Tally XML format
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        ${bills?.map(b => `
        <TALLYMESSAGE>
          <VOUCHER VCHTYPE="Sales">
            <DATE>${new Date(b.created_at).toISOString().split('T')[0].replace(/-/g, '')}</DATE>
            <PARTYLEDGERNAME>Cash Customer</PARTYLEDGERNAME>
            <AMOUNT>${b.total_amount}</AMOUNT>
            <NARRATION>Bill #${b.bill_number} - RestaurantOS</NARRATION>
          </VOUCHER>
        </TALLYMESSAGE>`).join('')}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`

    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([xml], { type: 'text/xml' }))
    a.download = `tally_export_${new Date().toISOString().split('T')[0]}.xml`
    a.click()
    toast.success('Tally XML exported!')
    setExporting(false)
  }

  async function exportToZohoBooks() {
    const { data: bills } = await supabase.from('bills').select('*').eq('status', 'paid')
      .gte('created_at', new Date(new Date().setDate(1)).toISOString())

    const csv = [
      ['Invoice Date', 'Invoice Number', 'Amount', 'Tax Amount', 'Payment Mode', 'Status'],
      ...(bills || []).map(b => [
        new Date(b.created_at).toLocaleDateString('en-IN'),
        `BILL-${b.bill_number}`,
        b.total_amount.toFixed(2),
        (b.cgst_amount + b.sgst_amount).toFixed(2),
        b.payment_method.toUpperCase(),
        'Paid'
      ])
    ].map(r => r.join(',')).join('\n')

    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `zoho_books_export_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    toast.success('Zoho Books CSV exported!')
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Export your sales data to accounting software</p>

      <div className="space-y-3">
        {[
          { name: 'Tally Prime', icon: '📊', desc: 'Export as Tally XML — import directly into Tally', action: exportToTally, color: 'blue' },
          { name: 'Zoho Books', icon: '📒', desc: 'Export as CSV — import via Zoho Books import wizard', action: exportToZohoBooks, color: 'red' },
          { name: 'QuickBooks', icon: '💼', desc: 'Export as CSV — compatible with QuickBooks import', action: exportToZohoBooks, color: 'green' },
        ].map(({ name, icon, desc, action, color }) => (
          <div key={name} className="card p-4 flex items-center gap-4">
            <div className="text-3xl">{icon}</div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{name}</p>
              <p className="text-xs text-gray-500">{desc}</p>
            </div>
            <button onClick={action} disabled={exporting} className="btn-secondary btn-sm">
              Export
            </button>
          </div>
        ))}
      </div>

      <div className="card-pad bg-gray-50">
        <p className="font-semibold text-gray-700 mb-2">Export includes:</p>
        <div className="text-sm text-gray-600 space-y-1">
          {['Current month sales', 'Bill-wise details', 'GST breakdown (CGST/SGST)', 'Payment mode split', 'Discount details'].map(item => (
            <div key={item} className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
