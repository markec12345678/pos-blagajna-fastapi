import { useState, useEffect } from 'react'
import * as api from './api'

export default function OrderHistoryPage({ onNotify }: { onNotify: (m: string) => void }) {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('closed')
  const [typeFilter, setTypeFilter] = useState('')
  const [detailId, setDetailId] = useState<number | null>(null)
  const [detail, setDetail] = useState<any>(null)
  const [refundId, setRefundId] = useState<number | null>(null)
  const [refundAmount, setRefundAmount] = useState('')
  const [page, setPage] = useState(0)
  const pageSize = 50

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(pageSize + pageSize * page) })
      if (statusFilter) params.set('status', statusFilter)
      const r = await fetch(`/api/v1/orders/history/recent?${params}`, { headers: api.authHeader() })
      setOrders(await r.json())
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [statusFilter, typeFilter, page])

  const viewDetail = async (id: number) => {
    try {
      const r = await fetch(`/api/v1/orders/${id}`, { headers: api.authHeader() })
      setDetail(await r.json())
      setDetailId(id)
    } catch {}
  }

  const doRefund = async () => {
    if (!refundId || !parseFloat(refundAmount)) return
    try {
      const r = await fetch(`/api/v1/orders/${refundId}/refund`, { method: 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: parseFloat(refundAmount), method: 'cash' }) })
      if (!r.ok) throw new Error('Napaka')
      onNotify(`Vračilo ${refundAmount}€ obdelano`)
      setRefundId(null); setRefundAmount(''); load()
    } catch (e: any) { onNotify(e.message) }
  }

  const reopen = async (id: number) => {
    try {
      await fetch(`/api/v1/orders/${id}/reopen`, { method: 'POST', headers: api.authHeader() })
      onNotify(`Naročilo #${id} ponovno odprto`)
      load()
    } catch (e: any) { onNotify(e.message) }
  }

    const printReceipt = async (o: any) => {
    const { printReceipt: printFn } = await import('./PrintService')
    printFn(o, '', 0)
  }

  const filtered = orders.filter(o =>
    (!search || `${o.id}`.includes(search) || (o.customer_name || '').toLowerCase().includes(search.toLowerCase()) || (o.table_name || '').toLowerCase().includes(search.toLowerCase())) &&
    (!typeFilter || o.order_type === typeFilter)
  )

  const statuses = [
    { key: '', label: 'Vse' },
    { key: 'closed', label: 'Zaključena' },
    { key: 'open', label: 'Odprta' },
    { key: 'cancelled', label: 'Preklicana' },
  ]

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 16 }}>📋 Zgodovina naročil</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="input" placeholder="🔍 Išči po ID, imenu, mizi..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 280 }} />
        <div style={{ display: 'flex', gap: 4 }}>
          {statuses.map(s => (
            <button key={s.key} onClick={() => setStatusFilter(s.key)} className={`btn btn-sm ${statusFilter === s.key ? 'btn-primary' : 'btn-ghost'}`}>{s.label}</button>
          ))}
        </div>
        <select className="input" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ width: 120, fontSize: 12 }}>
          <option value="">Vsi tipi</option>
          <option value="dine-in">Tukaj</option>
          <option value="takeaway">Za sabo</option>
          <option value="delivery">Dostava</option>
        </select>
        <span style={{ fontSize: 12, color: '#64748b' }}>{filtered.length} naročil</span>
      </div>

      {loading ? <p>Nalaganje...</p> : filtered.length === 0 ? <p style={{ color: '#666' }}>Ni naročil.</p> : (
        <div style={{ display: 'grid', gap: 6 }}>
          {filtered.map(o => (
            <div key={o.id} className="card" style={{
              padding: '10px 14px', cursor: 'pointer',
              borderLeft: `4px solid ${
                o.status === 'closed' ? '#059669' :
                o.status === 'open' ? '#f59e0b' :
                o.status === 'cancelled' ? '#ef4444' :
                o.status === 'scheduled' ? '#8b5cf6' : '#64748b'
              }`
            }} onClick={() => viewDetail(o.id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>#{o.invoice_number || o.id}</strong>
                  <span style={{ marginLeft: 8, fontSize: 13, color: '#64748b' }}>{o.table_name || `Miza ${o.table_id}`}</span>
                  {o.customer_name && <span style={{ marginLeft: 8, fontSize: 13, color: '#64748b' }}>👤 {o.customer_name}</span>}
                  {o.order_type === 'delivery' && <span className="badge" style={{ marginLeft: 6, background: '#8b5cf6', color: 'white' }}>Dostava</span>}
                  {o.order_type === 'takeaway' && <span className="badge" style={{ marginLeft: 6, background: '#3b82f6', color: 'white' }}>Za sabo</span>}
                  {o.order_type === 'takeaway' && <span className="badge" style={{ marginLeft: 6, background: '#3b82f6', color: 'white' }}>Za sabo</span>}
                  {o.scheduled_at && <span className="badge" style={{ marginLeft: 6, background: '#8b5cf6', color: 'white' }}>📆 {new Date(o.scheduled_at).toLocaleString('sl-SI', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>}
                  {(() => { try { const tags = JSON.parse(o.tags || '[]'); if (!tags.length) return null; return tags.map((t: string, i: number) => <span key={i} className="badge" style={{ marginLeft: 4, background: '#555', color: '#fff', fontSize: 10 }}>{t}</span>) } catch { return null }})()}
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 16 }}>{(o.total || 0).toFixed(2)} €</span>
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>
                    {o.closed_at ? new Date(o.closed_at).toLocaleDateString('sl-SI', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                      : new Date(o.created_at).toLocaleDateString('sl-SI', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {detailId && detail && (
        <div className="overlay" onClick={() => { setDetailId(null); setDetail(null) }}>
          <div className="modal modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
              <div>
                <h3>Naročilo #{detail.invoice_number || detail.id}</h3>
                <p style={{ fontSize: 13, color: '#64748b' }}>
                  Miza {detail.table_id || '—'} • {new Date(detail.created_at).toLocaleString('sl-SI')}
                  {detail.customer_name && ` • 👤 ${detail.customer_name}`}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => printReceipt(detail)} className="btn btn-sm btn-blue">🖨️</button>
                {detail.status === 'closed' && <button onClick={() => reopen(detail.id)} className="btn btn-sm btn-ghost">🔄 Ponovno odpri</button>}
                {detail.status === 'closed' && <button onClick={() => { setRefundId(detail.id); setRefundAmount('') }} className="btn btn-sm btn-danger">↩️ Vračilo</button>}
              </div>
            </div>

            <table className="table" style={{ width: '100%', fontSize: 13 }}>
              <thead><tr><th>Artikel</th><th>Kol</th><th>Cena</th><th>Skupaj</th></tr></thead>
              <tbody>
                {detail.items?.map((i: any) => (
                  <tr key={i.id}>
                    <td>{i.item_name}</td>
                    <td>x{i.quantity}</td>
                    <td>{i.unit_price?.toFixed(2)} €</td>
                    <td style={{ fontWeight: 600 }}>{i.total_price?.toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {detail.discount_amount > 0 && (
              <p style={{ textAlign: 'right', fontSize: 13, color: '#ef4444', marginTop: 8 }}>
                Popust: -{detail.discount_amount.toFixed(2)} € ({detail.discount_value}{detail.discount_type === 'percentage' ? '%' : '€'})
              </p>
            )}
            <p style={{ textAlign: 'right', fontSize: 18, fontWeight: 700, marginTop: 8 }}>
              Skupaj: {(detail.total || 0).toFixed(2)} €
            </p>
          </div>
        </div>
      )}

      {refundId && (
        <div className="overlay" onClick={() => { setRefundId(null); setRefundAmount('') }}>
          <div className="modal modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 320 }}>
            <h3>↩️ Vračilo sredstev</h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>Naročilo #{refundId}</p>
            <input className="input" type="number" placeholder="Znesek vračila" value={refundAmount} onChange={e => setRefundAmount(e.target.value)} />
            <div className="modal-btns">
              <button onClick={doRefund} className="btn btn-danger" disabled={!parseFloat(refundAmount)}>Potrdi vračilo</button>
              <button onClick={() => { setRefundId(null); setRefundAmount('') }} className="btn btn-ghost">Prekliči</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}