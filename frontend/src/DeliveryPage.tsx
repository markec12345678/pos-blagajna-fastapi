import { useState, useEffect } from 'react'
import * as api from './api'

export default function DeliveryPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [orders, setOrders] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [filter, setFilter] = useState('')
  const [apiKey, setApiKey] = useState('')

  const load = async () => {
    try {
      const q = filter ? `?status=${filter}` : ''
      const r = await fetch(`/api/v1/delivery${q}`, { headers: api.authHeader() }).then(r => r.json())
      setOrders(r)
    } catch { onNotify('Napaka pri nalaganju dostav') }
    try { const r = await fetch('/api/v1/delivery/stats', { headers: api.authHeader() }).then(r => r.json()); setStats(r) } catch {}
    try { const r = await fetch('/api/v1/settings', { headers: api.authHeader() }).then(r => r.json()); setApiKey(r.delivery_api_key || '') } catch {}
  }

  useEffect(() => { load() }, [filter])

  const acceptOrder = async (id: number) => {
    try {
      const r = await fetch(`/api/v1/delivery/${id}/accept`, { method: 'POST', headers: api.authHeader() }).then(r => r.json())
      onNotify(`✅ Naročilo prevzeto → Order #${r.order_id}`)
      load()
    } catch { onNotify('❌ Napaka') }
  }

  const setStatus = async (id: number, status: string) => {
    await fetch(`/api/v1/delivery/${id}/status`, { method: 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    onNotify(`Status: ${status}`)
    load()
  }

  const statusColor = (s: string) => {
    const m: Record<string, string> = { pending: 'var(--orange)', accepted: '#3b82f6', preparing: '#8b5cf6', ready: '#22c55e', picked_up: '#10b981', delivered: '#059669', cancelled: 'var(--red)' }
    return m[s] || 'var(--text2)'
  }

  const aggregatorIcon = (a: string) => {
    const m: Record<string, string> = { doordash: '🟥', ubereats: '🟩', wolt: '🟦', glovo: '🟧', '': '🛵' }
    return m[a.toLowerCase()] || '🛵'
  }

  return (
    <div className="delivery-page">
      <div className="page-header">
        <h2>🛵 Dostava (agregatorji)</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="input" style={{ width: 140 }} value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">Vsa naročila</option>
            <option value="pending">⏳ Čakajoča</option>
            <option value="accepted">✅ Prevzeta</option>
            <option value="preparing">👨‍🍳 Priprava</option>
            <option value="ready">📦 Pripravljeno</option>
            <option value="picked_up">🚚 Na poti</option>
            <option value="delivered">✅ Dostavljeno</option>
            <option value="cancelled">❌ Preklicana</option>
          </select>
        </div>
      </div>

      {stats && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div className="card" style={{ padding: '8px 16', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{stats.total}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)' }}>Skupaj</div>
          </div>
          {Object.entries(stats.by_aggregator || {}).map(([a, c]) => (
            <div key={a} className="card" style={{ padding: '8px 16', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{aggregatorIcon(a)} {String(c)}</div>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>{a}</div>
            </div>
          ))}
          {Object.entries(stats.by_status || {}).map(([s, c]) => (
            <div key={s} className="card" style={{ padding: '8px 16', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: statusColor(s) }}>{String(c)}</div>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>{s}</div>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ padding: 12, marginBottom: 16 }}>
        <h4 className="mb-8">🔑 API ključ za webhook</h4>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" style={{ flex: 1, fontFamily: 'monospace' }} value={apiKey} onChange={e => setApiKey(e.target.value)}
            placeholder="Prazen = brez avtentikacije" />
          <button onClick={async () => {
            await fetch('/api/v1/settings', { method: 'PUT', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ delivery_api_key: apiKey }) })
            onNotify('API ključ shranjen')
          }} className="btn btn-sm btn-primary">Shrani</button>
          <button onClick={() => { navigator.clipboard.writeText(apiKey); onNotify('Kopirano') }} className="btn btn-sm btn-ghost">📋</button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 6 }}>
          Webhook URL: <code style={{ background: 'var(--bg3)', padding: '2px 6px', borderRadius: 4 }}>{window.location.origin}/api/v1/delivery/webhook</code>
        </div>
      </div>

      {orders.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text2)', padding: 40 }}>Ni naročil</p>
      ) : (
        <div className="delivery-grid">
          {orders.map(o => (
            <div key={o.id} className="card" style={{ padding: 16, borderLeft: `4px solid ${statusColor(o.status)}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <span style={{ fontWeight: 700 }}>{aggregatorIcon(o.aggregator)} #{o.id}</span>
                  <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text2)' }}>{o.aggregator}{o.external_id ? ` / ${o.external_id}` : ''}</span>
                </div>
                <span style={{ fontWeight: 700, fontSize: 16 }}>{o.total.toFixed(2)} €</span>
              </div>

              <div style={{ fontSize: 13, marginBottom: 6 }}>
                <div><strong>{o.customer_name}</strong> {o.customer_phone && `📞 ${o.customer_phone}`}</div>
                {o.delivery_address && <div style={{ color: 'var(--text2)', fontSize: 12 }}>📍 {o.delivery_address}</div>}
              </div>

              <div style={{ fontSize: 12, marginBottom: 8 }}>
                {o.items.map((item: any, i: number) => (
                  <div key={i}>×{item.quantity} {item.name} — {((item.price || 0) * (item.quantity || 1)).toFixed(2)} €</div>
                ))}
              </div>

              {o.delivery_fee > 0 && <div style={{ fontSize: 11, color: 'var(--text2)' }}>Dostava: {o.delivery_fee.toFixed(2)} €</div>}
              {o.service_fee > 0 && <div style={{ fontSize: 11, color: 'var(--text2)' }}>Storitev: {o.service_fee.toFixed(2)} €</div>}
              {o.internal_order_id && <div style={{ fontSize: 11, color: '#3b82f6' }}>📄 Order #{o.internal_order_id}</div>}

              <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 6, marginBottom: 8 }}>
                {new Date(o.created_at).toLocaleString('sl-SI')}
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {o.status === 'pending' && (
                  <button onClick={() => acceptOrder(o.id)} className="btn btn-sm btn-primary">✅ Prevzemi</button>
                )}
                {o.status === 'pending' && (
                  <button onClick={() => setStatus(o.id, 'cancelled')} className="btn btn-sm btn-ghost" style={{ color: 'var(--red)' }}>❌ Zavrni</button>
                )}
                {['accepted'].includes(o.status) && (
                  <button onClick={() => setStatus(o.id, 'preparing')} className="btn btn-sm btn-purple">👨‍🍳 V pripravi</button>
                )}
                {['preparing'].includes(o.status) && (
                  <button onClick={() => setStatus(o.id, 'ready')} className="btn btn-sm btn-primary">📦 Pripravljeno</button>
                )}
                {['ready'].includes(o.status) && (
                  <button onClick={() => setStatus(o.id, 'picked_up')} className="btn btn-sm btn-blue">🚚 Na poti</button>
                )}
                {['picked_up'].includes(o.status) && (
                  <button onClick={() => setStatus(o.id, 'delivered')} className="btn btn-sm btn-green">✅ Dostavljeno</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
