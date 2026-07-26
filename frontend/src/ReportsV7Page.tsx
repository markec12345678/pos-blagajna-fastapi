import React, { useState, useEffect } from 'react'
import { authHeader } from './api'
import { useTranslation } from './i18n'

export default function ReportsV7Page({ onNotify }: { onNotify: (m: string) => void }) {
  const { t } = useTranslation()
  const [summary, setSummary] = useState<any>(null)
  const [comparative, setComparative] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [benchmarks, setBenchmarks] = useState<any[]>([])
  const [forecast, setForecast] = useState<any>(null)
  const [kpis, setKpis] = useState<any[]>([])
  const [patterns, setPatterns] = useState<any[]>([])
  const [staffReport, setStaffReport] = useState<any[]>([])
  const [tab, setTab] = useState('summary')

  useEffect(() => {
    fetch('/api/v1/reports-v7/executive-summary', { headers: authHeader() }).then(r => r.json()).then(d => setSummary(d.summary || null)).catch(() => {})
    fetch('/api/v1/reports-v7/comparative', { headers: authHeader() }).then(r => r.json()).then(d => setComparative(d.comparative || [])).catch(() => {})
    fetch('/api/v1/reports-v7/alerts', { headers: authHeader() }).then(r => r.json()).then(d => setAlerts(d.alerts || [])).catch(() => {})
    fetch('/api/v1/reports-v7/benchmarks', { headers: authHeader() }).then(r => r.json()).then(d => setBenchmarks(d.benchmarks || [])).catch(() => {})
    fetch('/api/v1/reports-v7/forecast-report', { headers: authHeader() }).then(r => r.json()).then(d => setForecast(d.forecast || null)).catch(() => {})
    fetch('/api/v1/reports-v7/kpi-dashboard', { headers: authHeader() }).then(r => r.json()).then(d => setKpis(d.kpis || [])).catch(() => {})
    fetch('/api/v1/reports-v7/weekly-patterns', { headers: authHeader() }).then(r => r.json()).then(d => setPatterns(d.patterns || [])).catch(() => {})
    fetch('/api/v1/reports-v7/staff-performance-report', { headers: authHeader() }).then(r => r.json()).then(d => setStaffReport(d.staff || [])).catch(() => {})
  }, [])

  return (
    <div style={{ padding: 16 }}>
      <h2>📊 Poročila V7</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['summary', 'comparative', 'alerts', 'benchmarks', 'forecast', 'kpis', 'patterns', 'staff'] as const).map(s => (
          <button key={s} onClick={() => setTab(s)} className={`btn ${tab === s ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: 12 }}>
            {s === 'summary' ? 'Povzetek' : s === 'comparative' ? 'Primerjava' : s === 'alerts' ? 'Opozorila' : s === 'benchmarks' ? 'Benchmarks' : s === 'forecast' ? 'Napoved' : s === 'kpis' ? 'KPI' : s === 'patterns' ? 'Vzorci' : 'Osebje'}
          </button>
        ))}
      </div>

      {tab === 'summary' && summary && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Prihodki', value: `€${summary.total_revenue?.toLocaleString()}`, change: summary.revenue_change, color: 'var(--green)' },
              { label: 'Naročila', value: summary.total_orders?.toLocaleString(), change: summary.orders_change, color: 'var(--green)' },
              { label: 'Povprečje', value: `€${summary.avg_order_value}`, change: summary.aov_change, color: 'var(--green)' },
              { label: 'Dobiček', value: `€${summary.net_profit?.toLocaleString()}`, sub: `${summary.profit_margin}%`, color: 'var(--green)' },
              { label: 'Stranke', value: summary.customer_count?.toLocaleString(), change: summary.customer_change, color: 'var(--green)' },
              { label: 'NPS', value: summary.nps_score, color: 'var(--primary, #059669)' },
            ].map((kpi, i) => (
              <div key={i} className="card" style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>{kpi.label}</p>
                <p style={{ fontSize: 22, fontWeight: 700, margin: '4px 0', color: kpi.color }}>{kpi.value}</p>
                {kpi.change !== undefined && <p style={{ fontSize: 11, margin: 0, color: kpi.change > 0 ? 'var(--green)' : 'var(--red)' }}>{kpi.change > 0 ? '↑' : '↓'} {Math.abs(kpi.change)}%</p>}
                {kpi.sub && <p style={{ fontSize: 11, margin: 0, color: 'var(--muted)' }}>{kpi.sub}</p>}
              </div>
            ))}
          </div>
          <div className="card" style={{ padding: 16 }}>
            <h4 style={{ marginTop: 0 }}>Dodatno</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
              <div><span style={{ fontSize: 12, color: 'var(--muted)' }}>Stroški hrane: </span><strong>{summary.food_cost_pct}%</strong></div>
              <div><span style={{ fontSize: 12, color: 'var(--muted)' }}>Stroški dela: </span><strong>{summary.labor_cost_pct}%</strong></div>
              <div><span style={{ fontSize: 12, color: 'var(--muted)' }}>Najboljši dan: </span><strong>{summary.busiest_day}</strong></div>
              <div><span style={{ fontSize: 12, color: 'var(--muted)' }}>Najboljša ura: </span><strong>{summary.busiest_hour}</strong></div>
            </div>
          </div>
        </div>
      )}

      {tab === 'comparative' && (
        <div style={{ display: 'grid', gap: 8 }}>
          <div className="card" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', alignItems: 'center', gap: 8, padding: '10px 16px', fontWeight: 600, fontSize: 12, color: 'var(--muted)' }}>
            <div>Metrka</div><div style={{ textAlign: 'right' }}>Trenutno</div><div style={{ textAlign: 'right' }}>Prejšnji</div><div style={{ textAlign: 'right' }}>YTD lani</div><div style={{ textAlign: 'right' }}>M/M</div><div style={{ textAlign: 'right' }}>Y/Y</div>
          </div>
          {comparative.map((c: any, i: number) => (
            <div key={i} className="card" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', alignItems: 'center', gap: 8, padding: '10px 16px' }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{c.metric}</div>
              <div style={{ textAlign: 'right', fontWeight: 700 }}>{typeof c.current === 'number' ? (c.current > 1000 ? c.current.toLocaleString() : c.current) : c.current}</div>
              <div style={{ textAlign: 'right', fontSize: 13 }}>{typeof c.previous === 'number' ? (c.previous > 1000 ? c.previous.toLocaleString() : c.previous) : c.previous}</div>
              <div style={{ textAlign: 'right', fontSize: 13 }}>{typeof c.yoy === 'number' ? (c.yoy > 1000 ? c.yoy.toLocaleString() : c.yoy) : c.yoy}</div>
              <div style={{ textAlign: 'right', fontSize: 13, color: c.change_mom > 0 ? 'var(--green)' : 'var(--red)' }}>{c.change_mom > 0 ? '+' : ''}{c.change_mom}%</div>
              <div style={{ textAlign: 'right', fontSize: 13, color: c.change_yoy > 0 ? 'var(--green)' : 'var(--red)' }}>{c.change_yoy > 0 ? '+' : ''}{c.change_yoy}%</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'alerts' && (
        <div style={{ display: 'grid', gap: 12 }}>
          {alerts.map((a: any, i: number) => (
            <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', borderLeft: `4px solid ${a.severity === 'high' ? 'var(--red)' : a.severity === 'medium' ? 'var(--amber)' : a.severity === 'low' ? 'var(--primary, #059669)' : 'var(--muted)'}` }}>
              <span style={{ fontSize: 24 }}>{a.severity === 'high' ? '🔴' : a.severity === 'medium' ? '🟡' : a.severity === 'low' ? '🟢' : 'ℹ️'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{a.message}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{a.type}</div>
              </div>
              <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 8, background: 'var(--bg, #f1f5f9)' }}>{a.action}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'benchmarks' && (
        <div style={{ display: 'grid', gap: 8 }}>
          {benchmarks.map((b: any, i: number) => (
            <div key={i} className="card" style={{ padding: '12px 16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', alignItems: 'center', gap: 12 }}>
                <div style={{ fontWeight: 600 }}>{b.metric}</div>
                <div style={{ textAlign: 'center' }}><div style={{ fontSize: 11, color: 'var(--muted)' }}>Vaš</div><div style={{ fontWeight: 700, color: 'var(--primary, #059669)' }}>{b.your}{b.metric.includes('%') ? '%' : b.metric.includes('€') ? '€' : ''}</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ fontSize: 11, color: 'var(--muted)' }}>Povprečje</div><div style={{ fontWeight: 700 }}>{b.industry_avg}{b.metric.includes('%') ? '%' : ''}</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ fontSize: 11, color: 'var(--muted)' }}>Najboljši</div><div style={{ fontWeight: 700, color: 'var(--green)' }}>{b.best_in_class}{b.metric.includes('%') ? '%' : ''}</div></div>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: b.status === 'above_avg' ? 'var(--green)' : b.status === 'good' ? 'var(--primary, #059669)' : 'var(--amber)', color: '#fff' }}>{b.status === 'above_avg' ? 'Nadpovprečno' : b.status === 'good' ? 'Dobro' : 'Povprečno'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'forecast' && forecast && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Naslednji mesec', ...forecast.next_month },
              { label: 'Naslednji kvartal', ...forecast.next_quarter },
              { label: 'Konec leta', ...forecast.year_end },
            ].map((f: any, i: number) => (
              <div key={i} className="card" style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>{f.label}</p>
                <p style={{ fontSize: 22, fontWeight: 700, margin: '4px 0' }}>€{f.predicted?.toLocaleString()}</p>
                <p style={{ fontSize: 11, margin: 0, color: 'var(--muted)' }}>Zaupanje: {f.confidence}%</p>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding: 16 }}>
            <h4 style={{ marginTop: 0 }}>Scenariji</h4>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              {(forecast.scenarios || []).map((s: any, i: number) => (
                <div key={i} style={{ flex: 1, padding: 12, borderRadius: 8, background: 'var(--bg, #f1f5f9)', textAlign: 'center' }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, margin: '4px 0' }}>€{s.revenue.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.probability}% verjetnost</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'kpis' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {kpis.map((k: any, i: number) => (
            <div key={i} className="card" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>{k.name}</p>
              <p style={{ fontSize: 22, fontWeight: 700, margin: '4px 0' }}>{k.value}{k.unit}</p>
              <div style={{ marginTop: 8, background: 'var(--bg, #f1f5f9)', borderRadius: 4, overflow: 'hidden', height: 6 }}>
                <div style={{ width: `${Math.min((k.value / k.target) * 100, 100)}%`, background: k.status === 'above' ? 'var(--green)' : 'var(--amber)', height: '100%' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Target: {k.target}{k.unit}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'patterns' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
          {patterns.map((p: any, i: number) => (
            <div key={i} className="card" style={{ textAlign: 'center' }}>
              <h4 style={{ margin: 0, fontSize: 14 }}>{p.day}</h4>
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{p.orders}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>naročil</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary, #059669)', marginTop: 4 }}>€{p.revenue.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>povprečje: €{p.avg_check}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>vrh: {p.peak_hour}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'staff' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
          {staffReport.map((s: any, i: number) => (
            <div key={i} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0 }}>{s.name}</h4>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: 'var(--bg, #f1f5f9)' }}>{s.role}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                {s.orders > 0 && <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Naročila</div><div style={{ fontWeight: 700 }}>{s.orders}</div></div>}
                {s.revenue > 0 && <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Prihodek</div><div style={{ fontWeight: 700 }}>€{s.revenue.toLocaleString()}</div></div>}
                {s.avg_check && <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Povprečje</div><div style={{ fontWeight: 700 }}>€{s.avg_check}</div></div>}
                {s.tips !== undefined && <div><div style={{ fontSize: 11, color: 'var(--muted)' }}> Napitnina</div><div style={{ fontWeight: 700 }}>€{s.tips}</div></div>}
                {s.prep_time && <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Priprava</div><div style={{ fontWeight: 700 }}>{s.prep_time} min</div></div>}
                {s.quality_score && <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Kakovost</div><div style={{ fontWeight: 700 }}>{s.quality_score}/5</div></div>}
              </div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: 'var(--amber)', fontSize: 14 }}>★</span>
                <span style={{ fontWeight: 700 }}>{s.rating}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>/5.0</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
