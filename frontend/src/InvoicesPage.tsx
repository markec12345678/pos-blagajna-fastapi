import { useState, useEffect } from 'react'

interface Invoice {
  id: number; invoice_number: string; order_id: number | null;
  buyer_name: string; buyer_tax_id: string; buyer_address: string;
  subtotal: number; tax_total: number; discount_amount: number; total: number;
  status: string; issued_at: string | null; due_at: string | null;
  paid_at: string | null; cancelled_at: string | null;
  eracun_status?: string; eracun_xml_id?: string;
}

const STATUS_COLORS: Record<string, string> = { issued: '#3b82f6', paid: '#059669', cancelled: '#ef4444' }
const STATUS_LABELS: Record<string, string> = { issued: 'Izdan', paid: 'Plačan', cancelled: 'Storniran' }
const ERACUN_LABELS: Record<string, string> = { pending: 'Čaka', sent: 'Poslan' }
const ERACUN_COLORS: Record<string, string> = { pending: '#f59e0b', sent: '#059669' }

const API = '/api/v1/invoices'
const auth = () => ({ 'Authorization': 'Bearer ' + localStorage.getItem('pos_token'), 'Content-Type': 'application/json' })

export default function InvoicesPage({ onNotify, onNavigate }: { onNotify: (m: string, isError?: boolean) => void; onNavigate?: (page: any) => void }) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [stats, setStats] = useState<any>(null)
  const [filter, setFilter] = useState('')
  const [detail, setDetail] = useState<any>(null)
  const [closedOrders, setClosedOrders] = useState<any[]>([])
  const [showGenerate, setShowGenerate] = useState(false)
  const [genOrderId, setGenOrderId] = useState('')
  const [buyerInfo, setBuyerInfo] = useState({ buyer_name: '', buyer_tax_id: '', buyer_address: '' })

  const load = () => {
    fetch(`${API}?status=${filter}`, { headers: auth() }).then(r => r.json()).then(setInvoices).catch(() => {})
    fetch(`${API}/stats`, { headers: auth() }).then(r => r.json()).then(setStats).catch(() => {})
    fetch('/api/v1/orders?status=closed', { headers: auth() }).then(r => r.json()).then(setClosedOrders).catch(() => {})
  }
  useEffect(() => { load() }, [filter])

  const generate = async () => {
    if (!genOrderId) return
    try {
      const r = await fetch(`${API}/generate/${genOrderId}`, {
        method: 'POST', headers: auth(), body: JSON.stringify(buyerInfo)
      })
      if (!r.ok) throw new Error((await r.json()).detail || 'Napaka')
      onNotify('Račun izdan!')
      setShowGenerate(false); setGenOrderId(''); setBuyerInfo({ buyer_name: '', buyer_tax_id: '', buyer_address: '' })
      load()
    } catch (e: any) { onNotify(e.message, true) }
  }

  const pay = async (id: number) => {
    await fetch(`${API}/${id}/pay`, { method: 'PUT', headers: auth() })
    onNotify('Račun plačan'); load()
  }

  const cancel = async (id: number) => {
    if (!confirm('Stornirate račun?')) return
    await fetch(`${API}/${id}/cancel`, { method: 'PUT', headers: auth() })
    onNotify('Račun storniran'); load()
  }

  const viewDetail = async (id: number) => {
    const r = await fetch(`${API}/${id}`, { headers: auth() })
    setDetail(await r.json())
  }

  const downloadXml = (id: number) => {
    window.open(`${API}/${id}/eracun-xml`, '_blank')
  }

  const sendEracun = async (id: number) => {
    try {
      const r = await fetch(`${API}/${id}/send-eracun`, { method: 'POST', headers: auth() })
      if (!r.ok) throw new Error('Napaka pri pošiljanju')
      onNotify('eRačun poslan!')
      load()
    } catch { onNotify('Napaka pri pošiljanju eRačuna', true) }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>🧾 Računi (eRačun)</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onNavigate?.('e-invoices')} className="btn btn-sm" style={{ fontSize: 12 }}>e-Računi (FURS)</button>
          <button onClick={() => setShowGenerate(true)} className="btn btn-primary">+ Izdaj račun</button>
        </div>
      </div>

      {stats && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {[
            { label: 'Skupaj', value: stats.total, color: '#3b82f6' },
            { label: 'Izdani', value: stats.issued, color: '#3b82f6' },
            { label: 'Plačani', value: stats.paid, color: '#059669' },
            { label: 'Znesek', value: `${stats.total_amount.toFixed(0)} €`, color: '#8b5cf6' },
            { label: 'Plačano', value: `${stats.paid_amount.toFixed(0)} €`, color: '#059669' },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ borderLeft: `3px solid ${s.color}` }}>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
        <button onClick={() => setFilter('')} className={`btn btn-sm ${!filter ? 'btn-primary' : 'btn-ghost'}`}>Vsi</button>
        <button onClick={() => setFilter('issued')} className={`btn btn-sm ${filter === 'issued' ? 'btn-primary' : 'btn-ghost'}`}>Izdani</button>
        <button onClick={() => setFilter('paid')} className={`btn btn-sm ${filter === 'paid' ? 'btn-primary' : 'btn-ghost'}`}>Plačani</button>
        <button onClick={() => setFilter('cancelled')} className={`btn btn-sm ${filter === 'cancelled' ? 'btn-primary' : 'btn-ghost'}`}>Stornirani</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {invoices.map(inv => (
          <div key={inv.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[inv.status] || '#6b7280', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 700 }}>{inv.invoice_number}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                {inv.buyer_name}{inv.buyer_tax_id ? ` (ID: ${inv.buyer_tax_id})` : ''}
                {inv.order_id ? ` • naročilo #${inv.order_id}` : ''}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                {inv.issued_at ? new Date(inv.issued_at).toLocaleDateString('sl-SI') : ''}
                {inv.due_at ? ` • zapade: ${new Date(inv.due_at).toLocaleDateString('sl-SI')}` : ''}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700 }}>{inv.total.toFixed(2)} €</div>
              <div style={{ fontSize: 12, color: STATUS_COLORS[inv.status], fontWeight: 600 }}>{STATUS_LABELS[inv.status]}</div>
            </div>
            <div style={{ textAlign: 'center', minWidth: 70 }}>
                {inv.eracun_status && (
                  <div style={{ fontSize: 11, color: ERACUN_COLORS[inv.eracun_status] || '#f59e0b', fontWeight: 600 }}>
                    📨 {ERACUN_LABELS[inv.eracun_status] || inv.eracun_status}
                  </div>
                )}
                {(inv as any).credit_note_ref && (
                  <span className="badge badge-red" style={{ fontSize: 10 }}>Dobropis</span>
                )}
              </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => viewDetail(inv.id)} className="btn btn-sm btn-ghost" title="Podrobnosti">👁️</button>
              <button onClick={() => downloadXml(inv.id)} className="btn btn-sm btn-ghost" title="Prenesi eRačun XML">📄</button>
              {inv.status !== 'cancelled' && inv.eracun_status !== 'sent' &&
                <button onClick={() => sendEracun(inv.id)} className="btn btn-sm btn-green" title="Pošlji eRačun">📨</button>}
              {inv.status === 'issued' && <button onClick={() => pay(inv.id)} className="btn btn-sm btn-blue">Plačan</button>}
              {inv.status === 'paid' && !(inv as any).credit_note_ref && (
                <button onClick={() => {
                  const reason = prompt('Razlog za dobropis:') || 'Storno po zahtevi kupca'
                  fetch(`${API}/${inv.id}/credit-note`, { method: 'POST', headers: auth(), body: JSON.stringify({ reason }) })
                    .then(r => r.json()).then(r => { if (r.detail) throw new Error(r.detail); onNotify(`Dobropis ${r.invoice_number} izdan`); load() })
                    .catch((e: any) => onNotify(e.message, true))
                }} className="btn btn-sm btn-danger">Dobropis</button>
              )}
            </div>
          </div>
        ))}
        {!invoices.length && <p style={{ color: 'var(--text2)', padding: 20, textAlign: 'center' }}>Ni računov.</p>}
      </div>

      {detail && (
        <div className="overlay" onClick={() => setDetail(null)}>
          <div className="modal modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3>{detail.invoice_number}</h3>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>
              Status: <strong style={{ color: STATUS_COLORS[detail.status] }}>{STATUS_LABELS[detail.status]}</strong>
              {detail.order_id && <> • Naročilo #{detail.order_id}</>}
            </div>
            <div style={{ fontSize: 13, marginBottom: 12 }}>
              <strong>{detail.buyer_name}</strong><br />
              {detail.buyer_tax_id && <>ID: {detail.buyer_tax_id}<br /></>}
              {detail.buyer_address}
            </div>
            {detail.eracun_status && (
              <div style={{ fontSize: 12, color: ERACUN_COLORS[detail.eracun_status] || '#f59e0b', marginBottom: 12, fontWeight: 600 }}>
                📨 eRačun: {ERACUN_LABELS[detail.eracun_status] || detail.eracun_status}
                {detail.eracun_xml_id && <> (XML: {detail.eracun_xml_id})</>}
              </div>
            )}
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: 4 }}>Artikel</th>
                <th style={{ textAlign: 'center', padding: 4 }}>Količina</th>
                <th style={{ textAlign: 'right', padding: 4 }}>Cena</th>
                <th style={{ textAlign: 'right', padding: 4 }}>DDV</th>
                <th style={{ textAlign: 'right', padding: 4 }}>Skupaj</th>
              </tr></thead>
              <tbody>
                {(detail.items || []).map((i: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: 4 }}>{i.item_name}{i.notes ? ` (${i.notes})` : ''}</td>
                    <td style={{ textAlign: 'center', padding: 4 }}>{i.quantity}</td>
                    <td style={{ textAlign: 'right', padding: 4 }}>{i.unit_price.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', padding: 4 }}>{i.tax_amount.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', padding: 4 }}>{i.total_price.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ borderTop: '2px solid var(--border)', marginTop: 8, paddingTop: 8, fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Osnova:</span><span>{detail.subtotal.toFixed(2)} €</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--amber)' }}><span>DDV:</span><span>{detail.tax_total.toFixed(2)} €</span></div>
              {detail.discount_amount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--red)' }}><span>Popust:</span><span>-{detail.discount_amount.toFixed(2)} €</span></div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16, marginTop: 4 }}><span>Skupaj:</span><span>{detail.total.toFixed(2)} €</span></div>
            </div>
            <button onClick={() => setDetail(null)} className="btn btn-ghost" style={{ marginTop: 16, width: '100%' }}>Zapri</button>
          </div>
        </div>
      )}

      {showGenerate && (
        <div className="overlay" onClick={() => setShowGenerate(false)}>
          <div className="modal modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h3>Izdaj račun</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              <select className="input" value={genOrderId} onChange={e => setGenOrderId(e.target.value)}>
                <option value="">Izberi naročilo...</option>
                {closedOrders.map((o: any) => (
                  <option key={o.id} value={o.id}>#{o.id} — {o.customer_name || 'Guest'} — {o.total.toFixed(2)} € ({new Date(o.created_at).toLocaleDateString('sl-SI')})</option>
                ))}
              </select>
              <input className="input" placeholder="Kupec (ime)" value={buyerInfo.buyer_name} onChange={e => setBuyerInfo({ ...buyerInfo, buyer_name: e.target.value })} />
              <input className="input" placeholder="Davčna številka" value={buyerInfo.buyer_tax_id} onChange={e => setBuyerInfo({ ...buyerInfo, buyer_tax_id: e.target.value })} />
              <input className="input" placeholder="Naslov" value={buyerInfo.buyer_address} onChange={e => setBuyerInfo({ ...buyerInfo, buyer_address: e.target.value })} />
            </div>
            <div className="modal-btns" style={{ marginTop: 16 }}>
              <button onClick={generate} disabled={!genOrderId} className="btn btn-primary">Izdaj račun</button>
              <button onClick={() => setShowGenerate(false)} className="btn btn-ghost">Prekliči</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
