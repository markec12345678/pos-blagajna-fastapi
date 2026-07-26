import { useState, useEffect } from 'react'
import * as api from './api'

export default function RevenueV2Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'overview' | 'category' | 'forecast' | 'optimization'>('overview')
  const [overview, setOverview] = useState<any>(null)
  const [category, setCategory] = useState<any>(null)
  const [forecast, setForecast] = useState<any>(null)
  const [optimization, setOptimization] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/revenue-v2/overview', { headers: api.h() }).then(r => r.json()).then(setOverview),
      fetch('/api/v1/revenue-v2/by-category', { headers: api.h() }).then(r => r.json()).then(setCategory),
      fetch('/api/v1/revenue-v2/forecast', { headers: api.h() }).then(r => r.json()).then(setForecast),
      fetch('/api/v1/revenue-v2/optimization', { headers: api.h() }).then(r => r.json()).then(setOptimization),
    ]).catch(() => onNotify('Napaka')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'overview', label: '💰 Pregled' },
    { key: 'category', label: '📊 Kategorije' },
    { key: 'forecast', label: '🔮 Napoved' },
    { key: 'optimization', label: '⚡ Optimizacija' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm"><h2 className="page-title">💰 Prihodki V2</h2></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>{t.label}</button>
        ))}
      </div>
      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'overview' && overview && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Danes', value: `${overview.today} €`, sub: `${overview.change_pct}% ${overview.trend === 'up' ? '↑' : '↓'}`, color: '#22c55e' },
                  { label: 'Včeraj', value: `${overview.yesterday} €`, color: '#666' },
                  { label: 'Ta teden', value: `${overview.this_week} €`, color: '#3b82f6' },
                  { label: 'Prejšnji teden', value: `${overview.last_week} €`, color: '#666' },
                  { label: 'Ta mesec', value: `${overview.this_month} €`, color: '#8b5cf6' },
                  { label: 'Prejšnji mesec', value: `${overview.last_month} €`, color: '#666' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14 }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                    {'sub' in s && s.sub && <div style={{ fontSize: 11, color: '#22c55e', marginTop: 2 }}>{s.sub}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {tab === 'category' && category && (
            <div>
              {category.categories?.map((c: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                    <span style={{ fontWeight: 700, color: '#22c55e' }}>{c.amount} €</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: 4, height: 6, marginBottom: 4 }}>
                    <div style={{ background: '#3b82f6', height: '100%', borderRadius: 4, width: `${c.pct}%` }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666' }}>
                    <span>{c.pct}%</span>
                    <span style={{ color: c.trend === 'up' ? '#22c55e' : c.trend === 'down' ? '#ef4444' : '#888' }}>{c.trend === 'up' ? '↑' : c.trend === 'down' ? '↓' : '→'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'forecast' && forecast && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Napoved danes', value: `${forecast.today_forecast} €`, color: '#3b82f6' },
                  { label: 'Napoved teden', value: `${forecast.week_forecast} €`, color: '#8b5cf6' },
                  { label: 'Zaupanje', value: `${forecast.confidence}%`, color: '#22c55e' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <h4 style={{ margin: '0 0 8px' }}>📈 Dnevna napoved</h4>
              {forecast.daily_forecast?.map((d: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, width: 40 }}>{d.day}</span>
                  <div style={{ flex: 1, margin: '0 12px', background: '#e5e7eb', borderRadius: 4, height: 8, position: 'relative' }}>
                    <div style={{ background: '#dbeafe', height: '100%', borderRadius: 4, width: `${(d.high / 5000) * 100}%`, position: 'absolute' }} />
                    <div style={{ background: '#3b82f6', height: '100%', borderRadius: 4, width: `${(d.forecast / 5000) * 100}%`, position: 'absolute' }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, width: 60, textAlign: 'right' }}>{d.forecast} €</span>
                </div>
              ))}
              <h4 style={{ margin: '16px 0 8px' }}>🔍 Faktorji</h4>
              {forecast.factors?.map((f: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>{f.factor}</span>
                  <div style={{ fontSize: 12 }}>
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>{f.impact}</span>
                    <span style={{ color: '#888', marginLeft: 8 }}>({Math.round(f.weight * 100)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'optimization' && optimization && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Prihodek/ sedež', value: `${optimization.revenue_per_seat} €`, color: '#3b82f6' },
                  { label: 'Prihodek/ uro', value: `${optimization.revenue_per_hour} €`, color: '#8b5cf6' },
                  { label: 'Obrat miz', value: `${optimization.table_turnover}×`, color: '#f59e0b' },
                  { label: 'Vrhnje ure', value: optimization.peak_hours?.join(', '), color: '#22c55e' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <h4 style={{ margin: '0 0 8px' }}>💡 Predlogi za izboljšavo</h4>
              {optimization.suggestions?.map((s: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8, borderLeft: `4px solid #22c55e` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{s.title}</span>
                    <span style={{ background: '#dcfce7', color: '#16a34a', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{s.category}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>{s.impact}</span>
                    <span>Zaupanje: {s.confidence}%</span>
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