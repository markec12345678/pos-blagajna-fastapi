import { useState, useEffect } from 'react'

interface Benchmark { metric: string; our_value: number; industry_avg: number; best_in_class: number; status: string; percentile: number }
interface CategoryProfit { category: string; revenue: number; cost: number; profit: number; margin: number; items_sold: number }
interface DayProfit { day: string; revenue: number; profit: number }
interface ForecastComp { month: string; forecast: number; actual: number; variance: number; variance_pct: number }

export default function ReportsV8Page({ onNotify }: { onNotify?: (msg: string, err?: boolean) => void }) {
  const [tab, setTab] = useState<string>('executive')
  const [executive, setExecutive] = useState<any>(null)
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([])
  const [profitability, setProfitability] = useState<any>(null)
  const [forecast, setForecast] = useState<ForecastComp[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [eRes, bRes, pRes, fRes] = await Promise.all([
        fetch('/api/v1/reports-v8/executive-dashboard').then(r => r.json()),
        fetch('/api/v1/reports-v8/benchmark-comparison').then(r => r.json()),
        fetch('/api/v1/reports-v8/profitability-analysis').then(r => r.json()),
        fetch('/api/v1/reports-v8/forecast-vs-actual').then(r => r.json()),
      ])
      setExecutive(eRes.executive || null)
      setBenchmarks(bRes.benchmarks || [])
      setProfitability(pRes.profitability || null)
      setForecast(fRes.comparison || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  if (loading) return <div className="loading">Nalagam...</div>

  return (
    <div style={{ padding: '2rem' }}>
      <h1>📊 Poročila V8</h1>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {[
          { key: 'executive', label: '👔 Vodstveno' },
          { key: 'benchmarks', label: '📏 Primerjava' },
          { key: 'profitability', label: '💰 Donosnost' },
          { key: 'forecast', label: '🔮 Napoved' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: tab === t.key ? '2px solid #2563eb' : '1px solid #d1d5db', background: tab === t.key ? '#dbeafe' : 'white', cursor: 'pointer', fontSize: '0.85rem' }}>{t.label}</button>
        ))}
      </div>

      {tab === 'executive' && executive && (
        <div>
          <h2>Vodstveno poročilo</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ background: '#d1fae5', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{executive.revenue.mtd.toLocaleString()}</div>
              <div>Prihodek (mesec)</div>
              <div style={{ fontSize: '0.8rem', color: '#10b981' }}>+{executive.revenue.yoy_change}% YOY</div>
            </div>
            <div style={{ background: '#dbeafe', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{executive.profitability.net_margin}%</div>
              <div>Neto marza</div>
            </div>
            <div style={{ background: '#fef3c7', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{executive.customers.retention_rate}%</div>
              <div>Retencija</div>
            </div>
            <div style={{ background: '#f3e8ff', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{executive.customers.nps}</div>
              <div>NPS</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ color: '#10b981' }}>Ipostavitve</h3>
              {executive.highlights.map((h: string, i: number) => <div key={i} style={{ padding: '0.5rem', fontSize: '0.9rem' }}>+ {h}</div>)}
            </div>
            <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ color: '#ef4444' }}>Opozorila</h3>
              {executive.concerns.map((c: string, i: number) => <div key={i} style={{ padding: '0.5rem', fontSize: '0.9rem' }}>* {c}</div>)}
            </div>
          </div>
        </div>
      )}

      {tab === 'benchmarks' && (
        <div>
          <h2>Primerjava z industrijo</h2>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {benchmarks.map(b => (
              <div key={b.metric} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'grid', gridTemplateColumns: '140px 1fr 100px', alignItems: 'center', gap: '1rem' }}>
                <strong>{b.metric}</strong>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                    <span>Nas: {b.our_value}</span>
                    <span>Industrija: {b.industry_avg}</span>
                    <span>Najboljsi: {b.best_in_class}</span>
                  </div>
                  <div style={{ height: '10px', borderRadius: '5px', background: '#e5e7eb', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${b.percentile}%`, background: b.status === 'above_avg' ? '#10b981' : '#f59e0b', borderRadius: '5px' }} />
                  </div>
                </div>
                <div style={{ textAlign: 'center', fontWeight: 700, color: b.status === 'above_avg' ? '#10b981' : '#f59e0b' }}>{b.percentile}. percentil</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'profitability' && profitability && (
        <div>
          <h2>Analiza donosnosti</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3>Po kategorijah</h3>
              {profitability.by_category.map((c: CategoryProfit) => (
                <div key={c.category} style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <strong>{c.category}</strong>
                    <span style={{ color: '#10b981', fontWeight: 600 }}>{c.margin}%</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.25rem', fontSize: '0.8rem', color: '#6b7280' }}>
                    <div>Prihodek: {c.revenue.toLocaleString()}</div>
                    <div>Strosek: {c.cost.toLocaleString()}</div>
                    <div>Dobicek: {c.profit.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3>Po dnevih</h3>
              {profitability.by_day.map((d: DayProfit) => (
                <div key={d.day} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 80px', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', borderRadius: '6px', background: '#f9fafb', marginBottom: '0.5rem' }}>
                  <strong>{d.day}</strong>
                  <div style={{ height: '12px', borderRadius: '6px', background: '#e5e7eb', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(d.revenue / 6500) * 100}%`, background: '#3b82f6', borderRadius: '6px' }} />
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 600 }}>{d.profit.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'forecast' && (
        <div>
          <h2>Napoved vs Dejansko</h2>
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {forecast.map(f => (
                <div key={f.month} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 80px 80px', alignItems: 'center', gap: '1rem', padding: '0.75rem', borderRadius: '8px', background: '#f9fafb' }}>
                  <strong>{f.month}</strong>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Napoved: {f.forecast.toLocaleString()}</div>
                    <div style={{ height: '6px', borderRadius: '3px', background: '#dbeafe', overflow: 'hidden', marginTop: '0.15rem' }}>
                      <div style={{ height: '100%', width: '100%', background: '#3b82f6', borderRadius: '3px' }} />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>Dejansko: {f.actual.toLocaleString()}</div>
                    <div style={{ height: '6px', borderRadius: '3px', background: '#d1fae5', overflow: 'hidden', marginTop: '0.15rem' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, (f.actual / f.forecast) * 100)}%`, background: '#10b981', borderRadius: '3px' }} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 600, color: f.variance >= 0 ? '#10b981' : '#ef4444' }}>{f.variance_pct > 0 ? '+' : ''}{f.variance_pct}%</div>
                  <div style={{ textAlign: 'right', color: '#6b7280', fontSize: '0.85rem' }}>{f.variance > 0 ? '+' : ''}{f.variance.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
