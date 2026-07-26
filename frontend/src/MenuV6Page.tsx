import React, { useState, useEffect } from 'react'
import { authHeader } from './api'
import { useTranslation } from './i18n'

export default function MenuV6Page({ onNotify }: { onNotify: (m: string) => void }) {
  const { t } = useTranslation()
  const [performance, setPerformance] = useState<any[]>([])
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [allergens, setAllergens] = useState<any>(null)
  const [seasonal, setSeasonal] = useState<any>(null)
  const [combos, setCombos] = useState<any[]>([])
  const [costs, setCosts] = useState<any[]>([])
  const [crossSell, setCrossSell] = useState<any[]>([])
  const [heatmap, setHeatmap] = useState<any>(null)
  const [tab, setTab] = useState('performance')

  useEffect(() => {
    fetch('/api/v1/menu-v6/performance', { headers: authHeader() }).then(r => r.json()).then(d => setPerformance(d.performance || [])).catch(() => {})
    fetch('/api/v1/menu-v6/suggestions', { headers: authHeader() }).then(r => r.json()).then(d => setSuggestions(d.suggestions || [])).catch(() => {})
    fetch('/api/v1/menu-v6/allergen-map', { headers: authHeader() }).then(r => r.json()).then(d => setAllergens(d.allergens || null)).catch(() => {})
    fetch('/api/v1/menu-v6/seasonal-analysis', { headers: authHeader() }).then(r => r.json()).then(d => setSeasonal(d.seasonal || null)).catch(() => {})
    fetch('/api/v1/menu-v6/combo-analysis', { headers: authHeader() }).then(r => r.json()).then(d => setCombos(d.combos || [])).catch(() => {})
    fetch('/api/v1/menu-v6/menu-cost-breakdown', { headers: authHeader() }).then(r => r.json()).then(d => setCosts(d.costs || [])).catch(() => {})
    fetch('/api/v1/menu-v6/cross-sell-suggestions', { headers: authHeader() }).then(r => r.json()).then(d => setCrossSell(d.cross_sell || [])).catch(() => {})
    fetch('/api/v1/menu-v6/menu-card-heatmap', { headers: authHeader() }).then(r => r.json()).then(d => setHeatmap(d.heatmap || null)).catch(() => {})
  }, [])

  return (
    <div style={{ padding: 16 }}>
      <h2>🍽️ Meni V6</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['performance', 'suggestions', 'allergens', 'seasonal', 'combos', 'costs', 'cross-sell', 'heatmap'] as const).map(s => (
          <button key={s} onClick={() => setTab(s)} className={`btn ${tab === s ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: 12 }}>
            {s === 'performance' ? 'Učinkovitost' : s === 'suggestions' ? 'Predlogi' : s === 'allergens' ? 'Alergeni' : s === 'seasonal' ? 'Sezonsko' : s === 'combos' ? 'Komboji' : s === 'costs' ? 'Stroški' : s === 'cross-sell' ? 'Cross-sell' : 'Toplotni zemljevid'}
          </button>
        ))}
      </div>

      {tab === 'performance' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {performance.map((p: any, i: number) => (
            <div key={i} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0 }}>{p.item}</h4>
                <span style={{ fontSize: 12, color: p.trend === 'up' ? 'var(--green)' : p.trend === 'down' ? 'var(--red)' : 'var(--muted)' }}>{p.trend === 'up' ? '↑' : p.trend === 'down' ? '↓' : '→'}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Naročila</div><div style={{ fontWeight: 700 }}>{p.orders}</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Prihodek</div><div style={{ fontWeight: 700 }}>€{p.revenue.toLocaleString()}</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Marža</div><div style={{ fontWeight: 700, color: 'var(--green)' }}>{p.margin}%</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Priljubljenost</div><div style={{ fontWeight: 700 }}>{p.popularity}%</div></div>
              </div>
              <div style={{ marginTop: 8, background: 'var(--bg, #f1f5f9)', borderRadius: 4, overflow: 'hidden', height: 6 }}>
                <div style={{ width: `${p.popularity}%`, background: 'var(--primary, #059669)', height: '100%' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'suggestions' && (
        <div style={{ display: 'grid', gap: 12 }}>
          {suggestions.map((s: any) => (
            <div key={s.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px' }}>
              <span style={{ fontSize: 24 }}>{s.type === 'price_increase' ? '💰' : s.type === 'remove' ? '🗑️' : s.type === 'bundle' ? '📦' : '✏️'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{s.item || s.items?.join(' + ')}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.reason}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                {s.suggested_price && <div style={{ fontSize: 12 }}>€{s.current_price} → €{s.suggested_price}</div>}
                {s.discount && <div style={{ fontSize: 12 }}>-{s.discount}% popust</div>}
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>{s.impact}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'allergens' && allergens && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {Object.entries(allergens).map(([key, val]: [string, any]) => (
            <div key={key} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, textTransform: 'capitalize' }}>{key}</h4>
                <span style={{ fontSize: 14, fontWeight: 700, color: val.count > 0 ? 'var(--amber)' : 'var(--green)' }}>{val.count}</span>
              </div>
              {val.items.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {val.items.map((item: string) => (
                    <span key={item} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: 'var(--bg, #f1f5f9)' }}>{item}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'seasonal' && seasonal && (
        <div>
          <div className="card" style={{ marginBottom: 12, padding: 16 }}>
            <h4 style={{ marginTop: 0 }}>Trenutna sezona: {seasonal.current_season}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)', marginBottom: 4 }}>↑ Narašča</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {(seasonal.trending_up || []).map((t: string) => (
                    <span key={t} style={{ fontSize: 12, padding: '2px 8px', borderRadius: 12, background: 'var(--green)', color: '#fff' }}>{t}</span>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--red)', marginBottom: 4 }}>↓ pada</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {(seasonal.trending_down || []).map((t: string) => (
                    <span key={t} style={{ fontSize: 12, padding: '2px 8px', borderRadius: 12, background: 'var(--red)', color: '#fff' }}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <h4 style={{ marginTop: 0 }}>Priporočila</h4>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {(seasonal.recommendations || []).map((r: string, i: number) => (
                <li key={i} style={{ fontSize: 13, marginBottom: 4 }}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {tab === 'combos' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
          {combos.map((c: any, i: number) => (
            <div key={i} className="card">
              <h4 style={{ margin: 0 }}>{c.name}</h4>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{c.items.join(' + ')}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                <span style={{ fontSize: 18, fontWeight: 700 }}>€{c.price.toFixed(2)}</span>
                {c.savings > 0 && <span style={{ fontSize: 12, background: 'var(--green)', color: '#fff', padding: '2px 8px', borderRadius: 12 }}>Prihranite €{c.savings}</span>}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{c.orders} naročil</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Priljubljenost: {c.popularity}%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'costs' && (
        <div style={{ display: 'grid', gap: 8 }}>
          <div className="card" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', alignItems: 'center', gap: 8, padding: '10px 16px', fontWeight: 600, fontSize: 12, color: 'var(--muted)' }}>
            <div>Postavka</div><div style={{ textAlign: 'right' }}>Sestavine</div><div style={{ textAlign: 'right' }}>Delo</div><div style={{ textAlign: 'right' }}>Embaliranje</div><div style={{ textAlign: 'right' }}>Skupaj</div><div style={{ textAlign: 'right' }}>Cena</div>
          </div>
          {costs.map((c: any, i: number) => (
            <div key={i} className="card" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', alignItems: 'center', gap: 8, padding: '10px 16px' }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{c.item}</div>
              <div style={{ textAlign: 'right', fontSize: 13 }}>€{c.ingredients.toFixed(2)}</div>
              <div style={{ textAlign: 'right', fontSize: 13 }}>€{c.labor.toFixed(2)}</div>
              <div style={{ textAlign: 'right', fontSize: 13 }}>€{c.packaging.toFixed(2)}</div>
              <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700 }}>€{c.total_cost.toFixed(2)}</div>
              <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: 'var(--primary, #059669)' }}>€{c.price.toFixed(2)}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'cross-sell' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
          {crossSell.map((c: any, i: number) => (
            <div key={i} className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 600 }}>{c.main}</span>
                <span style={{ color: 'var(--muted)' }}>→</span>
                <span style={{ fontWeight: 600, color: 'var(--green)' }}>{c.suggestion}</span>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Zaupanje</div><div style={{ fontWeight: 700 }}>{c.confidence}%</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Lift</div><div style={{ fontWeight: 700, color: 'var(--green)' }}>{c.lift}x</div></div>
              </div>
              <div style={{ marginTop: 8, background: 'var(--bg, #f1f5f9)', borderRadius: 4, overflow: 'hidden', height: 6 }}>
                <div style={{ width: `${c.confidence}%`, background: 'var(--primary, #059669)', height: '100%' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'heatmap' && heatmap && (
        <div>
          <div className="card" style={{ padding: 16 }}>
            <h4 style={{ marginTop: 0 }}>Vroče točke</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, marginTop: 8 }}>
              {(heatmap.hotspots || []).map((h: any, i: number) => (
                <div key={i} style={{ padding: 12, borderRadius: 8, background: `rgba(5, 150, 105, ${h.clicks / 1500})` }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{h.item}</div>
                  <div style={{ fontSize: 11, opacity: 0.8 }}>{h.clicks} klikov · {h.orders} naročil</div>
                </div>
              ))}
            </div>
          </div>
          {heatmap.coldspots?.length > 0 && (
            <div className="card" style={{ padding: 16, marginTop: 12 }}>
              <h4 style={{ marginTop: 0 }}>Hladne točke</h4>
              {heatmap.coldspots.map((c: any, i: number) => (
                <div key={i} style={{ padding: 12, borderRadius: 8, background: 'rgba(239, 68, 68, 0.1)', marginTop: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--red)' }}>{c.item}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.clicks} klikov · {c.orders} naročil</div>
                </div>
              ))}
            </div>
          )}
          {heatmap.recommendations?.length > 0 && (
            <div className="card" style={{ padding: 16, marginTop: 12 }}>
              <h4 style={{ marginTop: 0 }}>Priporočila</h4>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {heatmap.recommendations.map((r: string, i: number) => (
                  <li key={i} style={{ fontSize: 13, marginBottom: 4 }}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
