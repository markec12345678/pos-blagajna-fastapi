import { useState, useEffect } from 'react'
import * as api from './api'

export default function MenuV4Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'analytics' | 'ab-testing' | 'seasonal' | 'optimization'>('analytics')
  const [analytics, setAnalytics] = useState<any>(null)
  const [abTesting, setAbTesting] = useState<any>(null)
  const [seasonal, setSeasonal] = useState<any>(null)
  const [optimization, setOptimization] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/menu-v4/analytics', { headers: api.h() }).then(r => r.json()).then(setAnalytics),
      fetch('/api/v1/menu-v4/ab-testing', { headers: api.h() }).then(r => r.json()).then(setAbTesting),
      fetch('/api/v1/menu-v4/seasonal', { headers: api.h() }).then(r => r.json()).then(setSeasonal),
      fetch('/api/v1/menu-v4/optimization', { headers: api.h() }).then(r => r.json()).then(setOptimization),
    ]).catch(() => onNotify('Napaka')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'analytics', label: '📊 Analitika' },
    { key: 'ab-testing', label: '🔬 A/B Testiranje' },
    { key: 'seasonal', label: '🍂 Sezonsko' },
    { key: 'optimization', label: '⚡ Optimizacija' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm"><h2 className="page-title">🍽️ Meni V4</h2></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>{t.label}</button>
        ))}
      </div>
      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'analytics' && analytics && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Artikli', value: analytics.active_items, color: '#3b82f6' },
                  { label: 'Povp. marža', value: `${analytics.avg_margin}%`, color: '#22c55e' },
                  { label: 'Najboljši', value: analytics.best_seller?.name, color: '#f59e0b' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {analytics.by_category?.map((c: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                    <span style={{ fontSize: 12, color: '#666' }}>{c.items} artiklov · Povp. {c.avg_price} €</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                    <span>Marža: <b style={{ color: '#22c55e' }}>{c.avg_margin}%</b></span>
                    <span>Priljubljenost: <b style={{ color: '#3b82f6' }}>{c.popularity}%</b></span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'ab-testing' && abTesting && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Aktivni testi</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6' }}>{abTesting.active_tests}</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Zaključeni testi</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>{abTesting.completed_tests}</div>
                </div>
              </div>
              {abTesting.tests?.map((t: any) => (
                <div key={t.id} className="card" style={{ padding: 14, marginBottom: 8, borderLeft: `4px solid ${t.status === 'active' ? '#f59e0b' : '#22c55e'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{t.name}</span>
                    <span style={{ background: t.status === 'active' ? '#fef3c7' : '#dcfce7', color: t.status === 'active' ? '#d97706' : '#16a34a', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{t.status === 'active' ? 'Aktiven' : 'Zaključen'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, color: '#666', marginBottom: 6 }}>
                    <div style={{ background: '#f0f9ff', padding: '4px 8px', borderRadius: 4 }}>A: {t.variant_a}</div>
                    <div style={{ background: '#f0fdf4', padding: '4px 8px', borderRadius: 4 }}>B: {t.variant_b}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                    <span style={{ color: t.lift_pct > 0 ? '#22c55e' : '#ef4444', fontWeight: 700 }}>{t.lift_pct > 0 ? '+' : ''}{t.lift_pct}%</span>
                    <span style={{ color: '#888' }}>Zaupanje: {t.confidence}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'seasonal' && seasonal && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Trenutna sezona</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b' }}>{seasonal.current_season}</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Sezonski prihodki</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>{seasonal.seasonal_revenue_pct}%</div>
                </div>
              </div>
              <h4 style={{ margin: '0 0 8px' }}>🍽️ Sezonski artikli</h4>
              {seasonal.seasonal_items?.map((s: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ background: '#dbeafe', color: '#2563eb', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{s.category}</span>
                      <span style={{ fontWeight: 700, color: '#22c55e' }}>{s.price} €</span>
                    </div>
                  </div>
                </div>
              ))}
              {seasonal.upcoming?.length > 0 && (
                <>
                  <h4 style={{ margin: '16px 0 8px' }}>🔮 Prihajajoče</h4>
                  {seasonal.upcoming?.map((u: any, i: number) => (
                    <div key={i} className="card" style={{ padding: 12, marginBottom: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600 }}>{u.name}</span>
                        <span style={{ fontSize: 12, color: '#666' }}>📅 {u.start}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{u.category} · {u.season}</div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
          {tab === 'optimization' && optimization && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Elastičnost cen', value: optimization.price_elasticity, color: '#8b5cf6' },
                  { label: 'Zvezde', value: optimization.menuengineering_matrix?.stars, color: '#f59e0b' },
                  { label: 'Puzzle', value: optimization.menuengineering_matrix?.puzzles, color: '#3b82f6' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <h4 style={{ margin: '0 0 8px' }}>💡 Predlogi</h4>
              {optimization.suggestions?.map((s: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8, borderLeft: '4px solid #22c55e' }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{s.reason}</div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>{s.impact}</span>
                    <span style={{ color: '#888' }}>Zaupanje: {s.confidence}%</span>
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