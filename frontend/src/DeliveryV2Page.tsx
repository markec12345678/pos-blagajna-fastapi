import { useState, useEffect } from 'react'
import * as api from './api'

export default function DeliveryV2Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'active' | 'drivers' | 'analytics'>('active')
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/delivery-v2/active', { headers: api.h() }).then(r => r.json()).then(d => setDeliveries(d.deliveries || [])),
      fetch('/api/v1/delivery-v2/drivers', { headers: api.h() }).then(r => r.json()).then(setDrivers),
      fetch('/api/v1/delivery-v2/analytics', { headers: api.h() }).then(r => r.json()).then(setAnalytics),
    ]).catch(() => onNotify('Napaka pri nalaganju')).finally(() => setLoading(false))
  }, [])

  const statusColor = (s: string) => ({ preparing: '#f59e0b', in_transit: '#3b82f6', delivered: '#22c55e', cancelled: '#ef4444' }[s] || '#6b7280')
  const statusLabel = (s: string) => ({ preparing: 'Priprava', in_transit: 'Na poti', delivered: 'Dostavljeno', cancelled: 'Preklicano' }[s] || s)
  const driverStatusColor = (s: string) => ({ available: '#22c55e', busy: '#f59e0b', offline: '#6b7280' }[s] || '#6b7280')

  const tabs = [
    { key: 'active', label: '🚗 Aktivne', count: deliveries.filter(d => d.status !== 'delivered').length },
    { key: 'drivers', label: '🧑 Vozniki' },
    { key: 'analytics', label: '📊 Analitika' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">🚗 Dostava V2</h2>
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
          {tab === 'active' && (
            <div>
              {deliveries.map((d, i) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8, borderLeft: `4px solid ${statusColor(d.status)}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>#{d.order_id} — {d.customer}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{d.address}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{d.phone}</div>
                    </div>
                    <span style={{ background: statusColor(d.status), color: '#fff', padding: '2px 10px', borderRadius: 12, fontSize: 11 }}>{statusLabel(d.status)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#666' }}>
                    <span>{d.items} jedi</span>
                    <span style={{ fontWeight: 600 }}>{d.total?.toFixed(2)} €</span>
                    {d.driver && <span>Voznik: {d.driver}</span>}
                    {d.eta > 0 && <span style={{ color: '#f59e0b' }}>ETA: {d.eta} min</span>}
                  </div>
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>Ustvarjeno: {d.created}</div>
                </div>
              ))}
            </div>
          )}

          {tab === 'drivers' && drivers && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Skupaj', value: drivers.total_drivers || 0, color: '#3b82f6' },
                  { label: 'Razpoložljivi', value: drivers.available || 0, color: '#22c55e' },
                  { label: 'Zasedeni', value: drivers.busy || 0, color: '#f59e0b' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {drivers.drivers?.map((d: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{d.name}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>Današnje: {d.total_today} · Povp. čas: {d.avg_time} min</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13 }}>⭐ {d.rating}</span>
                      <span style={{ background: driverStatusColor(d.status), color: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>{d.status}</span>
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
                  { label: 'Dostave', value: analytics.total_deliveries || 0, color: '#3b82f6' },
                  { label: 'Povp. čas', value: `${analytics.avg_delivery_time} min`, color: '#f59e0b' },
                  { label: 'Pravočasno', value: `${analytics.on_time_rate}%`, color: '#22c55e' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <h4 style={{ margin: '0 0 8px' }}>📍 Top območja</h4>
              {analytics.top_areas?.map((a: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>{a.area}</span>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                    <span>{a.deliveries} dostav</span>
                    <span>{a.avg_time} min</span>
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