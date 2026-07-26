import { useState, useEffect } from 'react'
import * as api from './api'

export default function TablesV2Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'status' | 'layout' | 'analytics'>('status')
  const [status, setStatus] = useState<any>(null)
  const [layout, setLayout] = useState<any>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/tables-v2/status', { headers: api.h() }).then(r => r.json()).then(setStatus),
      fetch('/api/v1/tables-v2/layout', { headers: api.h() }).then(r => r.json()).then(setLayout),
      fetch('/api/v1/tables-v2/analytics', { headers: api.h() }).then(r => r.json()).then(setAnalytics),
    ]).catch(() => onNotify('Napaka pri nalaganju')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'status', label: '🪑 Stanje' },
    { key: 'layout', label: '🗺️ Postavitev' },
    { key: 'analytics', label: '📊 Analitika' },
  ] as const

  const statusColor: Record<string, string> = { occupied: '#22c55e', reserved: '#f59e0b', free: '#94a3b8' }

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">🪑 Mize V2</h2>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>{t.label}</button>
        ))}
      </div>

      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'status' && status && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Vse', value: status.summary?.total, color: '#3b82f6' },
                  { label: 'Zasedene', value: status.summary?.occupied, color: '#22c55e' },
                  { label: 'Rezervirane', value: status.summary?.reserved, color: '#f59e0b' },
                  { label: 'Proste', value: status.summary?.free, color: '#94a3b8' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {status.tables?.map((t: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8, borderLeft: `4px solid ${statusColor[t.status] || '#94a3b8'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 16 }}>{t.number}</span>
                    <span style={{ background: `${statusColor[t.status]}20`, color: statusColor[t.status], padding: '2px 8px', borderRadius: 8, fontSize: 10 }}>{t.status === 'occupied' ? 'Zasedena' : t.status === 'reserved' ? 'Rezervirana' : 'Prosta'}</span>
                  </div>
                  {t.status === 'occupied' && <div style={{ fontSize: 12, color: '#666' }}>👥 {t.guests} · {t.server} · {t.order_total} € · Od {t.since}</div>}
                  {t.status === 'reserved' && <div style={{ fontSize: 12, color: '#666' }}>👥 {t.guests} · {t.guest_name} · ob {t.reservation_time}</div>}
                </div>
              ))}
            </div>
          )}

          {tab === 'layout' && layout && (
            <div>
              <div className="card" style={{ padding: 14, marginBottom: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#888' }}>Skupaj kapaciteta</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6' }}>{layout.total_capacity} sedežev · {layout.current_guests} trenutno</div>
              </div>
              {layout.areas?.map((a: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{a.name}</span>
                    <span style={{ color: '#888' }}>{a.capacity} sedežev</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {a.tables?.map((t: number, j: number) => {
                      const table = status?.tables?.find((tb: any) => tb.id === t)
                      return (
                        <div key={j} style={{ width: 60, height: 60, borderRadius: 8, background: statusColor[table?.status || 'free'], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600, fontSize: 14 }}>
                          {table?.number || `T${t}`}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'analytics' && analytics && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Obrat', value: `${analytics.avg_turnover}×`, color: '#3b82f6' },
                  { label: 'Povp. čas', value: `${analytics.avg_seating_time_min} min`, color: '#8b5cf6' },
                  { label: 'Prihodek/mizo', value: `${analytics.revenue_per_table} €`, color: '#22c55e' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {analytics.by_area?.map((a: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{a.area}</span>
                    <span style={{ fontWeight: 700, color: '#22c55e' }}>{a.revenue.toFixed(0)} €</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>{a.covers} gostov · {a.avg_turnover}× obrat</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}