import { useState, useEffect } from 'react'
import * as api from './api'

export default function AnalyticsV2Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'overview' | 'predictive' | 'cohort' | 'rfm' | 'profitability' | 'anomalies'>('overview')
  const [overview, setOverview] = useState<any>(null)
  const [predictive, setPredictive] = useState<any>(null)
  const [cohort, setCohort] = useState<any>(null)
  const [rfm, setRfm] = useState<any>(null)
  const [profitability, setProfitability] = useState<any>(null)
  const [anomalies, setAnomalies] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/analytics-v2/overview', { headers: api.h() }).then(r => r.json()).then(setOverview),
      fetch('/api/v1/analytics-v2/predictive', { headers: api.h() }).then(r => r.json()).then(setPredictive),
      fetch('/api/v1/analytics-v2/cohort', { headers: api.h() }).then(r => r.json()).then(setCohort),
      fetch('/api/v1/analytics-v2/rfm', { headers: api.h() }).then(r => r.json()).then(setRfm),
      fetch('/api/v1/analytics-v2/profitability', { headers: api.h() }).then(r => r.json()).then(setProfitability),
      fetch('/api/v1/analytics-v2/anomalies', { headers: api.h() }).then(r => r.json()).then(setAnomalies),
    ]).catch(() => onNotify('Napaka pri nalaganju')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'overview', label: '📊 Pregled' },
    { key: 'predictive', label: '🔮 Prediktivna' },
    { key: 'cohort', label: '👥 Kohorte' },
    { key: 'rfm', label: '📈 RFM' },
    { key: 'profitability', label: '💰 Dobičkonosnost' },
    { key: 'anomalies', label: '⚠️ Nepravilnosti' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">📈 Analitika V2</h2>
      </div>

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
                  { label: 'Prihodek', value: `${overview.revenue?.total?.toFixed(0) || 0} €`, color: '#22c55e', sub: `${overview.revenue?.change_pct}% ${overview.revenue?.trend === 'increasing' ? '📈' : '📉'}` },
                  { label: 'Naročila', value: overview.orders?.total || 0, color: '#3b82f6', sub: `Povp. ${overview.orders?.avg_value?.toFixed(0) || 0} €` },
                  { label: 'Stranke', value: overview.customers?.total || 0, color: '#f59e0b', sub: `Retencija: ${overview.customers?.retention_rate || 0}%` },
                  { label: 'Zasedenost', value: `${overview.kpis?.seat_utilization || 0}%`, color: '#8b5cf6', sub: `Obrat: ${overview.kpis?.table_turnover || 0}×` },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'predictive' && predictive && (
            <div>
              <div className="card" style={{ padding: 14, marginBottom: 16 }}>
                <h4 style={{ margin: '0 0 8px' }}>📈 Napoved naslednjega meseca</h4>
                <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                  <span>Prihodek: <b>{predictive.forecast_next_month?.revenue?.toFixed(0)} €</b></span>
                  <span>Naročila: <b>{predictive.forecast_next_month?.orders}</b></span>
                  <span>Zaupanje: <b>{((predictive.forecast_next_month?.confidence || 0) * 100).toFixed(0)}%</b></span>
                </div>
              </div>
              <h4 style={{ margin: '0 0 8px' }}>📅 Napoved po dnevih</h4>
              {predictive.demand_forecast?.map((d: any, i: number) => (
                <div key={i} className="card" style={{ padding: 8, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: 13, width: 80 }}>{d.day}</span>
                  <div style={{ flex: 1, margin: '0 12px', background: '#e5e7eb', borderRadius: 4, height: 8 }}>
                    <div style={{ background: '#3b82f6', height: '100%', borderRadius: 4, width: `${(d.predicted_covers / 100) * 100}%` }} />
                  </div>
                  <span style={{ fontSize: 12, width: 60, textAlign: 'right' }}>{d.predicted_covers} gostov</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'cohort' && cohort && (
            <div>
              <div className="card" style={{ padding: 14, marginBottom: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#888' }}>Povp. retencija M1</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>{cohort.avg_retention_m1 || 0}%</div>
              </div>
              {cohort.cohorts?.map((c: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>{c.month}</div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                    <span>Novi: {c.new_customers}</span>
                    {c.retention_m1 && <span>M1: {c.retention_m1}%</span>}
                    {c.retention_m2 && <span>M2: {c.retention_m2}%</span>}
                    {c.ltv && <span>LTV: {c.ltv} €</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'rfm' && rfm && (
            <div>
              {rfm.segments?.map((s: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                    <span style={{ fontWeight: 700, color: '#3b82f6' }}>{s.count} ({s.percentage}%)</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#888' }}>{s.description}</div>
                </div>
              ))}
            </div>
          )}

          {tab === 'profitability' && profitability && (
            <div>
              <div className="card" style={{ padding: 14, marginBottom: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#888' }}>Skupna marža</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>{profitability.overall_margin}%</div>
              </div>
              {profitability.by_category?.map((c: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                    <span style={{ color: '#22c55e', fontWeight: 600 }}>{c.margin}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666' }}>
                    <span>Prihodek: {c.revenue?.toFixed(0)} €</span>
                    <span>Dobiček: {c.profit?.toFixed(0)} €</span>
                  </div>
                </div>
              ))}
              <h4 style={{ margin: '16px 0 8px' }}>🏆 Najbolj dobičkonosni</h4>
              {profitability.top_profit_items?.map((p: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>#{i + 1} {p.name}</span>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                    <span style={{ color: '#22c55e' }}>{p.margin}%</span>
                    <span>{p.profit_per_unit?.toFixed(2)} €/kos</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'anomalies' && anomalies && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Nepravilnosti</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b' }}>{anomalies.total_anomalies}</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Ocena tveganja</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: anomalies.risk_score < 20 ? '#22c55e' : '#f59e0b' }}>{anomalies.risk_score}/100</div>
                </div>
              </div>
              {anomalies.anomalies?.map((a: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8, borderLeft: `4px solid ${a.severity === 'high' ? '#ef4444' : a.severity === 'medium' ? '#f59e0b' : '#3b82f6'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{a.date}</span>
                    <span style={{ background: a.severity === 'high' ? '#ef4444' : '#f59e0b', color: '#fff', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{a.severity}</span>
                  </div>
                  <div style={{ fontSize: 13 }}>{a.description}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Možen vzrok: {a.possible_cause}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}