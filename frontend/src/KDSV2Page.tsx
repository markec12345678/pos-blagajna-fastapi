import { useState, useEffect } from 'react'
import * as api from './api'

export default function KDSV2Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'orders' | 'stations' | 'timers' | 'analytics'>('orders')
  const [orders, setOrders] = useState<any[]>([])
  const [stations, setStations] = useState<any>(null)
  const [timers, setTimers] = useState<any>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [priorityFilter, setPriorityFilter] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const url = priorityFilter ? `/api/v1/kds-v2/orders?priority=${priorityFilter}` : '/api/v1/kds-v2/orders'
    Promise.all([
      fetch(url, { headers: api.h() }).then(r => r.json()).then(d => setOrders(d.orders || [])),
      fetch('/api/v1/kds-v2/stations', { headers: api.h() }).then(r => r.json()).then(setStations),
      fetch('/api/v1/kds-v2/timers', { headers: api.h() }).then(r => r.json()).then(setTimers),
      fetch('/api/v1/kds-v2/analytics', { headers: api.h() }).then(r => r.json()).then(setAnalytics),
    ]).catch(() => onNotify('Napaka pri nalaganju')).finally(() => setLoading(false))
  }, [priorityFilter])

  const priorityColor = (p: string) => ({ urgent: '#ef4444', high: '#f59e0b', normal: '#3b82f6', low: '#6b7280' }[p] || '#6b7280')
  const priorityLabel = (p: string) => ({ urgent: 'NUJNO', high: 'Visoka', normal: 'Normalna', low: 'Nizka' }[p] || p)
  const statusColor = (s: string) => ({ pending: '#6b7280', prepping: '#f59e0b', cooking: '#3b82f6', ready: '#22c55e' }[s] || '#6b7280')

  const tabs = [
    { key: 'orders', label: '🍳 Naročila', count: orders.length },
    { key: 'stations', label: '🏪 Postaje' },
    { key: 'timers', label: '⏱️ Časomeri', count: timers?.overdue_count || 0 },
    { key: 'analytics', label: '📊 Analitika' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">🍳 Kuhinja V2</h2>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>
            {t.label}{'count' in t && t.count !== undefined && <span style={{ marginLeft: 4, background: t.key === 'timers' && (t.count as number) > 0 ? '#ef4444' : 'var(--primary)', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 11 }}>{t.count}</span>}
          </button>
        ))}
      </div>

      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'orders' && (
            <div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                {['', 'urgent', 'high', 'normal', 'low'].map(p => (
                  <button key={p} onClick={() => setPriorityFilter(p)} className={`btn btn-xs ${priorityFilter === p ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: 11 }}>
                    {p ? priorityLabel(p) : 'Vse'}
                  </button>
                ))}
              </div>
              {orders.map((order, i) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8, borderLeft: `4px solid ${priorityColor(order.priority)}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700 }}>#{order.id}</span>
                      <span style={{ fontSize: 13 }}>{order.table}</span>
                      <span style={{ background: priorityColor(order.priority), color: '#fff', padding: '1px 6px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>{priorityLabel(order.priority)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: order.elapsed > order.target ? '#ef4444' : '#666' }}>
                      {order.elapsed}/{order.target} min
                    </div>
                  </div>
                  {order.notes && <div style={{ fontSize: 12, color: '#f59e0b', marginBottom: 6, fontStyle: 'italic' }}>📝 {order.notes}</div>}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {order.items?.map((item: any, j: number) => (
                      <div key={j} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                        <div>
                          <span style={{ fontWeight: 600 }}>{item.qty}× {item.name}</span>
                          {item.mods?.length > 0 && <span style={{ color: '#f59e0b', marginLeft: 6 }}>({item.mods.join(', ')})</span>}
                        </div>
                        <span style={{
                          padding: '1px 6px', borderRadius: 8, fontSize: 10,
                          background: statusColor(item.status), color: '#fff',
                        }}>{item.status}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>{order.server} · {order.guests} gostov</div>
                </div>
              ))}
            </div>
          )}

          {tab === 'stations' && stations && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Aktivna naročila</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6' }}>{stations.active_orders}</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Povp. čakalni čas</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b' }}>{stations.avg_wait} min</div>
                </div>
              </div>
              {stations.stations?.map((s: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                    <span style={{ fontSize: 13, color: '#888' }}>{s.orders} naročil</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: 6, height: 8, marginBottom: 4 }}>
                    <div style={{
                      background: s.load > 80 ? '#ef4444' : s.load > 50 ? '#f59e0b' : '#22c55e',
                      height: '100%', borderRadius: 6, width: `${s.load}%`,
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666' }}>
                    <span>Obremenitev: {s.load}%</span>
                    <span>Povp. čas: {s.avg_time} min</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'timers' && timers && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Zamujeni</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#ef4444' }}>{timers.overdue_count}</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Povp. čas</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6' }}>{timers.avg_elapsed} min</div>
                </div>
              </div>
              {timers.timers?.map((t: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8, borderLeft: `4px solid ${t.status === 'overdue' ? '#ef4444' : '#22c55e'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{t.item}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>#{t.order_id} · {t.table}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: t.status === 'overdue' ? '#ef4444' : '#22c55e' }}>
                        {t.elapsed}/{t.target} min
                      </div>
                      <div style={{ fontSize: 11, color: '#888' }}>Začetek: {t.started}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'analytics' && analytics && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Povp. priprava', value: `${analytics.avg_prep_time} min`, color: '#3b82f6' },
                  { label: 'Pravočasno', value: `${analytics.on_time_rate}%`, color: '#22c55e' },
                  { label: 'Zamujeno', value: `${analytics.overdue_rate}%`, color: '#ef4444' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <h4 style={{ margin: '0 0 8px' }}>📊 Učinkovitost postaj</h4>
              {analytics.efficiency_by_station?.map((s: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{s.station}</span>
                    <span style={{ color: s.efficiency >= 100 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{s.efficiency}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666' }}>
                    <span>Povp: {s.avg_time} min</span>
                    <span>Cilj: {s.target} min</span>
                  </div>
                </div>
              ))}
              {analytics.peak_hours?.length > 0 && (
                <div className="card" style={{ padding: 14, marginTop: 12 }}>
                  <h4 style={{ margin: '0 0 8px' }}>⏰ Konicne ure</h4>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {analytics.peak_hours.map((h: string, i: number) => (
                      <span key={i} style={{ background: '#fef3c7', color: '#d97706', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>{h}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}