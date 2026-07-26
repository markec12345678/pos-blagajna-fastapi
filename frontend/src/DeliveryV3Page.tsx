import { useState, useEffect } from 'react'
import * as api from './api'

export default function DeliveryV3Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'tracking' | 'drivers' | 'routes' | 'analytics'>('tracking')
  const [tracking, setTracking] = useState<any>(null)
  const [drivers, setDrivers] = useState<any>(null)
  const [routes, setRoutes] = useState<any>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/delivery-v3/tracking', { headers: api.h() }).then(r => r.json()).then(setTracking),
      fetch('/api/v1/delivery-v3/drivers', { headers: api.h() }).then(r => r.json()).then(setDrivers),
      fetch('/api/v1/delivery-v3/routes', { headers: api.h() }).then(r => r.json()).then(setRoutes),
      fetch('/api/v1/delivery-v3/analytics', { headers: api.h() }).then(r => r.json()).then(setAnalytics),
    ]).catch(() => onNotify('Napaka')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'tracking', label: '📍 Sledenje' },
    { key: 'drivers', label: '🚗 Vozniki' },
    { key: 'routes', label: '🗺️ Relacije' },
    { key: 'analytics', label: '📊 Analitika' },
  ] as const

  const statusColor: Record<string, string> = { in_transit: '#3b82f6', preparing: '#f59e0b', delivered: '#22c55e' }

  return (
    <div className="page-container-sm">
      <div className="page-header-sm"><h2 className="page-title">🚗 Dostava V3</h2></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>{t.label}</button>
        ))}
      </div>
      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'tracking' && tracking && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Aktivne dostave', value: tracking.active_deliveries, color: '#3b82f6' },
                  { label: 'Danes zaključene', value: tracking.completed_today, color: '#22c55e' },
                  { label: 'Povp. čas', value: `${tracking.avg_delivery_time_min} min`, color: '#f59e0b' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {tracking.deliveries?.map((d: any) => (
                <div key={d.id} className="card" style={{ padding: 14, marginBottom: 8, borderLeft: `4px solid ${statusColor[d.status] || '#888'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>#{d.id} · {d.customer}</span>
                    <span style={{ background: statusColor[d.status] + '22', color: statusColor[d.status], padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{d.status === 'in_transit' ? 'Na poti' : d.status === 'preparing' ? 'Priprava' : 'Dostavljeno'}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>📍 {d.address}</div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                    <span>📦 {d.items} artiklov</span>
                    <span>🚗 {d.driver || 'Čaka voznika'}</span>
                    <span>⏱️ {d.eta_min > 0 ? `${d.eta_min} min` : 'Dostavljeno'}</span>
                    <span>📏 {d.distance_km} km</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'drivers' && drivers && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Aktivni vozniki</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6' }}>{drivers.active_drivers}</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Prosti vozniki</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>{drivers.available_drivers}</div>
                </div>
              </div>
              {drivers.drivers?.map((d: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>🚗 {d.name}</span>
                    <span style={{ background: d.status === 'delivering' ? '#dbeafe' : '#dcfce7', color: d.status === 'delivering' ? '#2563eb' : '#16a34a', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{d.status === 'delivering' ? 'Na poti' : 'Prost'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12, color: '#666' }}>
                    <span>📋 {d.deliveries_today} dostav</span>
                    <span>⏱️ {d.avg_time_min} min</span>
                    <span>⭐ {d.rating}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Vozilo: {d.vehicle}</div>
                </div>
              ))}
            </div>
          )}
          {tab === 'routes' && routes && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Optimizirane relacije', value: routes.optimized_routes, color: '#3b82f6' },
                  { label: 'Prihranek goriva', value: `${routes.fuel_saved_liters} L`, color: '#22c55e' },
                  { label: 'Prihranek časa', value: `${routes.time_saved_min} min`, color: '#f59e0b' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {routes.routes?.map((r: any) => (
                <div key={r.id} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>🗺️ {r.driver}</span>
                    <span style={{ fontWeight: 700, color: r.efficiency > 90 ? '#22c55e' : '#f59e0b' }}>{r.efficiency}%</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                    <span>📍 {r.stops} postaj</span>
                    <span>📏 {r.distance_km} km</span>
                    <span>⏱️ {r.time_min} min</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: 4, height: 6, marginTop: 6 }}>
                    <div style={{ background: r.efficiency > 90 ? '#22c55e' : '#f59e0b', height: '100%', borderRadius: 4, width: `${r.efficiency}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'analytics' && analytics && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Dostav ta mesec', value: analytics.total_deliveries_month, color: '#3b82f6' },
                  { label: 'Pravočasnost', value: `${analytics.on_time_rate}%`, color: '#22c55e' },
                  { label: 'Zadovoljstvo', value: `⭐ ${analytics.customer_satisfaction}`, color: '#f59e0b' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <h4 style={{ margin: '0 0 8px' }}>📊 Po urah</h4>
              {analytics.by_hour?.map((h: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{h.hour}</span>
                    <span>{h.orders} naročil · {h.avg_min} min</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: 4, height: 6 }}>
                    <div style={{ background: '#3b82f6', height: '100%', borderRadius: 4, width: `${(h.orders / 20) * 100}%` }} />
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