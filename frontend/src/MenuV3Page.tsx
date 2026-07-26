import { useState, useEffect } from 'react'
import * as api from './api'

export default function MenuV3Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'items' | 'categories' | 'analytics' | 'optimize'>('items')
  const [items, setItems] = useState<any>(null)
  const [categories, setCategories] = useState<any>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [optimize, setOptimize] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/menu-v3/items', { headers: api.h() }).then(r => r.json()).then(setItems),
      fetch('/api/v1/menu-v3/categories', { headers: api.h() }).then(r => r.json()).then(setCategories),
      fetch('/api/v1/menu-v3/analytics', { headers: api.h() }).then(r => r.json()).then(setAnalytics),
      fetch('/api/v1/menu-v3/optimize', { headers: api.h() }).then(r => r.json()).then(setOptimize),
    ]).catch(() => onNotify('Napaka pri nalaganju')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'items', label: '🍽️ Jedilnik', count: items?.total || 0 },
    { key: 'categories', label: '📦 Kategorije' },
    { key: 'analytics', label: '📊 Analitika' },
    { key: 'optimize', label: '🔧 Optimizacija' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">🍽️ Meni V3</h2>
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
          {tab === 'items' && items && (
            <div>
              {items.items?.map((item: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    <span style={{ fontWeight: 700, color: '#22c55e' }}>{item.price.toFixed(2)} €</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666', marginBottom: 4 }}>
                    <span>{item.category}</span>
                    <span>Marža: <b>{item.margin}%</b></span>
                    <span>Priljubljenost: {item.popularity}%</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span style={{ background: item.trend === 'increasing' ? '#dcfce7' : '#e5e7eb', color: item.trend === 'increasing' ? '#16a34a' : '#666', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{item.trend === 'increasing' ? '📈 Rastoče' : '➡️ Stabilno'}</span>
                    <span style={{ background: item.status === 'active' ? '#dcfce7' : '#fee2e2', color: item.status === 'active' ? '#16a34a' : '#dc2626', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{item.status === 'active' ? 'Aktivno' : 'Neaktivno'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'categories' && categories && (
            <div>
              {categories.categories?.map((c: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                    <span style={{ fontWeight: 700, color: '#22c55e' }}>{c.total_revenue.toFixed(0)} €</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                    <span>{c.items} jedi</span>
                    <span>Povp. cena: {c.avg_price.toFixed(2)} €</span>
                    <span>Marža: <b>{c.avg_margin}%</b></span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'analytics' && analytics && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Jedi', value: analytics.total_items, color: '#3b82f6' },
                  { label: 'Povp. cena', value: `${analytics.avg_price.toFixed(2)} €`, color: '#22c55e' },
                  { label: 'Povp. marža', value: `${analytics.avg_margin}%`, color: '#f59e0b' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div className="card" style={{ padding: 14, marginBottom: 8, borderLeft: '4px solid #22c55e' }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>🏆 Najbolje prodajana</div>
                <div style={{ fontSize: 13 }}>{analytics.best_seller}</div>
              </div>
              <div className="card" style={{ padding: 14, marginBottom: 8, borderLeft: '4px solid #ef4444' }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>📉 Najslabša</div>
                <div style={{ fontSize: 13 }}>{analytics.worst_performer}</div>
              </div>
            </div>
          )}

          {tab === 'optimize' && optimize && (
            <div>
              <h4 style={{ margin: '0 0 8px' }}>⭐ Zvezde (visoka marža + priljubljenost)</h4>
              {optimize.stars?.map((s: string, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 4, borderLeft: '4px solid #22c55e' }}>
                  <span style={{ fontWeight: 600 }}>⭐ {s}</span>
                </div>
              ))}
              <h4 style={{ margin: '16px 0 8px' }}>🔧 Predlogi</h4>
              {optimize.suggestions?.map((s: string, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 4, borderLeft: '4px solid #3b82f6' }}>
                  <span style={{ fontSize: 13 }}>💡 {s}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}