import { useState, useEffect } from 'react'
import * as api from './api'

export default function KitchenV2Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'orders' | 'stations' | 'timing' | 'performance'>('orders')
  const [orders, setOrders] = useState<any>(null)
  const [stations, setStations] = useState<any>(null)
  const [timing, setTiming] = useState<any>(null)
  const [performance, setPerformance] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/kitchen-v2/orders', { headers: api.h() }).then(r => r.json()).then(setOrders),
      fetch('/api/v1/kitchen-v2/stations', { headers: api.h() }).then(r => r.json()).then(setStations),
      fetch('/api/v1/kitchen-v2/timing', { headers: api.h() }).then(r => r.json()).then(setTiming),
      fetch('/api/v1/kitchen-v2/performance', { headers: api.h() }).then(r => r.json()).then(setPerformance),
    ]).catch(() => onNotify('Napaka')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'orders', label: '🍳 Naročila' },
    { key: 'stations', label: '📍 Postaje' },
    { key: 'timing', label: '⏱️ Časi' },
    { key: 'performance', label: '📊 Uspešnost' },
  ] as const

  const statusColor: Record<string, string> = { new: '#f59e0b', preparing: '#3b82f6', ready: '#22c55e', served: '#8b5cf6' }

  return (
    <div className="page-container-sm">
      <div className="page-header-sm"><h2 className="page-title">🍳 Kuhinja V2</h2></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>{t.label}</button>
        ))}
      </div>
      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'orders' && orders && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                {[
                  { label: 'Nova', value: orders.summary.new, color: '#f59e0b' },
                  { label: 'Priprava', value: orders.summary.preparing, color: '#3b82f6' },
                  { label: 'Pripravljeno', value: orders.summary.ready, color: '#22c55e' },
                  { label: 'Postreženo', value: orders.summary.served, color: '#8b5cf6' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888' }}>{s.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {orders.orders?.map((o: any) => (
                <div key={o.id} className="card" style={{ padding: 14, marginBottom: 8, borderLeft: `4px solid ${statusColor[o.status] || '#888'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontWeight: 700 }}>#{o.id} · T{o.table}</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {o.priority === 'rush' && <span style={{ background: '#fef2f2', color: '#dc2626', padding: '1px 6px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>🚨 RUSH</span>}
                      <span style={{ background: statusColor[o.status] + '22', color: statusColor[o.status], padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{o.status}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, marginBottom: 6 }}>{o.items.join(' · ')}</div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                    <span>👨‍🍳 {o.chef || 'Nedodeljen'}</span>
                    <span>⏱️ {o.elapsed_min} min</span>
                    <span>📋 {o.est_min > 0 ? `${o.est_min} min` : 'Pripravljeno!'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'stations' && stations && (
            <div>
              {stations.stations?.map((s: any) => (
                <div key={s.id} className="card" style={{ padding: 14, marginBottom: 8, borderLeft: `4px solid ${s.status === 'busy' ? '#3b82f6' : '#22c55e'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                    <span style={{ background: s.status === 'busy' ? '#dbeafe' : '#dcfce7', color: s.status === 'busy' ? '#2563eb' : '#16a34a', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{s.status === 'busy' ? 'Zasedena' : 'Prosta'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                    <span>👨‍🍳 {s.chef}</span>
                    <span>📋 {s.orders} naročil</span>
                    <span>⏱️ Povp. {s.avg_time_min} min</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'timing' && timing && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Povp. priprava', value: `${timing.avg_prep_time_min} min`, color: '#3b82f6' },
                  { label: 'Povp. celoten čas', value: `${timing.avg_ticket_time_min} min`, color: '#f59e0b' },
                  { label: 'Pravočasnost', value: `${timing.on_time_rate}%`, color: '#22c55e' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <h4 style={{ margin: '0 0 8px' }}>📊 Po urah</h4>
              {timing.by_hour?.map((h: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>{h.hour}</span>
                  <div style={{ fontSize: 12 }}>{h.orders} naročil · {h.avg_min} min</div>
                </div>
              ))}
            </div>
          )}
          {tab === 'performance' && performance && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Kuharji', value: performance.summary.total_chefs, color: '#3b82f6' },
                  { label: 'Povp. učinkovitost', value: `${performance.summary.avg_efficiency}%`, color: '#22c55e' },
                  { label: 'Najboljši', value: performance.summary.best_performer, color: '#f59e0b' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {performance.chefs?.map((c: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>👨‍🍳 {c.name}</span>
                    <span style={{ color: '#f59e0b' }}>⭐ {c.rating}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                    <span>📋 {c.orders} naročil</span>
                    <span>⏱️ {c.avg_min} min</span>
                    <span>✅ {c.on_time}% pravočasno</span>
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