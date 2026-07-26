import { useState, useEffect } from 'react'
import * as api from './api'

export default function OrdersV2Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'list' | 'dashboard' | 'timeline'>('list')
  const [orders, setOrders] = useState<any[]>([])
  const [dashboard, setDashboard] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [timeline, setTimeline] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/orders-v2/search', { headers: api.h() }).then(r => r.json()).then(d => setOrders(d.orders || [])),
      fetch('/api/v1/orders-v2/dashboard', { headers: api.h() }).then(r => r.json()).then(setDashboard),
    ]).catch(() => onNotify('Napaka pri nalaganju')).finally(() => setLoading(false))
  }, [])

  const loadTimeline = async (orderId: number) => {
    try {
      const data = await fetch(`/api/v1/orders-v2/${orderId}/timeline`, { headers: api.h() }).then(r => r.json())
      setTimeline(data)
      setSelectedOrder(orderId)
      setTab('timeline')
    } catch { onNotify('Napaka') }
  }

  const statusColor = (s: string) => ({ pending: '#f59e0b', preparing: '#3b82f6', ready: '#22c55e', served: '#8b5cf6', completed: '#6b7280' }[s] || '#6b7280')
  const statusLabel = (s: string) => ({ pending: 'Čaka', preparing: 'Priprava', ready: 'Pripravljeno', served: 'Postreženo', completed: 'Končano' }[s] || s)
  const filtered = orders.filter(o => {
    if (search && !String(o.id).includes(search) && !o.table.toLowerCase().includes(search.toLowerCase()) && !o.server.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter && o.status !== statusFilter) return false
    return true
  })

  const tabs = [
    { key: 'list', label: '📋 Seznam', count: orders.length },
    { key: 'dashboard', label: '📊 Dashboard' },
    { key: 'timeline', label: '⏱️ Časovnica' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">📋 Naročila V2</h2>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>
            {t.label}{'count' in t && t.count !== undefined && <span style={{ marginLeft: 4, background: 'var(--primary)', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 11 }}>{t.count}</span>}
          </button>
        ))}
      </div>

      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'list' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input className="input" placeholder="🔍 Iskanje (ID, miza, natakar)..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
                <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 140 }}>
                  <option value="">Vsi statusi</option>
                  {['pending', 'preparing', 'ready', 'served', 'completed'].map(s => (
                    <option key={s} value={s}>{statusLabel(s)}</option>
                  ))}
                </select>
              </div>
              {filtered.map((order, i) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8, cursor: 'pointer' }} onClick={() => loadTimeline(order.id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontWeight: 700 }}>#{order.id}</span>
                        <span style={{ fontSize: 13 }}>{order.table}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{order.server} · {order.items} jedi · {order.guests} gostov</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ background: statusColor(order.status), color: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>{statusLabel(order.status)}</span>
                      <div style={{ fontWeight: 700, marginTop: 4 }}>{order.total?.toFixed(2)} €</div>
                      {order.payment && <div style={{ fontSize: 11, color: '#888' }}>{order.payment}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'dashboard' && dashboard && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Danes naročil', value: dashboard.today?.total_orders || 0, color: '#3b82f6' },
                  { label: 'Prihodek', value: `${dashboard.today?.total_revenue?.toFixed(0) || 0} €`, color: '#22c55e' },
                  { label: 'Povp. vrednost', value: `${dashboard.today?.avg_order_value?.toFixed(2) || 0} €`, color: '#f59e0b' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>

              <h4 style={{ margin: '0 0 8px' }}>📊 Po statusu</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 16 }}>
                {Object.entries(dashboard.by_status || {}).map(([status, count]) => (
                  <div key={status} className="card" style={{ padding: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: statusColor(status) }}>{count as number}</div>
                    <div style={{ fontSize: 10, color: '#888' }}>{statusLabel(status)}</div>
                  </div>
                ))}
              </div>

              <h4 style={{ margin: '0 0 8px' }}>⏰ Po uri</h4>
              {dashboard.by_hour?.map((h: any, i: number) => (
                <div key={i} className="card" style={{ padding: 8, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{h.hour}</span>
                  <div style={{ flex: 1, margin: '0 12px', background: '#e5e7eb', borderRadius: 4, height: 8 }}>
                    <div style={{ background: '#3b82f6', height: '100%', borderRadius: 4, width: `${(h.orders / 25) * 100}%` }} />
                  </div>
                  <span style={{ fontSize: 12, color: '#666' }}>{h.orders} · {h.revenue} €</span>
                </div>
              ))}

              <h4 style={{ margin: '16px 0 8px' }}>🏆 Top jedi danes</h4>
              {dashboard.top_items?.map((item: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>#{i + 1} {item.name}</span>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                    <span>{item.qty}×</span>
                    <span style={{ fontWeight: 600 }}>{item.revenue?.toFixed(0)} €</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'timeline' && timeline && (
            <div>
              <div style={{ marginBottom: 12 }}>
                <button className="btn btn-sm btn-ghost" onClick={() => setTab('list')}>← Nazaj na seznam</button>
                <span style={{ marginLeft: 12, fontWeight: 700 }}>Naročilo #{timeline.order_id}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                {Object.entries(timeline.duration || {}).map(([key, val]) => (
                  <div key={key} className="card" style={{ padding: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: '#888' }}>{key.replace(/_/g, ' ')}</div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{val as string}</div>
                  </div>
                ))}
              </div>
              <h4 style={{ margin: '0 0 8px' }}>⏱️ Časovnica</h4>
              {timeline.timeline?.map((t: any, i: number) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: '#888', width: 70 }}>{t.time}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{t.description}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{t.by}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}