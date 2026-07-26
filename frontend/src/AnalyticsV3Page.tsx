import { useState, useEffect } from 'react'
import * as api from './api'

export default function AnalyticsV3Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'realtime' | 'cohort' | 'funnel' | 'segments'>('realtime')
  const [realtime, setRealtime] = useState<any>(null)
  const [cohort, setCohort] = useState<any>(null)
  const [funnel, setFunnel] = useState<any>(null)
  const [segments, setSegments] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/analytics-v3/realtime', { headers: api.h() }).then(r => r.json()).then(setRealtime),
      fetch('/api/v1/analytics-v3/cohort', { headers: api.h() }).then(r => r.json()).then(setCohort),
      fetch('/api/v1/analytics-v3/funnel', { headers: api.h() }).then(r => r.json()).then(setFunnel),
      fetch('/api/v1/analytics-v3/segments', { headers: api.h() }).then(r => r.json()).then(setSegments),
    ]).catch(() => onNotify('Napaka')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'realtime', label: '🔴 V živo' },
    { key: 'cohort', label: '👥 Koorti' },
    { key: 'funnel', label: '🔻 Lijak' },
    { key: 'segments', label: '📊 Segmenti' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm"><h2 className="page-title">📈 Analitika V3</h2></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>{t.label}</button>
        ))}
      </div>
      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'realtime' && realtime && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Aktivne mize', value: realtime.active_tables, color: '#22c55e' },
                  { label: 'Aktivna naročila', value: realtime.active_orders, color: '#3b82f6' },
                  { label: 'Prihodki danes', value: `${realtime.revenue_today} €`, color: '#8b5cf6' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Gostje danes', value: realtime.guests_today, color: '#f59e0b' },
                  { label: 'Povp. naročilo', value: `${realtime.avg_order_value} €`, color: '#ef4444' },
                  { label: 'Naročil/uro', value: realtime.orders_per_hour, color: '#06b6d4' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <h4 style={{ margin: '0 0 8px' }}>🔴 Živi dogodki</h4>
              {realtime.live_feed?.map((e: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `3px solid ${e.type === 'order' ? '#3b82f6' : e.type === 'payment' ? '#22c55e' : '#f59e0b'}` }}>
                  <span style={{ fontSize: 13 }}>{e.event}</span>
                  <span style={{ fontSize: 11, color: '#888' }}>{e.time}</span>
                </div>
              ))}
            </div>
          )}
          {tab === 'cohort' && cohort && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Povp. Retencija 30d', value: `${cohort.summary.avg_retention_30d}%`, color: '#22c55e' },
                  { label: 'Povp. LTV', value: `${cohort.summary.avg_ltv} €`, color: '#3b82f6' },
                  { label: 'Najboljši kohort', value: cohort.summary.best_cohort, color: '#f59e0b' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {cohort.cohorts?.map((c: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{c.month}</span>
                    <span style={{ fontSize: 12, color: '#666' }}>{c.customers} strank</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                    <div><span style={{ color: '#888' }}>30d: </span><b style={{ color: c.retention_30d > 65 ? '#22c55e' : '#f59e0b' }}>{c.retention_30d}%</b></div>
                    <div><span style={{ color: '#888' }}>90d: </span><b>{c.retention_90d ? `${c.retention_90d}%` : '—'}</b></div>
                    <div><span style={{ color: '#888' }}>LTV: </span><b style={{ color: '#3b82f6' }}>{c.avg_ltv} €</b></div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'funnel' && funnel && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Konverzija</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>{funnel.conversion_rate}%</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Največji padec</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#ef4444' }}>{funnel.biggest_drop}</div>
                </div>
              </div>
              {funnel.steps?.map((s: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{i + 1}. {s.name}</span>
                    <span style={{ fontWeight: 700, color: '#3b82f6' }}>{s.count.toLocaleString()}</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: 4, height: 8 }}>
                    <div style={{ background: '#3b82f6', height: '100%', borderRadius: 4, width: `${s.pct}%`, transition: 'width 0.5s' }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{s.pct}%</div>
                </div>
              ))}
            </div>
          )}
          {tab === 'segments' && segments && (
            <div>
              <div className="card" style={{ padding: 14, marginBottom: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#888' }}>Skupaj strank</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6' }}>{segments.total_customers}</div>
              </div>
              {segments.segments?.map((s: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8, borderLeft: `4px solid ${s.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                    <span style={{ fontWeight: 700, color: s.color }}>{s.count} ({s.pct}%)</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                    <span>Povp. poraba: {s.avg_spend} €</span>
                    <span>Pogostost: {s.frequency}</span>
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