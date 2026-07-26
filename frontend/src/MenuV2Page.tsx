import { useState, useEffect } from 'react'
import * as api from './api'

export default function MenuV2Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'items' | 'categories' | 'analytics'>('items')
  const [categories, setCategories] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/menu-v2/categories', { headers: api.h() }).then(r => r.json()).then(d => setCategories(d.categories || [])),
      fetch('/api/v1/menu-v2/items', { headers: api.h() }).then(r => r.json()).then(d => setItems(d.items || [])),
      fetch('/api/v1/menu-v2/analytics', { headers: api.h() }).then(r => r.json()).then(setAnalytics),
    ]).catch(() => onNotify('Napaka pri nalaganju')).finally(() => setLoading(false))
  }, [])

  const filtered = items.filter(i => {
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false
    if (catFilter && i.category !== catFilter) return false
    return true
  })

  const tabs = [
    { key: 'items', label: '🍽️ Jedilnik', count: items.length },
    { key: 'categories', label: '📂 Kategorije', count: categories.length },
    { key: 'analytics', label: '📊 Analitika' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">🍽️ Meni V2</h2>
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
          {tab === 'items' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input className="input" placeholder="🔍 Iskanje jedi..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
                <select className="input" value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ width: 150 }}>
                  <option value="">Vse kategorije</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              {filtered.map((item, i) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{item.category}</div>
                    {item.tags?.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                        {item.tags.map((t: string, j: number) => (
                          <span key={j} style={{ background: '#dcfce7', color: '#16a34a', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>{item.price.toFixed(2)} €</span>
                    <span style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: item.available ? '#22c55e' : '#ef4444',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'categories' && (
            <div>
              {categories.map((cat, i) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>{cat.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, color: '#888' }}>#{cat.sort_order}</span>
                      <span style={{ background: 'var(--primary)', color: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>{cat.item_count} jedi</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#666' }}>
                    <span>Povp. cena: {cat.avg_price?.toFixed(2)} €</span>
                    <span>Prodaja: {cat.total_sales}</span>
                    <span>Prihodek: {cat.total_revenue?.toFixed(0)} €</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'analytics' && analytics && (
            <div>
              <h4 style={{ margin: '0 0 12px' }}>🏆 Top jedi</h4>
              {analytics.top_items?.map((item: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>#{i + 1}</span>
                    <span style={{ marginLeft: 8 }}>{item.name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                    <span>{item.sales}×</span>
                    <span style={{ fontWeight: 600 }}>{item.revenue?.toFixed(0)} €</span>
                    <span style={{ color: '#22c55e' }}>{item.margin}%</span>
                  </div>
                </div>
              ))}

              <h4 style={{ margin: '16px 0 12px' }}>📊 Kategorije</h4>
              {analytics.category_performance?.map((cat: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{cat.name}</span>
                    <span style={{ color: '#22c55e' }}>{cat.margin}%</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#666' }}>
                    <span>Prodaja: {cat.sales_pct}%</span>
                    <span>Prihodek: {cat.revenue_pct}%</span>
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