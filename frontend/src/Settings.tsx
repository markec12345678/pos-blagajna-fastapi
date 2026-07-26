import { useState, useEffect } from 'react'
import * as api from './api'

async function cacheForOffline(): Promise<{ menu: number; tables: number }> {
  const cache = await caches.open('pos-offline')
  const menu = await fetch('/api/v1/menu', { headers: api.authHeader() }).then(r => r.json())
  const tables = await fetch('/api/v1/tables', { headers: api.authHeader() }).then(r => r.json())
  await cache.put('/api/v1/menu-cache', new Response(JSON.stringify(menu), { headers: { 'Content-Type': 'application/json' } }))
  await cache.put('/api/v1/tables-cache', new Response(JSON.stringify(tables), { headers: { 'Content-Type': 'application/json' } }))
  return { menu: menu.length, tables: tables.length }
}

export default function SettingsPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [s, setS] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [testEmail, setTestEmail] = useState('')
  const [testResult, setTestResult] = useState('')

  useEffect(() => {
    fetch('/api/v1/settings', { headers: api.authHeader() })
      .then(r => r.json()).then(d => { setS(d); setLoading(false) })
  }, [])

  const save = async () => {
    await fetch('/api/v1/settings', {
      method: 'PUT',
      headers: { ...api.authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(s)
    })
    onNotify('Nastavitve shranjene')
  }

  const set = (k: string, v: string) => setS((prev: any) => ({ ...prev, [k]: v }))

  if (loading) return <div className="loading-state" style={{ color: '#94a3b8' }}>Nalaganje...</div>

  return (
    <div className="settings-page">
      <h2>⚙️ Nastavitve</h2>

      <div className="card settings-card">
        <h4>Restavracija</h4>
        <div className="settings-section">
          <div className="settings-field">
            <label>Ime restavracije</label>
            <input className="input" value={s.restaurant_name || ''} onChange={e => set('restaurant_name', e.target.value)} />
          </div>
          <div className="settings-field">
            <label>Naslov</label>
            <input className="input" value={s.restaurant_address || ''} onChange={e => set('restaurant_address', e.target.value)} />
          </div>
          <div className="settings-field">
            <label>Telefon</label>
            <input className="input" value={s.restaurant_phone || ''} onChange={e => set('restaurant_phone', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card settings-card">
        <h4>📨 e-Računi (FURS)</h4>
        <div className="settings-section">
          <div className="settings-field">
            <label>Davčna številka podjetja</label>
            <input className="input" value={s.company_tax_id || ''} onChange={e => set('company_tax_id', e.target.value)} placeholder="npr. SI12345678" />
          </div>
          <div className="settings-field">
            <label>Ime podjetja</label>
            <input className="input" value={s.company_name || ''} onChange={e => set('company_name', e.target.value)} />
          </div>
          <div className="settings-field">
            <label>Naslov podjetja</label>
            <input className="input" value={s.company_address || ''} onChange={e => set('company_address', e.target.value)} />
          </div>
        </div>
        <div className="settings-row" style={{ marginTop: 8 }}>
          <div className="settings-field">
            <label>FURS zasebni ključ ID (za e-podpis)</label>
            <input className="input" value={s.furs_private_key_id || ''} onChange={e => set('furs_private_key_id', e.target.value)} placeholder="Identifikator ključa" />
          </div>
          <div className="settings-field">
            <label>Način pošiljanja</label>
            <select className="input" value={s.furs_send_mode || 'simulated'} onChange={e => set('furs_send_mode', e.target.value)}>
              <option value="simulated">Simulirano (testno)</option>
              <option value="edavki">eDavki API</option>
              <option value="third_party">Tretja stran</option>
            </select>
          </div>
        </div>
        <div className="settings-row" style={{ marginTop: 8 }}>
          <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={s.furs_auto_send === 'true'} onChange={e => set('furs_auto_send', String(e.target.checked))} />
            Samodejno pošlji e-Račun ob izdaji računa
          </label>
          <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={s.furs_require_vat_id === 'true'} onChange={e => set('furs_require_vat_id', String(e.target.checked))} />
            Zahtevaj davčno številko kupca
          </label>
        </div>
      </div>

      <div className="card settings-card">
        <h4>Denar</h4>
        <div className="settings-row">
          <div className="settings-field">
            <label>Valuta</label>
            <select className="input" value={s.currency || 'EUR'} onChange={e => set('currency', e.target.value)}>
              <option value="EUR">€ EUR</option>
              <option value="USD">$ USD</option>
              <option value="HRK">kn HRK</option>
              <option value="RSD">дин RSD</option>
            </select>
          </div>
          <div className="settings-field">
            <label>Globalni davek (%) — uporabljen za račune, če artikel nima svoje stopnje</label>
            <input className="input" type="number" step="0.1" value={s.tax_rate || '0'} onChange={e => set('tax_rate', e.target.value)} />
          </div>
          <div className="settings-field">
            <label>Davek za dostavo (%)</label>
            <input className="input" type="number" step="0.1" value={s.tax_rate_delivery || '0'} onChange={e => set('tax_rate_delivery', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card settings-card">
        <h4>Dostava</h4>
        <div className="settings-field">
          <label>Cena dostave (€)</label>
          <input className="input" type="number" step="0.5" value={s.delivery_fee || '0'} onChange={e => set('delivery_fee', e.target.value)} />
        </div>
      </div>

      <div className="card settings-card">
        <h4>🧾 Račun — predloga</h4>
        <div className="settings-field">
          <label>Glava računa (besedilo nad logotipom)</label>
          <input className="input" value={s.receipt_header || ''} onChange={e => set('receipt_header', e.target.value)} placeholder="npr. Hvala za obisk!" />
        </div>
        <div className="settings-field">
          <label>URL logotipa (neobvezno)</label>
          <input className="input" value={s.receipt_logo_url || ''} onChange={e => set('receipt_logo_url', e.target.value)} placeholder="https://example.com/logo.png" />
        </div>
        <div className="settings-field">
          <label>Noga računa</label>
          <textarea className="input" rows={2} value={s.receipt_footer || ''} onChange={e => set('receipt_footer', e.target.value)} />
        </div>
        <div className="settings-row">
          <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={s.receipt_show_prices !== 'false'} onChange={e => set('receipt_show_prices', String(e.target.checked))} />
            Prikaži cene
          </label>
          <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={s.receipt_show_qr !== 'false'} onChange={e => set('receipt_show_qr', String(e.target.checked))} />
            Prikaži QR kodo
          </label>
        </div>
        <div className="settings-row">
          <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={s.receipt_show_tax !== 'false'} onChange={e => set('receipt_show_tax', String(e.target.checked))} />
            Prikaži DDV
          </label>
          <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={s.receipt_show_order_type !== 'false'} onChange={e => set('receipt_show_order_type', String(e.target.checked))} />
            Prikaži tip naročila
          </label>
        </div>
        <div className="settings-row">
          <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={s.receipt_show_customer !== 'false'} onChange={e => set('receipt_show_customer', String(e.target.checked))} />
            Prikaži ime gosta
          </label>
          <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={s.receipt_show_notes !== 'false'} onChange={e => set('receipt_show_notes', String(e.target.checked))} />
            Prikaži opombe
          </label>
        </div>
        <div className="settings-row">
          <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={s.receipt_show_cashier !== 'false'} onChange={e => set('receipt_show_cashier', String(e.target.checked))} />
            Prikaži blagajnika
          </label>
          <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={s.receipt_show_change !== 'false'} onChange={e => set('receipt_show_change', String(e.target.checked))} />
            Prikaži vračilo
          </label>
        </div>
        <div style={{ marginTop: 8 }}>
          <button onClick={() => {
            const w = window.open('', '', 'width=400,height=700')
            if (!w) return
            const logo = s.receipt_logo_url ? `<img src="${s.receipt_logo_url}" style="max-width:120px;margin-bottom:8px" />` : ''
            const now = new Date().toLocaleString('sl-SI')
            w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: 'Courier New', monospace; font-size: 13px; padding: 20px; color: #000; width: ${s.printer_width === '32' ? '200px' : '300px'}; margin: 0 auto; }
              h1 { font-size: 16px; text-align: center; font-weight: 700; }
              .center { text-align: center; margin-bottom: 6px; }
              hr { border: none; border-top: 1px dashed #999; margin: 10px 0; }
              .row { display: flex; justify-content: space-between; padding: 4px 0; }
              .total { font-size: 16px; font-weight: bold; display: flex; justify-content: space-between; margin-top: 8px; }
              .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #666; }
            </style></head><body>
              ${s.receipt_header ? `<div class="center" style="font-weight:600;font-size:14px">${s.receipt_header}</div>` : ''}
              ${logo}
              <h1>${s.restaurant_name || 'Moja Restavracija'}</h1>
              ${s.restaurant_address ? `<div class="center">${s.restaurant_address}</div>` : ''}
              <div class="center">${now}</div>
              <div class="center">#P1024</div>
              <hr>
              <div class="row"><span>Artikel x1</span><span>10.00 €</span></div>
              <div class="row"><span>Artikel 2 x2</span><span>15.00 €</span></div>
              <hr>
              <div class="total"><span>SKUPAJ</span><span>25.00 €</span></div>
              <div class="footer">${(s.receipt_footer || 'Hvala za obisk!').split('\\n').join('<br>')}</div>
            </body></html>`)
            w.document.close()
          }} className="btn btn-sm btn-blue">👁️ Predogled računa</button>
        </div>
      </div>

      <div className="card settings-card">
        <h4>📧 Email (SMTP) — pošiljanje računov</h4>
        <div className="settings-section">
          <div className="settings-field">
            <label>SMTP gostitelj</label>
            <input className="input" placeholder="smtp.gmail.com" value={s.smtp_host || ''} onChange={e => set('smtp_host', e.target.value)} />
          </div>
          <div className="settings-row">
            <div className="settings-field">
              <label>Vrata</label>
              <input className="input" type="number" value={s.smtp_port || '587'} onChange={e => set('smtp_port', e.target.value)} />
            </div>
            <div className="settings-field">
              <label>Uporabnik</label>
              <input className="input" placeholder="user@gmail.com" value={s.smtp_user || ''} onChange={e => set('smtp_user', e.target.value)} />
            </div>
          </div>
          <div className="settings-field">
            <label>Geslo (App Password)</label>
            <input className="input" type="password" value={s.smtp_pass || ''} onChange={e => set('smtp_pass', e.target.value)} />
          </div>
          <div className="settings-field">
            <label>Pošiljatelj (email)</label>
            <input className="input" placeholder="pos@restavracija.si" value={s.smtp_from || ''} onChange={e => set('smtp_from', e.target.value)} />
          </div>
          <div className="settings-field">
            <label>Ime pošiljatelja</label>
            <input className="input" placeholder="Moja Restavracija" value={s.smtp_from_name || ''} onChange={e => set('smtp_from_name', e.target.value)} />
          </div>
          <div className="settings-field">
            <label>BCC (skrita kopija vsakega računa)</label>
            <input className="input" placeholder="finance@restavracija.si" value={s.customer_email_bcc || ''} onChange={e => set('customer_email_bcc', e.target.value)} />
          </div>
          {s.smtp_host && (
            <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
              <input className="input" placeholder="test@email.com" value={testEmail} onChange={e => setTestEmail(e.target.value)} style={{ flex: 1 }} />
              <button onClick={async () => {
                setTestResult('⏳')
                try {
                  const r = await fetch('/api/v1/settings/test-email', {
                    method: 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: testEmail })
                  }).then(r => r.json())
                  setTestResult(r.ok ? '✅ Poslano' : `❌ ${r.detail || 'Napaka'}`)
                } catch (e: any) { setTestResult(`❌ ${e.message}`) }
              }} className="btn btn-sm btn-blue" disabled={!testEmail}>Pošlji test</button>
              <span style={{ fontSize: 12 }}>{testResult}</span>
            </div>
          )}
          <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <h5 style={{ marginBottom: 8 }}>⏰ Avtomatski opomniki za rezervacije</h5>
            <div className="settings-field">
              <label>Omogoči samodejne opomnike</label>
              <select className="input" value={s.enable_auto_reminders || 'false'} onChange={e => set('enable_auto_reminders', e.target.value)}>
                <option value="false">Ne</option>
                <option value="true">Da</option>
              </select>
            </div>
            <div className="settings-field">
              <label>Pošlji X ur pred rezervacijo</label>
              <input className="input" type="number" step="0.5" min="0.5" max="72" value={s.reminder_hours_before || '2'} onChange={e => set('reminder_hours_before', e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="card settings-card">
        <h4>📱 Offline način</h4>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>
          Predpomnitek za delovanje brez internetne povezave — shrani meni in mize.
        </p>
        <button onClick={async () => {
          try { const r = await cacheForOffline(); onNotify(`💾 Shranjeno ${r.menu} jedi, ${r.tables} miz za offline uporabo`); }
          catch { onNotify('❌ Napaka pri shranjevanju') }
        }} className="btn btn-sm btn-blue" style={{ width: '100%' }}>Shrani za offline uporabo</button>
      </div>

      <div className="card settings-card">
        <h4>⏱️ Evidenca dela</h4>
        <div className="settings-field">
          <label>Povprečna satnica (€/h)</label>
          <input className="input" type="number" step="0.5" value={s.hourly_wage || '10'} onChange={e => set('hourly_wage', e.target.value)} />
        </div>
      </div>

      <div className="card settings-card">
        <h4>🍳 Kuhinjske mize (Prep Stations)</h4>
        <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>
          Zaporedje miz, kjer se prikažejo artikli (npr. Grill,Pizza,Salad,Bar)
        </p>
        <input className="input" placeholder="Grill,Pizza,Salad,Bar" value={s.prep_stations || ''} onChange={e => set('prep_stations', e.target.value)} />
      </div>

      <div className="card settings-card">
        <h4>🏷️ Oznake naročil (Order Tags)</h4>
        <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>
          Vsaka oznaka: {"{"}"name":"VIP","color":"#f59e0b"{"}"}. Dodaj po vrsti.
        </p>
        <textarea className="input" rows={4} value={(() => { try { return JSON.parse(s.order_tags || '[]').map((t: any) => `${t.name}:${t.color}`).join('\n') } catch { return '' } })()} onChange={e => {
          const lines = e.target.value.split('\n').filter(l => l.trim())
          const tags = lines.map(l => { const [name, color] = l.split(':'); return { name: name.trim(), color: (color || '#888').trim() } })
          set('order_tags', JSON.stringify(tags))
        }} placeholder="VIP:#f59e0b&#10;Reklamacija:#ef4444&#10;Na poti:#3b82f6" />
      </div>

      <div className="card settings-card">
        <h4>🖨️ Tiskalnik</h4>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>
          Nastavitve za termični tiskalnik (ESC/POS)
        </p>
        <div className="settings-field">
          <label>Tiskalnik IP/naslov (opcijsko)</label>
          <input className="input" placeholder="192.168.1.100" value={s.printer_ip || ''} onChange={e => set('printer_ip', e.target.value)} style={{ marginBottom: 8 }} />
        </div>
        <div className="settings-row">
          <div className="settings-field">
            <label>Širina papirja</label>
            <select className="input" value={s.printer_width || '48'} onChange={e => set('printer_width', e.target.value)}>
              <option value="32">32 znakov (širok 58mm)</option>
              <option value="48">48 znakov (navaden)</option>
            </select>
          </div>
        </div>
        <label style={{ fontSize: 13, marginTop: 8, display: 'block' }}>
          <input type="checkbox" checked={s.auto_print_receipt === 'true'} onChange={e => setS((p: any) => ({ ...p, auto_print_receipt: String(e.target.checked) }))} />{' '}
          Samodejno tiskaj račun
        </label>
        <label style={{ fontSize: 13, display: 'block' }}>
          <input type="checkbox" checked={s.auto_print_kitchen === 'true'} onChange={e => setS((p: any) => ({ ...p, auto_print_kitchen: String(e.target.checked) }))} />{' '}
          Samodejno tiskaj v kuhinjo
        </label>
        {s.printer_ip && (
          <button className="btn btn-sm btn-primary" style={{ marginTop: 12 }} onClick={async () => {
            try {
              const token = localStorage.getItem('pos_token')
              const r = await fetch(`/api/v1/printer/test?ip=${s.printer_ip}&port=9100`, { headers: token ? { 'Authorization': `Bearer ${token}` } : {} })
              if (r.ok) { const d = await r.json(); onNotify(`Testno sporočilo poslano na ${d.printer} (${d.bytes} bajtov)`) }
              else { const e = await r.json(); onNotify(`Napaka: ${e.detail || 'Neznana napaka'}`) }
            } catch { onNotify('Napaka pri pošiljanju na tiskalnik') }
          }}>🖨️ Testni tisk</button>
        )}
      </div>

      <div className="card settings-card">
        <h4>📱 Plačilni terminal</h4>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>
          Konfiguracija za fizičen plačilni terminal (Stripe, SumUp, itd.)
        </p>
        <div className="settings-field">
          <label>Ponudnik</label>
          <select className="input" value={s.terminal_provider || ''} onChange={e => set('terminal_provider', e.target.value)} style={{ marginBottom: 8 }}>
            <option value="">Brez</option>
            <option value="stripe">Stripe Terminal</option>
            <option value="sumup">SumUp</option>
            <option value="paypal">PayPal Zettle</option>
          </select>
        </div>
        <div className="settings-field">
          <label>API ključ</label>
          <input className="input" type="password" value={s.terminal_api_key || ''} onChange={e => set('terminal_api_key', e.target.value)} placeholder="sk_test_..." />
        </div>
        {s.smtp_host && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--green)' }}>✅ Terminal klavzule so shranjene</div>
        )}
      </div>

      <div className="card settings-card">
        <h4>📦 Zaloge in naročanje</h4>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>
          Nastavitve za opozorila o nizki zalogi in samodejno odštevanje sestavin.
        </p>
        <div className="settings-section">
          <div className="settings-field">
            <label>Prag za opozorilo nizke zaloge (%)</label>
            <input className="input" type="number" min="0" max="100" value={s.low_stock_alert_pct || '20'}
              onChange={e => set('low_stock_alert_pct', e.target.value)}
              placeholder="20" style={{ width: 120 }} />
            <span style={{ fontSize: 11, color: 'var(--text2)', marginLeft: 8 }}>Opozori, ko zaloga pade pod toliko % min. zaloge</span>
          </div>
          <div className="settings-field">
            <label>Odštevanje sestavin ob</label>
            <select className="input" value={s.stock_deduct_on || 'payment'} onChange={e => set('stock_deduct_on', e.target.value)} style={{ width: 200 }}>
              <option value="payment">Plačilu (zaprtje naročila)</option>
              <option value="order">Ustvarjanju naročila</option>
              <option value="kitchen">Poslanju v kuhinjo</option>
            </select>
          </div>
        </div>
        <label style={{ fontSize: 13, marginTop: 8, display: 'block' }}>
          <input type="checkbox" checked={s.stock_alert_pos === 'true'} onChange={e => setS((p: any) => ({ ...p, stock_alert_pos: String(e.target.checked) }))} />{' '}
          Prikaži opozorilo za nizko zalogo v POS ob naročanju
        </label>
        <label style={{ fontSize: 13, display: 'block' }}>
          <input type="checkbox" checked={s.stock_alert_kds === 'true'} onChange={e => setS((p: any) => ({ ...p, stock_alert_kds: String(e.target.checked) }))} />{' '}
          Pošlji opozorilo v KDS ob padcu zaloge
        </label>
        <label style={{ fontSize: 13, display: 'block' }}>
          <input type="checkbox" checked={s.stock_deduct_enabled === 'true'} onChange={e => setS((p: any) => ({ ...p, stock_deduct_enabled: String(e.target.checked) }))} />{' '}
          Omogoči samodejno odštevanje sestavin iz zaloge
        </label>
      </div>

      <button onClick={save} className="btn btn-primary settings-save">Shrani nastavitve</button>
    </div>
  )
}
