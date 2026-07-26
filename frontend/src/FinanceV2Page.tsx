import { useState, useEffect } from 'react'
import * as api from './api'

export default function FinanceV2Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'pl' | 'budgets' | 'cashflow' | 'forecast' | 'costs' | 'variance'>('pl')
  const [pl, setPl] = useState<any>(null)
  const [budgets, setBudgets] = useState<any>(null)
  const [cashflow, setCashflow] = useState<any>(null)
  const [forecast, setForecast] = useState<any>(null)
  const [costs, setCosts] = useState<any>(null)
  const [variance, setVariance] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/finance-v2/profit-loss', { headers: api.h() }).then(r => r.json()).then(setPl),
      fetch('/api/v1/finance-v2/budgets', { headers: api.h() }).then(r => r.json()).then(setBudgets),
      fetch('/api/v1/finance-v2/cash-flow', { headers: api.h() }).then(r => r.json()).then(setCashflow),
      fetch('/api/v1/finance-v2/forecast', { headers: api.h() }).then(r => r.json()).then(setForecast),
      fetch('/api/v1/finance-v2/cost-analysis', { headers: api.h() }).then(r => r.json()).then(setCosts),
      fetch('/api/v1/finance-v2/variance', { headers: api.h() }).then(r => r.json()).then(setVariance),
    ]).catch(() => onNotify('Napaka pri nalaganju')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'pl', label: '📊 Dobiček/Izguba' },
    { key: 'budgets', label: '💰 Proračuni' },
    { key: 'cashflow', label: '💳 Pretok' },
    { key: 'forecast', label: '📈 Napoved' },
    { key: 'costs', label: '🧾 Stroški' },
    { key: 'variance', label: '📉 Odstopanja' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">💰 Finančno upravljanje</h2>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'pl' && pl && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Prihodki', value: `${pl.revenue?.total_revenue?.toFixed(0) || 0} €`, color: '#22c55e' },
                  { label: 'Stroški', value: `${pl.costs?.total_costs?.toFixed(0) || 0} €`, color: '#ef4444' },
                  { label: 'Dobiček', value: `${pl.net_profit?.toFixed(0) || 0} €`, color: '#3b82f6' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div className="card" style={{ padding: 14, marginBottom: 12 }}>
                <h4 style={{ margin: '0 0 8px' }}>📈 Prihodki</h4>
                {Object.entries(pl.revenue || {}).filter(([k]) => k !== 'total_revenue').map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, borderBottom: '1px solid var(--border)' }}>
                    <span>{k.replace(/_/g, ' ')}</span><span style={{ fontWeight: 600 }}>{(v as number).toFixed(2)} €</span>
                  </div>
                ))}
              </div>
              <div className="card" style={{ padding: 14, marginBottom: 12 }}>
                <h4 style={{ margin: '0 0 8px' }}>📉 Stroški</h4>
                {Object.entries(pl.costs?.operating_expenses || {}).filter(([k]) => k !== 'total_opex').map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, borderBottom: '1px solid var(--border)' }}>
                    <span>{k.replace(/_/g, ' ')}</span><span style={{ fontWeight: 600 }}>{(v as number).toFixed(2)} €</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 13, color: '#666' }}>
                <span>Bruto marža: <b style={{ color: '#22c55e' }}>{pl.gross_margin}%</b></span>
                <span>Neto marža: <b style={{ color: '#22c55e' }}>{pl.net_margin}%</b></span>
              </div>
            </div>
          )}

          {tab === 'budgets' && budgets && (
            <div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Skupaj proračun</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#3b82f6' }}>{budgets.total_budget?.toFixed(0)} €</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Porabljeno</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#f59e0b' }}>{budgets.overall_utilization}%</div>
                </div>
              </div>
              {budgets.budgets?.map((b: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{b.name}</span>
                    <span style={{
                      padding: '2px 8px', borderRadius: 12, fontSize: 11,
                      background: b.status === 'warning' ? '#fef3c7' : b.status === 'under_budget' ? '#dbeafe' : '#dcfce7',
                      color: b.status === 'warning' ? '#d97706' : b.status === 'under_budget' ? '#2563eb' : '#16a34a',
                    }}>{b.status === 'warning' ? 'Pozor' : b.status === 'under_budget' ? 'Pod proračunom' : 'V redu'}</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: 6, height: 8, marginBottom: 6 }}>
                    <div style={{ background: b.utilization > 95 ? '#ef4444' : b.utilization > 80 ? '#f59e0b' : '#22c55e', height: '100%', borderRadius: 6, width: `${Math.min(b.utilization, 100)}%` }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666' }}>
                    <span>{b.spent?.toFixed(0)} / {b.budget?.toFixed(0)} €</span>
                    <span>{b.utilization}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'cashflow' && cashflow && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Začetno stanje', value: `${cashflow.opening_balance?.toFixed(0) || 0} €`, color: '#3b82f6' },
                  { label: 'Vhodi', value: `${cashflow.inflows?.total_inflows?.toFixed(0) || 0} €`, color: '#22c55e' },
                  { label: 'Izhodi', value: `${cashflow.outflows?.total_outflows?.toFixed(0) || 0} €`, color: '#ef4444' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div className="card" style={{ padding: 14, marginBottom: 12 }}>
                <h4 style={{ margin: '0 0 8px' }}>💰 Končno stanje</h4>
                <div style={{ fontSize: 28, fontWeight: 700, color: cashflow.net_cash_flow >= 0 ? '#22c55e' : '#ef4444', textAlign: 'center' }}>
                  {cashflow.closing_balance?.toFixed(2) || 0} €
                </div>
              </div>
            </div>
          )}

          {tab === 'forecast' && forecast && (
            <div>
              {forecast.forecasts?.map((f: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>{f.month}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span>Prihodki:</span><span style={{ color: '#22c55e', fontWeight: 600 }}>{f.revenue?.toFixed(0)} €</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span>Stroški:</span><span style={{ color: '#ef4444', fontWeight: 600 }}>{f.costs?.toFixed(0)} €</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span>Dobiček:</span><span style={{ color: '#3b82f6', fontWeight: 600 }}>{f.profit?.toFixed(0)} €</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: 6, height: 6, marginTop: 8 }}>
                    <div style={{ background: '#3b82f6', height: '100%', borderRadius: 6, width: `${(f.confidence || 0) * 100}%` }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Zaupanje: {((f.confidence || 0) * 100).toFixed(0)}%</div>
                </div>
              ))}
              {forecast.assumptions?.length > 0 && (
                <div className="card" style={{ padding: 14 }}>
                  <h4 style={{ margin: '0 0 8px' }}>📋 Predpostavke</h4>
                  {forecast.assumptions.map((a: string, i: number) => (
                    <div key={i} style={{ padding: '4px 0', fontSize: 13, borderBottom: '1px solid var(--border)' }}>• {a}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'costs' && costs && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Strošek/naročilo', value: `${costs.cost_per_order?.toFixed(2) || 0} €`, color: '#3b82f6' },
                  { label: 'Strošek/gost', value: `${costs.cost_per_cover?.toFixed(2) || 0} €`, color: '#f59e0b' },
                  { label: 'Cost ratio', value: `${(costs.cost_per_revenue * 100)?.toFixed(0) || 0}%`, color: '#ef4444' },
                  { label: 'Prime cost', value: `${((costs.cost_per_revenue || 0) * 100).toFixed(0)}%`, color: '#f59e0b' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {costs.cost_breakdown?.map((c: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{c.category}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{c.amount?.toFixed(0)} €</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: 6, height: 8, marginBottom: 4 }}>
                    <div style={{ background: '#3b82f6', height: '100%', borderRadius: 6, width: `${c.percentage}%` }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666' }}>
                    <span>{c.percentage}%</span>
                    <span>{c.trend === 'increasing' ? '📈' : c.trend === 'decreasing' ? '📉' : '➡️'}</span>
                  </div>
                </div>
              ))}
              {costs.insights?.length > 0 && (
                <div className="card" style={{ padding: 14 }}>
                  <h4 style={{ margin: '0 0 8px' }}>💡 Uvidi</h4>
                  {costs.insights.map((ins: string, i: number) => (
                    <div key={i} style={{ padding: '4px 0', fontSize: 13, borderBottom: '1px solid var(--border)' }}>• {ins}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'variance' && variance && (
            <div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Skupno odstopanje</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: variance.total_variance > 0 ? '#22c55e' : '#ef4444' }}>
                    {variance.total_variance > 0 ? '+' : ''}{variance.total_variance?.toFixed(0) || 0} €
                  </div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Odst. %</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: variance.total_variance > 0 ? '#22c55e' : '#ef4444' }}>
                    {variance.total_variance_pct?.toFixed(1) || 0}%
                  </div>
                </div>
              </div>
              {variance.variances?.map((v: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8, borderLeft: `4px solid ${v.status === 'favorable' ? '#22c55e' : '#ef4444'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{v.category}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>Proračun: {v.budget} € · dejansko: {v.actual} €</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, color: v.status === 'favorable' ? '#22c55e' : '#ef4444' }}>
                        {v.variance > 0 ? '+' : ''}{v.variance} €
                      </div>
                      <div style={{ fontSize: 11, color: '#888' }}>{v.variance_pct}%</div>
                    </div>
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