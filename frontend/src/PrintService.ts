import QRCode from 'qrcode'

function escapeHtml(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

let _settings: Record<string, string> | null = null

async function getSettings(): Promise<Record<string, string>> {
  if (_settings) return _settings
  try {
    const token = localStorage.getItem('pos_token')
    const r = await fetch('/api/v1/settings', { headers: token ? { 'Authorization': `Bearer ${token}` } : {} })
    _settings = await r.json()
  } catch { _settings = {} }
  return _settings!
}

export function clearSettingsCache() { _settings = null }

const API = '/api/v1/printer'

async function generateEscPos(endpoint: string, data: any, width: number): Promise<string | null> {
  try {
    const token = localStorage.getItem('pos_token')
    const r = await fetch(`${API}/${endpoint}?width=${width}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
      body: JSON.stringify(data)
    })
    if (!r.ok) return null
    const result = await r.json()
    return result.hex
  } catch { return null }
}

async function sendToPrinter(hex: string): Promise<boolean> {
  try {
    const s = _settings || {}
    const token = localStorage.getItem('pos_token')
    const r = await fetch(`${API}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
      body: JSON.stringify({
        ip: s.printer_ip,
        port: 9100,
        data: hex,
        width: parseInt(s.printer_width || '32')
      })
    })
    return r.ok
  } catch { return false }
}

export async function printReceipt(order: any, tableName: string, taxRate = 0) {
  const s = await getSettings()
  const useThermal = s.printer_ip && s.auto_print_receipt === 'true'
  const width = parseInt(s.printer_width || '32')

  if (useThermal) {
    const taxAmount = taxRate > 0 ? order.total * taxRate / (100 + taxRate) : 0
    const escposData = {
      header_center: s.restaurant_name || 'POS',
      sub_header: [s.restaurant_address, s.restaurant_phone].filter(Boolean),
      order_id: order.id,
      table: tableName,
      order_type: order.order_type === 'takeaway' ? 'Za sabo' : order.order_type === 'delivery' ? 'Dostava' : 'Tukaj',
      date: new Date().toLocaleString('sl-SI'),
      cashier: order.cashier_name,
      customer: order.customer_name,
      items: order.items?.map((i: any) => ({
        name: i.item_name,
        quantity: i.quantity,
        price: i.unit_price,
        total: i.total_price,
        modifiers: i.modifiers ? (() => { try { return JSON.parse(i.modifiers).map((m: any) => m.option_name) } catch { return [] } })() : []
      })),
      subtotal: order.items?.reduce((s: number, i: any) => s + i.total_price, 0),
      discount: order.discount_amount,
      discount_label: order.discount_type === 'percentage' ? `${order.discount_value}%` : `${order.discount_value} €`,
      tax: taxAmount,
      total: order.total,
      payment_method: order.payment_method === 'cash' ? 'Gotovina' : order.payment_method === 'card' ? 'Kartica' : order.payment_method,
      amount_paid: order.amount_paid,
      change: order.payment_method === 'cash' && order.amount_paid > order.total ? order.amount_paid - order.total : undefined,
      tip: order.tip,
      points_earned: order.customer_is_member ? Math.floor(order.total) : undefined,
      footer: s.receipt_footer || 'Hvala za obisk!',
      double_header: true
    }

    const hex = await generateEscPos('receipt', escposData, width)
    if (hex) {
      const sent = await sendToPrinter(hex)
      if (sent) return
    }
  }

  // Fallback to browser print
  const w = window.open('', '', 'width=400,height=700')
  if (!w) return
  const now = new Date().toLocaleString('sl-SI')
  const taxAmount = taxRate > 0 ? order.total * taxRate / (100 + taxRate) : 0
  const netTotal = order.total - taxAmount
  const showPrices = s.receipt_show_prices !== 'false'
  const showTax = s.receipt_show_tax !== 'false'
  const showOrderType = s.receipt_show_order_type !== 'false'
  const showCustomer = s.receipt_show_customer !== 'false'
  const showNotes = s.receipt_show_notes !== 'false'
  const showCashier = s.receipt_show_cashier !== 'false'
  const showChange = s.receipt_show_change !== 'false'
  const logo = s.receipt_logo_url ? `<img src="${escapeHtml(s.receipt_logo_url)}" style="max-width:120px;margin-bottom:8px" />` : ''
  const paperWidth = s.printer_width === '32' ? '210px' : '300px'

  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 13px; padding: 20px; color: #000; width: ${paperWidth}; margin: 0 auto; }
    h1 { font-size: 18px; text-align: center; }
    .center { text-align: center; margin-bottom: 6px; }
    hr { border: none; border-top: 1px dashed #999; margin: 10px 0; }
    .row { display: flex; justify-content: space-between; padding: 4px 0; }
    .total { font-size: 16px; font-weight: bold; display: flex; justify-content: space-between; margin-top: 8px; }
    .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #666; white-space: pre-line; }
  </style></head><body>
    ${s.receipt_header ? `<div class="center" style="font-weight:600;font-size:14px">${escapeHtml(s.receipt_header)}</div>` : ''}
    ${logo}
    <h1>${escapeHtml(s.restaurant_name || '🍽️ POS')}</h1>
    ${s.restaurant_address ? `<div class="center">${escapeHtml(s.restaurant_address)}</div>` : ''}
    ${s.restaurant_phone ? `<div class="center">${escapeHtml(s.restaurant_phone)}</div>` : ''}
    <div class="center">${now}</div>
    <div class="center">Naročilo #${order.id}</div>
    <div class="center">${tableName}</div>
    ${showOrderType && order.order_type ? `<div class="center">${order.order_type === 'takeaway' ? '🛍️ Za sabo' : order.order_type === 'delivery' ? '🛵 Dostava' : '🏠 Tukaj'}</div>` : ''}
    ${showCustomer && order.customer_name ? `<div class="center">Gost: ${escapeHtml(order.customer_name)}</div>` : ''}
    ${showNotes && order.notes ? `<div class="center" style="color:#059669">📝 ${escapeHtml(order.notes)}</div>` : ''}
    ${showCashier && order.cashier_name ? `<div class="center" style="font-size:11px">Blagajnik: ${escapeHtml(order.cashier_name)}</div>` : ''}
    <hr>
    ${order.items?.map((i: any) => `<div class="row"><span>${i.item_name} ${showPrices ? '' : ''}${i.quantity > 1 ? ` x${i.quantity}` : ''}</span>${showPrices ? `<span>${i.total_price.toFixed(2)} €</span>` : ''}</div>`).join('')}
    <hr>
    ${order.discount_amount ? `<div class="row" style="color:red"><span>Popust (${order.discount_type === 'percentage' ? order.discount_value + '%' : order.discount_value.toFixed(2) + ' €'})</span><span>-${order.discount_amount.toFixed(2)} €</span></div>` : ''}
    <div class="total"><span>SKUPAJ</span><span>${order.total.toFixed(2)} €</span></div>
    ${showTax && taxRate > 0 ? `<div class="row" style="font-size:11px;color:#666"><span>Neto (brez DDV)</span><span>${netTotal.toFixed(2)} €</span></div><div class="row" style="font-size:11px;color:#666"><span>DDV ${taxRate}%</span><span>${taxAmount.toFixed(2)} €</span></div>` : ''}
    ${order.payment_method ? `<div class="row" style="font-size:12px;margin-top:6px"><span>Način plačila:</span><span>${order.payment_method === 'cash' ? '💵 Gotovina' : order.payment_method === 'card' ? '💳 Kartica' : order.payment_method === 'gift_card' ? '🎁 Darilna kartica' : order.payment_method === 'house_account' ? '🏠 Račun' : order.payment_method}</span></div>` : ''}
    ${showChange && order.payment_method === 'cash' && order.amount_paid > order.total ? `<div class="row" style="font-size:12px"><span>Plačano:</span><span>${order.amount_paid.toFixed(2)} €</span></div><div class="row" style="font-size:12px;font-weight:600"><span>Vračilo:</span><span>${(order.amount_paid - order.total).toFixed(2)} €</span></div>` : ''}
    ${s.receipt_show_qr !== 'false' ? await (async () => {
      const baseUrl = window.location.origin
      const feedbackUrl = `${baseUrl}/feedback?order=${order.id}&branch=${order.branch_id || ''}`
      try {
        const svg = await QRCode.toString(feedbackUrl, { type: 'svg', width: 100, margin: 1, color: { dark: '#000', light: '#fff' } })
        return `<div class="center" style="margin-top:12px">${svg}<div style="font-size:8px;margin-top:4px">Skeniraj za oceno</div></div>`
      } catch { return '' }
    })() : ''}
    <div class="footer">${escapeHtml(s.receipt_footer || 'Hvala za obisk!').replace(/\\n/g, '<br>')}</div>
    <script>window.print();window.close();</script>
  </body></html>`)
  w.document.close()
}

export async function printKitchenOrder(order: any, tableName: string) {
  const s = await getSettings()
  const useThermal = s.printer_ip && s.auto_print_kitchen === 'true'
  const width = parseInt(s.printer_width || '32')

  if (useThermal) {
    const escposData = {
      order_id: order.id,
      table: tableName,
      order_type: order.order_type === 'takeaway' ? 'Za sabo' : order.order_type === 'delivery' ? 'Dostava' : 'Tukaj',
      time: new Date().toLocaleString('sl-SI'),
      items: order.items?.filter((i: any) => i.status !== 'ready').map((i: any) => ({
        name: i.item_name,
        quantity: i.quantity,
        notes: i.notes,
        modifiers: i.modifiers ? (() => { try { return JSON.parse(i.modifiers).map((m: any) => m.option_name) } catch { return [] } })() : []
      })),
      notes: order.notes
    }

    const hex = await generateEscPos('kitchen', escposData, width)
    if (hex) {
      const sent = await sendToPrinter(hex)
      if (sent) return
    }
  }

  // Fallback to browser print
  const w = window.open('', '', 'width=380,height=500')
  if (!w) return
  const now = new Date().toLocaleString('sl-SI')
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 14px; padding: 20px; color: #000; }
    h1 { font-size: 22px; text-align: center; }
    h2 { font-size: 16px; text-align: center; }
    hr { border: none; border-top: 1px dashed #999; margin: 10px 0; }
    .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 16px; }
    .bold { font-weight: bold; }
    .time { text-align: center; font-size: 12px; color: #666; }
    .note { text-align: center; font-size: 12px; margin-top: 12px; color: red; }
  </style></head><body>
    <h1>🍳 KUHINJA</h1>
    <div class="time">${now}</div>
    <hr>
    <h2>Naročilo #${order.id}</h2>
    <div style="text-align:center;font-size:18px;margin:8px 0">${tableName}</div>
    ${order.order_type ? `<div style="text-align:center;font-size:14px">${order.order_type === 'takeaway' ? '🛍️ Za sabo' : order.order_type === 'delivery' ? '🛵 Dostava' : '🏠 Tukaj'}</div>` : ''}
    ${order.customer_name ? `<div style="text-align:center">Gost: ${order.customer_name}</div>` : ''}
    <hr>
    ${order.items?.filter((i: any) => i.status !== 'ready').map((i: any) => `<div class="row"><span>${i.item_name}</span><span>x${i.quantity}</span></div>`).join('')}
    <hr>
    <div class="note">Pripravite in označite kot gotovo!</div>
    <script>window.print();window.close();</script>
  </body></html>`)
  w.document.close()
}
