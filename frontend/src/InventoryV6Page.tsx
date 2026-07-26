import { useState, useEffect } from 'react'

interface ForecastItem { item: string; current_stock: number; daily_usage: number; lead_time_days: number; safety_stock: number; reorder_point: number; recommended_order: number; confidence: number; status: string }
interface Supplier { name: string; orders: number; on_time: number; accuracy: number; quality_score: number; lead_time_avg: number; cost_trend: string; issues: number; score: number }
interface Alert { item: string; current: number; minimum: number; status: string; expires: string; supplier: string }
interface ParLevel { item: string; par: number; current: number; usage_rate: number; days_until_empty: number; reorder_suggested: boolean }

export default function InventoryV6Page({ onNotify }: { onNotify?: (msg: string, err?: boolean) => void }) {
  const [tab, setTab] = useState<string>('forecast')
  const [forecast, setForecast] = useState<ForecastItem[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [parLevels, setParLevels] = useState<ParLevel[]>([])
  const [waste, setWaste] = useState<any>(null)
  const [recipes, setRecipes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [fRes, sRes, aRes, pRes, wRes, rRes] = await Promise.all([
        fetch('/api/v1/inventory-v6/demand-forecasting').then(r => r.json()),
        fetch('/api/v1/inventory-v6/supplier-performance').then(r => r.json()),
        fetch('/api/v1/inventory-v6/stock-alerts').then(r => r.json()),
        fetch('/api/v1/inventory-v6/par-levels').then(r => r.json()),
        fetch('/api/v1/inventory-v6/waste-analytics').then(r => r.json()),
        fetch('/api/v1/inventory-v6/recipe-costing').then(r => r.json()),
      ])
      setForecast(fRes.forecast || [])
      setSuppliers(sRes.suppliers || [])
      setAlerts(aRes.alerts || [])
      setParLevels(pRes.par_levels || [])
      setWaste(wRes.analytics || null)
      setRecipes(rRes.recipes || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  if (loading) return <div className="loading">Nalagam...</div>

  return (
    <div style={{ padding: '2rem' }}>
      <h1>📦 Inventura V6</h1>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {[
          { key: 'forecast', label: '🔮 Napoved povpraševanja' },
          { key: 'suppliers', label: '🚚 Dobavitelji' },
          { key: 'alerts', label: '⚠️ Opozorila' },
          { key: 'par', label: '📊 Par nivoji' },
          { key: 'waste', label: '🗑️ Odpadki' },
          { key: 'recipes', label: '🍳 Recepti' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: tab === t.key ? '2px solid #2563eb' : '1px solid #d1d5db', background: tab === t.key ? '#dbeafe' : 'white', cursor: 'pointer', fontSize: '0.85rem' }}>{t.label}</button>
        ))}
      </div>

      {tab === 'forecast' && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {forecast.map(f => (
            <div key={f.item} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: `4px solid ${f.status === 'critical' ? '#ef4444' : f.status === 'reorder' ? '#f59e0b' : '#10b981'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <strong>{f.item}</strong>
                <span style={{ padding: '0.2rem 0.6rem', borderRadius: '8px', fontSize: '0.75rem', background: f.status === 'critical' ? '#fef2f2' : f.status === 'reorder' ? '#fef3c7' : '#d1fae5', color: f.status === 'critical' ? '#991b1b' : f.status === 'reorder' ? '#92400e' : '#065f46' }}>{f.status === 'critical' ? 'Kritično' : f.status === 'reorder' ? 'Naroči' : 'V redu'}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', fontSize: '0.85rem' }}>
                <div>Zaloga: {f.current_stock}</div>
                <div>Dnevna raba: {f.daily_usage}</div>
                <div>Dobavni rok: {f.lead_time_days} dni</div>
                <div>Točka naročila: {f.reorder_point}</div>
                <div>Naročilo: {f.recommended_order > 0 ? f.recommended_order : '—'}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'suppliers' && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {suppliers.map(s => (
            <div key={s.name} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <strong>{s.name}</strong>
                <span style={{ fontWeight: 700, color: s.score >= 90 ? '#10b981' : s.score >= 80 ? '#f59e0b' : '#ef4444' }}>{s.score}/100</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', fontSize: '0.85rem' }}>
                <div>Naročila: {s.orders}</div>
                <div>Pravočasno: {s.on_time}/{s.orders}</div>
                <div>Natančnost: {s.accuracy}%</div>
                <div>Kakovost: ⭐ {s.quality_score}</div>
                <div>Težave: {s.issues}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'alerts' && (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {alerts.map(a => (
            <div key={a.item} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `4px solid ${a.status === 'critical' ? '#ef4444' : '#f59e0b'}` }}>
              <div>
                <strong>{a.item}</strong>
                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Trenutno: {a.current} / Minimum: {a.minimum} · Dobavitelj: {a.supplier}</div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Rok: {a.expires}</div>
              </div>
              <span style={{ padding: '0.2rem 0.6rem', borderRadius: '8px', fontSize: '0.75rem', background: a.status === 'critical' ? '#fef2f2' : '#fef3c7', color: a.status === 'critical' ? '#991b1b' : '#92400e' }}>{a.status === 'critical' ? 'Kritično' : 'Nizko'}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'par' && (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {parLevels.map(p => (
            <div key={p.item} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <strong>{p.item}</strong>
                {p.reorder_suggested && <span style={{ padding: '0.2rem 0.6rem', borderRadius: '8px', fontSize: '0.75rem', background: '#fef3c7', color: '#92400e' }}>Naročilo predlagano</span>}
              </div>
              <div style={{ height: '12px', borderRadius: '6px', background: '#e5e7eb', overflow: 'hidden', marginBottom: '0.5rem' }}>
                <div style={{ height: '100%', width: `${Math.min(100, (p.current / p.par) * 100)}%`, background: p.current >= p.par ? '#10b981' : p.current >= p.par * 0.5 ? '#f59e0b' : '#ef4444', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', fontSize: '0.85rem' }}>
                <div>Par: {p.par}</div>
                <div>Trenutno: {p.current}</div>
                <div>Raba: {p.usage_rate}/dan</div>
                <div>Prazno čez: {p.days_until_empty} dni</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'waste' && waste && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ background: '#fef2f2', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{waste.total_waste_kg} kg</div>
              <div>Skupaj odpadkov</div>
            </div>
            <div style={{ background: '#fef2f2', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>€{waste.total_cost}</div>
              <div>Strošek</div>
            </div>
            <div style={{ background: '#d1fae5', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>€{waste.prevention_savings}</div>
              <div>Prihranek z preprečitvijo</div>
            </div>
          </div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3>Najbolj zavračani</h3>
            {waste.top_wasted.map((w: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', borderRadius: '8px', background: '#f9fafb', marginBottom: '0.5rem', alignItems: 'center' }}>
                <div>
                  <strong>{w.item}</strong>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{w.reason}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span>{w.kg} kg (€{w.cost})</span>
                  {w.preventable && <span style={{ padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.7rem', background: '#d1fae5', color: '#065f46' }}>Preprečljivo</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'recipes' && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {recipes.map(r => (
            <div key={r.item} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <strong>{r.item}</strong>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <span>Strošek: €{r.total_cost}</span>
                  <span>Cena: €{r.price}</span>
                  <span style={{ fontWeight: 700, color: r.margin >= 65 ? '#10b981' : '#f59e0b' }}>{r.margin}%</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                {r.ingredients.map((ing: any, i: number) => (
                  <div key={i} style={{ padding: '0.5rem', borderRadius: '6px', background: '#f9fafb', fontSize: '0.85rem' }}>
                    {ing.name}: {ing.qty}{ing.unit} (€{ing.cost})
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
