import React, { useState, useEffect } from 'react'
import { authHeader } from './api'
import { useTranslation } from './i18n'

export default function AnalyticsV5Page({ onNotify }: { onNotify: (m: string) => void }) {
  const { t } = useTranslation()
  const [realtime, setRealtime] = useState<any>(null)
  const [insights, setInsights] = useState<any>(null)
  const [decomposition, setDecomposition] = useState<any>(null)
  const [trends, setTrends] = useState<any>(null)
  const [anomalies, setAnomalies] = useState<any>(null)
  const [cohorts, setCohorts] = useState<any[]>([])
  const [menuPerf, setMenuPerf] = useState<any>(null)
  const [models, setModels] = useState<any>(null)
  const [tab, setTab] = useState('realtime')

  useEffect(() => {
    fetch('/api/v1/analytics-v5/real-time', { headers: authHeader() }).then(r => r.json()).then(d => setRealtime(d.realtime || null)).catch(() => {})
    fetch('/api/v1/analytics-v5/customer-insights', { headers: authHeader() }).then(r => r.json()).then(d => setInsights(d.insights || null)).catch(() => {})
    fetch('/api/v1/analytics-v5/revenue-decomposition', { headers: authHeader() }).then(r => r.json()).then(d => setDecomposition(d.decomposition || null)).catch(() => {})
    fetch('/api/v1/analytics-v5/trend-analysis', { headers: authHeader() }).then(r => r.json()).then(d => setTrends(d.trends || null)).catch(() => {})
    fetch('/api/v1/analytics-v5/anomaly-detection', { headers: authHeader() }).then(r => r.json()).then(d => setAnomalies(d)).catch(() => {})
    fetch('/api/v1/analytics-v5/cohort-analysis', { headers: authHeader() }).then(r => r.json()).then(d => setCohorts(d.cohorts || [])).catch(() => {})
    fetch('/api/v1/analytics-v5/menu-performance', { headers: authHeader() }).then(r => r.json()).then(d => setMenuPerf(d.performance || null)).catch(() => {})
    fetch('/api/v1/analytics-v5/predictive-models', { headers: authHeader() }).then(r => r.json()).then(d => setModels(d)).catch(() => {})
  }, [])

  return (
    <div style={{ padding: 16 }}>
      <h2>📈 Analitika V5</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['realtime', 'customers', 'revenue', 'trends', 'anomalies', 'cohorts', 'menu', 'models'] as const).map(s => (
          <button key={s} onClick={() => setTab(s)} className={`btn ${tab === s ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: 12 }}>
            {s === 'realtime' ? 'V živo' : s === 'customers' ? 'Stranke' : s === 'revenue' ? 'Prihodki' : s === 'trends' ? 'Trendi' : s === 'anomalies' ? 'Anomalije' : s === 'cohorts' ? 'Kohorte' : s === 'menu' ? 'Meni' : 'Modeli'}
          </button>
        ))}
      </div>

      {tab === 'realtime' && realtime && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Naročila', value: realtime.current_orders, icon: '📋' },
              { label: 'Mize', value: realtime.active_tables, icon: '🪑' },
              { label: 'Prihodek', value: `€${realtime.revenue_today?.toLocaleString()}`, icon: '💰' },
              { label: 'Čakalni čas', value: `${realtime.avg_wait_time} min`, icon: '⏰' },
              { label: 'V vrsti', value: realtime.kitchen_queue, icon: '🍳' },
              { label: 'Osebje', value: realtime.staff_on_duty, icon: '👥' },
            ].map((kpi, i) => (
              <div key={i} className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20 }}>{kpi.icon}</div>
                <p style={{ fontSize: 11, color: 'var(--muted)', margin: '4px 0' }}>{kpi.label}</p>
                <p style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{kpi.value}</p>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding: 16 }}>
            <h4 style={{ marginTop: 0 }}>Uročni prihodki</h4>
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 120 }}>
              {(realtime.hourly_revenue || []).map((h: any, i: number) => (
                <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ height: `${(h.revenue / 700) * 100}px`, background: 'var(--primary, #059669)', borderRadius: 4, minHeight: 4 }} />
                  <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>{h.hour}</div>
                  <div style={{ fontSize: 9, fontWeight: 600 }}>€{h.revenue}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'customers' && insights && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Novi', value: `${insights.new_vs_returning?.new}%` },
              { label: 'Vračajoči', value: `${insights.new_vs_returning?.returning}%` },
              { label: 'Povprečna družba', value: insights.avg_party_size },
              { label: 'Povprečen čas', value: `${insights.avg_stay_duration} min` },
              { label: 'Vrh prihoda', value: insights.peak_arrival },
              { label: 'Vrh odhoda', value: insights.peak_departure },
            ].map((kpi, i) => (
              <div key={i} className="card" style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>{kpi.label}</p>
                <p style={{ fontSize: 20, fontWeight: 700, margin: '4px 0' }}>{kpi.value}</p>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding: 16 }}>
            <h4 style={{ marginTop: 0 }}>Najpogostejše pritožbe</h4>
            {(insights.top_complaints || []).map((c: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ width: 100, fontWeight: 600 }}>{c.issue}</span>
                <div style={{ flex: 1, background: 'var(--bg, #f1f5f9)', borderRadius: 4, overflow: 'hidden', height: 12 }}>
                  <div style={{ width: `${c.percentage}%`, background: 'var(--red)', height: '100%' }} />
                </div>
                <span style={{ width: 40, textAlign: 'right', fontSize: 12 }}>{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'revenue' && decomposition && (
        <div>
          {[
            { title: 'Po viru', data: decomposition.by_source },
            { title: 'Po delu dneva', data: decomposition.by_daypart },
            { title: 'Po kategoriji', data: decomposition.by_category },
          ].map((section, si) => (
            <div key={si} className="card" style={{ padding: 16, marginBottom: 12 }}>
              <h4 style={{ marginTop: 0 }}>{section.title}</h4>
              {section.data.map((d: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: i < section.data.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ width: 120, fontWeight: 600, fontSize: 13 }}>{d.source || d.daypart || d.category}</span>
                  <div style={{ flex: 1, background: 'var(--bg, #f1f5f9)', borderRadius: 4, overflow: 'hidden', height: 12 }}>
                    <div style={{ width: `${d.percentage}%`, background: 'var(--primary, #059669)', height: '100%' }} />
                  </div>
                  <span style={{ width: 60, textAlign: 'right', fontSize: 12 }}>€{d.amount?.toLocaleString()}</span>
                  <span style={{ width: 40, textAlign: 'right', fontSize: 12, color: 'var(--muted)' }}>{d.percentage}%</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {tab === 'trends' && trends && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
            <div className="card" style={{ textAlign: 'center' }}><p style={{ fontSize: 11, color: 'var(--muted)' }}>Smer</p><p style={{ fontSize: 22, fontWeight: 700, color: 'var(--green)' }}>↑ {trends.revenue_trend}</p></div>
            <div className="card" style={{ textAlign: 'center' }}><p style={{ fontSize: 11, color: 'var(--muted)' }}>Premik</p><p style={{ fontSize: 22, fontWeight: 700 }}>+{trends.revenue_slope}%</p></div>
            <div className="card" style={{ textAlign: 'center' }}><p style={{ fontSize: 11, color: 'var(--muted)' }}>Rast</p><p style={{ fontSize: 22, fontWeight: 700 }}>{trends.growth_rate}%</p></div>
            <div className="card" style={{ textAlign: 'center' }}><p style={{ fontSize: 11, color: 'var(--muted)' }}>Y/Y</p><p style={{ fontSize: 22, fontWeight: 700 }}>+{trends.yoy_comparison?.growth}%</p></div>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <h4 style={{ marginTop: 0 }}>Napoved</h4>
            {(trends.projections || []).map((p: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontWeight: 600 }}>{p.month}</span>
                <span>€{p.projected?.toLocaleString()}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{p.confidence}% zaupanje</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'anomalies' && anomalies && (
        <div>
          <div className="card" style={{ padding: 16, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0 }}>Točka anomalij</h4>
              <span style={{ fontSize: 22, fontWeight: 700, color: anomalies.anomaly_score >= 80 ? 'var(--green)' : 'var(--amber)' }}>{anomalies.anomaly_score}/100</span>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {(anomalies.anomalies || []).map((a: any, i: number) => (
              <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', borderLeft: `4px solid ${a.type === 'revenue_spike' ? 'var(--green)' : 'var(--red)'}` }}>
                <span style={{ fontSize: 24 }}>{a.type === 'revenue_spike' ? '📈' : a.type === 'low_orders' ? '📉' : '🗑️'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{a.date} — {a.type.replace(/_/g, ' ')}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{a.cause}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700 }}>{a.value} (pričakovano: {a.expected})</div>
                  <div style={{ fontSize: 12, color: a.deviation.startsWith('+') ? 'var(--green)' : 'var(--red)' }}>{a.deviation}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'cohorts' && (
        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid var(--border)' }}>Kohorta</th>
                <th style={{ padding: '8px', textAlign: 'right', borderBottom: '2px solid var(--border)' }}>Velikost</th>
                {Array.from({ length: 6 }, (_, i) => (
                  <th key={i} style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid var(--border)' }}>Mesec {i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cohorts.map((c: any, i: number) => (
                <tr key={i}>
                  <td style={{ padding: '8px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{c.cohort}</td>
                  <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>{c.size}</td>
                  {c.retention.map((r: number, j: number) => (
                    <td key={j} style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid var(--border)', background: `rgba(5, 150, 105, ${r / 100})`, fontWeight: r > 0 ? 600 : 400 }}>
                      {r > 0 ? `${r}%` : ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'menu' && menuPerf && (
        <div>
          <div className="card" style={{ padding: 16, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Postavk: <strong>{menuPerf.total_items}</strong></span>
              <span>Povprečna marža: <strong>{menuPerf.avg_margin}%</strong></span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="card" style={{ padding: 16 }}>
              <h4 style={{ marginTop: 0, color: 'var(--green)' }}>Najboljši</h4>
              {(menuPerf.top_performers || []).map((p: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{p.item}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 8 }}>{p.orders} naročil</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700 }}>€{p.revenue.toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: 'var(--green)' }}>{p.margin}% · {p.trend === 'up' ? '↑' : '→'}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="card" style={{ padding: 16 }}>
              <h4 style={{ marginTop: 0, color: 'var(--red)' }}>Slabši</h4>
              {(menuPerf.underperformers || []).map((p: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 1 ? '1px solid var(--border)' : 'none' }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{p.item}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 8 }}>{p.orders} naročil</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700 }}>€{p.revenue.toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: 'var(--red)' }}>{p.margin}% · {p.trend === 'down' ? '↓' : '→'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'models' && models && (
        <div>
          <div className="card" style={{ padding: 16, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0 }}>Zdravje modelov</h4>
              <span style={{ fontSize: 14, padding: '2px 8px', borderRadius: 12, background: 'var(--green)', color: '#fff' }}>{models.model_health}</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
            {(models.models || []).map((m: any, i: number) => (
              <div key={i} className="card" style={{ padding: 16 }}>
                <h4 style={{ margin: 0 }}>{m.name}</h4>
                <div style={{ marginTop: 8, background: 'var(--bg, #f1f5f9)', borderRadius: 4, overflow: 'hidden', height: 8 }}>
                  <div style={{ width: `${m.accuracy}%`, background: m.accuracy >= 80 ? 'var(--green)' : 'var(--amber)', height: '100%' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 12 }}>
                  <span>Natančnost: <strong>{m.accuracy}%</strong></span>
                  <span style={{ color: 'var(--muted)' }}>Zadnje: {m.last_trained}</span>
                </div>
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {m.features.map((f: string) => (
                    <span key={f} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 8, background: 'var(--bg, #f1f5f9)' }}>{f}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
