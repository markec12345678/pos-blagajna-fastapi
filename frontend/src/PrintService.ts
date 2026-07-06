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

export async function printReceipt(order: any, tableName: string, taxRate = 0) {
  const s = await getSettings()
  const w = window.open('', '', 'width=400,height=700')
  if (!w) return
  const now = new Date().toLocaleString('sl-SI')
  const taxAmount = taxRate > 0 ? order.total * taxRate / (100 + taxRate) : 0
  const netTotal = order.total - taxAmount
  const showPrices = s.receipt_show_prices !== 'false'
  const logo = s.receipt_logo_url ? `<img src="${s.receipt_logo_url}" style="max-width:120px;margin-bottom:8px" />` : ''
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
    ${s.receipt_header ? `<div class="center" style="font-weight:600;font-size:14px">${s.receipt_header}</div>` : ''}
    ${logo}
    <h1>${s.restaurant_name || '🍽️ POS'}</h1>
    ${s.restaurant_address ? `<div class="center">${s.restaurant_address}</div>` : ''}
    ${s.restaurant_phone ? `<div class="center">${s.restaurant_phone}</div>` : ''}
    <div class="center">${now}</div>
    <div class="center">Naročilo #${order.id}</div>
    <div class="center">${tableName}</div>
    ${order.order_type ? `<div class="center">${order.order_type === 'takeaway' ? '🛍️ Za sabo' : order.order_type === 'delivery' ? '🛵 Dostava' : '🏠 Tukaj'}</div>` : ''}
    ${order.customer_name ? `<div class="center">Gost: ${order.customer_name}</div>` : ''}
    ${order.notes ? `<div class="center" style="color:#059669">📝 ${order.notes}</div>` : ''}
    <hr>
    ${order.items?.map((i: any) => `<div class="row"><span>${i.item_name} ${showPrices ? '' : ''}${i.quantity > 1 ? ` x${i.quantity}` : ''}</span>${showPrices ? `<span>${i.total_price.toFixed(2)} €</span>` : ''}</div>`).join('')}
    <hr>
    ${order.discount_amount ? `<div class="row" style="color:red"><span>Popust (${order.discount_type === 'percentage' ? order.discount_value + '%' : order.discount_value.toFixed(2) + ' €'})</span><span>-${order.discount_amount.toFixed(2)} €</span></div>` : ''}
    <div class="total"><span>SKUPAJ</span><span>${order.total.toFixed(2)} €</span></div>
    ${taxRate > 0 ? `<div class="row" style="font-size:11px;color:#666"><span>Neto (brez DDV)</span><span>${netTotal.toFixed(2)} €</span></div><div class="row" style="font-size:11px;color:#666"><span>DDV ${taxRate}%</span><span>${taxAmount.toFixed(2)} €</span></div>` : ''}
    ${s.receipt_show_qr !== 'false' ? `<div class="center" style="margin-top:12px">
      <svg width="80" height="80" viewBox="0 0 33 33" shape-rendering="crispEdges">
        ${(() => {
          const baseUrl = window.location.origin
          const feedbackUrl = `${baseUrl}/feedback?order=${order.id}&branch=${order.branch_id || ''}`
          // Simple QR-like pattern as visual indicator (real QR would need qrcode lib)
          const pattern = '111111101011011101011111110111010101111101110101011001010111110111010101010101111111100010001011111100001000101100000110100000101110100011101011100010100000101110001100010111000111010001010111010001011101000101110100011101011111000101010001011111101110101011011101111110111010001010001011111110101010101011111100010111010001010001100110100010111000010100010111000111010001011100011101000101110001110100010111000111010001011100011101000111011010101110100011100000100010001000000111111101010101010111111100001000010001000000110101011101010111011010100010001010001011101010101011101011111010001010001011111100000010101011111100001110110001110100011101010001011100010001000101110001110100010111000101010101011101011101010001011100011101000100000000010000000111111101011101110111111100001010101010001000011010101110111011101110101000100010111011101010101110101011111000101010001011111100100010100011100000111101110101010100011011101010001000001011101010101110011011111100010101110111111100101011101011101110100000100010001011100001110101000101110100010101010111010111010100010111010001010101011101011000000100010001110100011111010000000001000011111000101110101011111010001000101010001001011101110101010101110111010001010101011101110100010101110111000001010100010001011100010111010001000000010001010111010101111111111111111111111'
          let svg = ''
          for (let y = 0; y < 33; y++) {
            for (let x = 0; x < 33; x++) {
              const idx = y * 33 + x
              if (pattern[idx] === '1') svg += `<rect x="${x}" y="${y}" width="1" height="1" fill="black"/>`
            }
          }
          return svg
        })()}
      </svg>
      <div style="font-size:8px;margin-top:4px">Skeniraj za oceno</div>
    </div>` : ''}
    <div class="footer">${(s.receipt_footer || 'Hvala za obisk!').replace(/\\n/g, '<br>')}</div>
    <script>window.print();window.close();</script>
  </body></html>`)
  w.document.close()
}

export async function printKitchenOrder(order: any, tableName: string) {
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