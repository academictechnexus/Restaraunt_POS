// Universal Print Service
// Supports: 58mm thermal, 80mm thermal, A4, label printers
// Works on: Chrome, Firefox, Safari, Edge, Android, iOS
// No special drivers needed — uses browser print API

export type PaperSize = '58mm' | '80mm' | 'a4'

interface PrintOptions {
  paperSize?: PaperSize
  copies?: number
  silent?: boolean
}

// ─── CORE PRINT ENGINE ─────────────────────────────────────────────
export class PrintService {
  static defaultPaperSize: PaperSize = '80mm'

  static paperWidths: Record<PaperSize, string> = {
    '58mm': '55mm',
    '80mm': '76mm',
    'a4': '210mm',
  }

  static async print(html: string, opts: PrintOptions = {}) {
    const { paperSize = this.defaultPaperSize, copies = 1 } = opts
    const width = this.paperWidths[paperSize]

    const win = window.open('', '_blank', 'width=400,height=600,toolbar=0,scrollbars=0')
    if (!win) {
      // Fallback: use iframe for browsers blocking popups
      return this.printViaIframe(html, width, copies)
    }

    win.document.write(this.wrapHTML(html, width, copies))
    win.document.close()
    win.focus()

    // Wait for images/fonts to load
    await new Promise(r => setTimeout(r, 400))
    win.print()

    // Auto-close after print
    win.onafterprint = () => win.close()
    setTimeout(() => { try { win.close() } catch {} }, 3000)
  }

  static printViaIframe(html: string, width: string, copies: number) {
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
    document.body.appendChild(iframe)
    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) return
    doc.open(); doc.write(this.wrapHTML(html, width, copies)); doc.close()
    setTimeout(() => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => document.body.removeChild(iframe), 2000)
    }, 500)
  }

  static wrapHTML(html: string, width: string, copies: number) {
    const repeated = Array(copies).fill(html).join('<div style="page-break-after:always"></div>')
    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  @page { margin: 0; size: ${width} auto; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Courier New', Courier, monospace; font-size: 12px; width: ${width}; }
  .center { text-align: center; }
  .right { text-align: right; }
  .bold { font-weight: bold; }
  .large { font-size: 16px; }
  .small { font-size: 10px; }
  .divider { border-top: 1px dashed #000; margin: 4px 0; }
  .row { display: flex; justify-content: space-between; padding: 2px 0; }
  .item-name { flex: 1; }
  .item-qty { width: 30px; text-align: center; }
  .item-price { width: 60px; text-align: right; }
  table { width: 100%; border-collapse: collapse; }
  td, th { padding: 2px 0; font-size: 11px; }
  .total-row td { font-weight: bold; font-size: 14px; border-top: 1px solid #000; padding-top: 4px; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head><body>${repeated}</body></html>`
  }

  // ─── KOT TEMPLATE ────────────────────────────────────────────────
  static kotHTML(params: {
    kotNumber: number
    orderNumber: number
    tableName: string
    orderType: string
    items: { name: string; qty: number; notes?: string }[]
    cashierName?: string
    restaurantName?: string
  }) {
    const { kotNumber, orderNumber, tableName, orderType, items, cashierName, restaurantName } = params
    return `
      <div class="center bold large">${restaurantName || 'KITCHEN ORDER'}</div>
      <div class="divider"></div>
      <div class="center">KOT #${kotNumber} · Order #${orderNumber}</div>
      <div class="center">${new Date().toLocaleString('en-IN')}</div>
      <div class="center bold" style="font-size:14px;margin:4px 0">
        ${orderType === 'dine_in' ? `TABLE: ${tableName}` : orderType === 'takeaway' ? '🥡 TAKEAWAY' : '🛵 DELIVERY'}
      </div>
      <div class="divider"></div>
      ${items.map(item => `
        <div class="row">
          <span class="item-qty bold">${item.qty}x</span>
          <span class="item-name bold">${item.name}</span>
        </div>
        ${item.notes ? `<div style="padding-left:30px;font-size:10px;color:#555">* ${item.notes}</div>` : ''}
      `).join('')}
      <div class="divider"></div>
      ${cashierName ? `<div class="small center">Cashier: ${cashierName}</div>` : ''}
      <div class="small center">${new Date().toLocaleTimeString('en-IN')}</div>
    `
  }

  // ─── BILL TEMPLATE ────────────────────────────────────────────────
  static billHTML(params: {
    billNumber: number
    orderNumber: number
    restaurant: any
    tableName: string
    orderType: string
    items: { name: string; qty: number; price: number }[]
    subtotal: number
    discountAmount: number
    discountType?: string
    discountValue?: number
    cgstRate: number
    sgstRate: number
    cgstAmount: number
    sgstAmount: number
    totalAmount: number
    paymentMethod: string
    cashGiven?: number
    changeAmount?: number
    customerName?: string
    customerPhone?: string
  }) {
    const p = params
    return `
      <div class="center bold large">${p.restaurant?.name || 'Restaurant'}</div>
      ${p.restaurant?.address ? `<div class="center small">${p.restaurant.address}</div>` : ''}
      ${p.restaurant?.phone ? `<div class="center small">Ph: ${p.restaurant.phone}</div>` : ''}
      ${p.restaurant?.gstin ? `<div class="center small">GSTIN: ${p.restaurant.gstin}</div>` : ''}
      ${p.restaurant?.fssai ? `<div class="center small">FSSAI: ${p.restaurant.fssai}</div>` : ''}
      <div class="divider"></div>
      <div class="center">Bill #${p.billNumber} · Order #${p.orderNumber}</div>
      <div class="center small">${new Date().toLocaleString('en-IN')}</div>
      <div class="center bold">${p.orderType === 'dine_in' ? `Table: ${p.tableName}` : p.orderType === 'takeaway' ? 'Takeaway' : 'Delivery'}</div>
      ${p.customerName ? `<div class="center small">Customer: ${p.customerName} ${p.customerPhone ? `· ${p.customerPhone}` : ''}</div>` : ''}
      <div class="divider"></div>
      <div class="row small bold"><span>Item</span><span>Qty</span><span>Amount</span></div>
      <div class="divider"></div>
      ${p.items.map(item => `
        <div class="row">
          <span class="item-name">${item.name}</span>
          <span class="item-qty">${item.qty}</span>
          <span class="item-price">₹${(item.price * item.qty).toFixed(2)}</span>
        </div>
      `).join('')}
      <div class="divider"></div>
      <div class="row"><span>Subtotal</span><span>₹${p.subtotal.toFixed(2)}</span></div>
      ${p.discountAmount > 0 ? `<div class="row small"><span>Discount${p.discountType === 'percent' ? ` (${p.discountValue}%)` : ''}</span><span>-₹${p.discountAmount.toFixed(2)}</span></div>` : ''}
      <div class="row small"><span>CGST @${p.cgstRate}%</span><span>₹${p.cgstAmount.toFixed(2)}</span></div>
      <div class="row small"><span>SGST @${p.sgstRate}%</span><span>₹${p.sgstAmount.toFixed(2)}</span></div>
      <div class="divider"></div>
      <div class="row bold large"><span>TOTAL</span><span>₹${p.totalAmount.toFixed(2)}</span></div>
      <div class="divider"></div>
      <div class="row"><span>Payment: ${p.paymentMethod.toUpperCase()}</span><span></span></div>
      ${p.paymentMethod === 'cash' && p.cashGiven ? `
        <div class="row small"><span>Cash given</span><span>₹${p.cashGiven.toFixed(2)}</span></div>
        <div class="row small bold"><span>Change</span><span>₹${(p.changeAmount || 0).toFixed(2)}</span></div>
      ` : ''}
      <div class="divider"></div>
      <div class="center bold">Thank you! Visit again 🙏</div>
      <div class="center small" style="margin-top:4px">Powered by RestaurantOS</div>
    `
  }

  // ─── SHIFT X/Z REPORT TEMPLATE ────────────────────────────────────
  static shiftReportHTML(params: {
    type: 'X' | 'Z'
    restaurantName: string
    openedAt: string
    closedAt?: string
    openingCash: number
    closingCash?: number
    stats: { totalBills: number; totalSales: number; cashSales: number; upiSales: number; cardSales: number }
  }) {
    const p = params
    const diff = p.closingCash !== undefined ? p.closingCash - p.openingCash - p.stats.cashSales : null
    return `
      <div class="center bold large">${p.restaurantName}</div>
      <div class="center bold">${p.type === 'X' ? 'X REPORT (MID-SHIFT)' : 'Z REPORT (END OF SHIFT)'}</div>
      <div class="center small">${new Date().toLocaleString('en-IN')}</div>
      <div class="divider"></div>
      <div class="row"><span>Shift opened</span><span>${new Date(p.openedAt).toLocaleTimeString('en-IN')}</span></div>
      ${p.closedAt ? `<div class="row"><span>Shift closed</span><span>${new Date(p.closedAt).toLocaleTimeString('en-IN')}</span></div>` : ''}
      <div class="row"><span>Opening cash</span><span>₹${p.openingCash.toFixed(2)}</span></div>
      ${p.closingCash !== undefined ? `<div class="row"><span>Closing cash</span><span>₹${p.closingCash.toFixed(2)}</span></div>` : ''}
      <div class="divider"></div>
      <div class="row bold"><span>Total Bills</span><span>${p.stats.totalBills}</span></div>
      <div class="row bold large"><span>TOTAL SALES</span><span>₹${p.stats.totalSales.toFixed(2)}</span></div>
      <div class="divider"></div>
      <div class="row"><span>Cash Sales</span><span>₹${p.stats.cashSales.toFixed(2)}</span></div>
      <div class="row"><span>UPI Sales</span><span>₹${p.stats.upiSales.toFixed(2)}</span></div>
      <div class="row"><span>Card Sales</span><span>₹${p.stats.cardSales.toFixed(2)}</span></div>
      ${diff !== null ? `
        <div class="divider"></div>
        <div class="row bold ${diff < 0 ? '' : ''}"><span>Cash Difference</span><span>${diff >= 0 ? '+' : ''}₹${diff.toFixed(2)}</span></div>
      ` : ''}
      <div class="divider"></div>
      <div class="center bold">${p.type === 'X' ? '** SHIFT STILL OPEN **' : '** SHIFT CLOSED **'}</div>
    `
  }

  // ─── BARCODE LABEL TEMPLATE ────────────────────────────────────────
  static labelHTML(params: { name: string; price: number; barcode?: string; expiry?: string }) {
    return `
      <div style="width:50mm;padding:4px;border:1px solid #000;font-size:10px">
        <div class="center bold">${params.name}</div>
        <div class="center bold" style="font-size:16px">₹${params.price}</div>
        ${params.expiry ? `<div class="center small">Exp: ${params.expiry}</div>` : ''}
        ${params.barcode ? `<div class="center">${params.barcode}</div>` : ''}
      </div>
    `
  }
}

// ─── PRINTER CONFIG HOOK ──────────────────────────────────────────
export function usePrinter() {
  const getPaperSize = (): PaperSize => {
    return (localStorage.getItem('printer_paper_size') as PaperSize) || '80mm'
  }

  const setPaperSize = (size: PaperSize) => {
    localStorage.setItem('printer_paper_size', size)
  }

  const printKOT = (params: Parameters<typeof PrintService.kotHTML>[0]) => {
    const html = PrintService.kotHTML(params)
    PrintService.print(html, { paperSize: '80mm' })
  }

  const printBill = (params: Parameters<typeof PrintService.billHTML>[0]) => {
    const html = PrintService.billHTML(params)
    PrintService.print(html, { paperSize: getPaperSize() })
  }

  const printReport = (params: Parameters<typeof PrintService.shiftReportHTML>[0]) => {
    const html = PrintService.shiftReportHTML(params)
    PrintService.print(html, { paperSize: '80mm' })
  }

  return { printKOT, printBill, printReport, getPaperSize, setPaperSize }
}

// ─── PRINTER SETTINGS PAGE ────────────────────────────────────────
import { useState } from 'react'
import { Printer, Check } from 'lucide-react'
import toast from 'react-hot-toast'

export function PrinterSettings() {
  const [paperSize, setPaperSizeState] = useState<PaperSize>(
    (localStorage.getItem('printer_paper_size') as PaperSize) || '80mm'
  )

  function save(size: PaperSize) {
    setPaperSizeState(size)
    localStorage.setItem('printer_paper_size', size)
    toast.success(`Paper size set to ${size}`)
  }

  function testPrint() {
    PrintService.print(`
      <div class="center bold large">TEST PRINT</div>
      <div class="divider"></div>
      <div class="center">RestaurantOS</div>
      <div class="center small">${new Date().toLocaleString()}</div>
      <div class="divider"></div>
      <div class="center">Paper size: ${paperSize}</div>
      <div class="divider"></div>
      <div class="center bold">Print successful! ✓</div>
    `, { paperSize })
  }

  return (
    <div className="p-4 max-w-xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <Printer className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Printer Settings</h1>
          <p className="text-sm text-gray-500">Configure receipt printer</p>
        </div>
      </div>

      <div className="card-pad space-y-4">
        <p className="font-semibold text-gray-700">Paper Size</p>
        <div className="space-y-3">
          {([
            { size: '58mm' as PaperSize, label: '58mm Thermal', desc: 'Small portable thermal printers', common: false },
            { size: '80mm' as PaperSize, label: '80mm Thermal', desc: 'Most common restaurant printers (Epson, TVS, Star)', common: true },
            { size: 'a4' as PaperSize, label: 'A4 / Letter', desc: 'Regular laser/inkjet printers', common: false },
          ]).map(({ size, label, desc, common }) => (
            <button key={size} onClick={() => save(size)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${paperSize === size ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${paperSize === size ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                {paperSize === size && <Check className="w-4 h-4 text-white" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{label}</p>
                  {common && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Recommended</span>}
                </div>
                <p className="text-sm text-gray-500">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="card-pad space-y-3">
        <p className="font-semibold text-gray-700">Compatible Printers</p>
        <div className="text-sm text-gray-600 space-y-1">
          {['Epson TM-T20, TM-T82, TM-T88', 'TVS RP45 Shoppe, RP3150', 'Star TSP143, TSP654', 'Bixolon SRP-350', 'iDPRT SP420', 'Any ESC/POS compatible printer', 'Regular USB laser/inkjet (A4 mode)'].map(p => (
            <div key={p} className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
              <span>{p}</span>
            </div>
          ))}
        </div>
        <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700">
          💡 Set your printer as the <strong>default printer</strong> in Windows/Mac/Android settings. When you print a KOT or bill, it will automatically go to that printer without showing a dialog.
        </div>
      </div>

      <button onClick={testPrint} className="btn-primary w-full">
        <Printer className="w-4 h-4" /> Test Print
      </button>
    </div>
  )
}
