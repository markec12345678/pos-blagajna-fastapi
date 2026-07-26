import { useState, useEffect } from 'react'
import * as api from './api'

export default function ExpensesV2Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'list' | 'categories' | 'recurring' | 'forecast' | 'analytics'>('list')
  const [expenses, setExpenses] = useState<any[]>([])
  const [categories, setCategories] = useState<any>(null)
  const [recurring, setRecurring] = useState<any>(null)
  const [forecast, setForecast] = useState<any>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/expenses-v2/', { headers: api.h() }).then(r => r.json()).then(d => setExpenses(d.expenses || [])),
      fetch('/api/v1/expenses-v2/categories', { headers: api.h() }).then(r => r.json()).then(setCategories),
      fetch('/api/v1/expenses-v2/recurring', { headers: api.h() }).then(r => r.json()).then(setRecurring),
      fetch('/api/v1/expenses-v2/forecast', { headers: api.h() }).then(r => r.json()).then(setForecast),
      fetch('/api/v1/expenses-v2/analytics', { headers: api.h() }).then(r => r.json()).then(setAnalytics),
    ]).catch(() => onNotify('Napaka pri nalaganju')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'list', label: '💸 Stroški', count: expenses.length },
    { key: 'categories', label: '📂 Kategorije' },
    { key: 'recurring', label: '🔄 Ponavljajoči' },
    { key: 'forecast', label: '📈 Napoved' },
    { key: 'analytics', label: '📊 Analitika' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">💸 Porabniki V2</h2>
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
          {tab === 'list' && (
            <div>
              {expenses.map((e, i) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{e.description}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{e.category} · {e.date}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontWeight: 700, color: '#ef4444' }}>-{e.amount?.toFixed(2)} €</span>
                    <span style={{
                      padding: '2px 8px', borderRadius: 12, fontSize: 10,
                      background: e.status === 'approved' ? '#dcfce7' : '#fef3c7',
                      color: e.status === 'approved' ? '#16a34a' : '#d97706',
                    }}>{e.status === 'approved' ? 'Odobreno' : 'V čakanju'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'categories' && categories && (
            <div>
              {categories.categories?.map((c: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                    <span style={{ fontSize: 13 }}>{c.spent?.toFixed(0)} / {c.budget?.toFixed(0)} €</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: 6, height: 8, marginBottom: 4 }}>
                    <div style={{ background: c.utilization > 90 ? '#ef4444' : c.utilization > 70 ? '#f59e0b' : '#22c55e', height: '100%', borderRadius: 6, width: `${Math.min(c.utilization, 100)}%` }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666' }}>
                    <span>Ostane: {c.remaining?.toFixed(0)} €</span>
                    <span>{c.utilization}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'recurring' && recurring && (
            <div>
              <div className="card" style={{ padding: 14, marginBottom: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#888' }}>Mesečni ponavljajoči stroški</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#ef4444' }}>{recurring.monthly_total?.toFixed(0) || 0} €</div>
              </div>
              {recurring.recurring?.map((r: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{r.category} · {r.frequency}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700 }}>{r.amount?.toFixed(2)} €</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{r.next_date}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'forecast' && forecast && (
            <div>
              {forecast.forecasts?.map((f: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{f.month}</span>
                    <span style={{ fontSize: 13, color: '#888' }}>Zaupanje: {((f.confidence || 0) * 100).toFixed(0)}%</span>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#ef4444' }}>{f.total?.toFixed(0)} €</div>
                  <div style={{ background: '#e5e7eb', borderRadius: 6, height: 6, marginTop: 6 }}>
                    <div style={{ background: '#3b82f6', height: '100%', borderRadius: 6, width: `${(f.confidence || 0) * 100}%` }} />
                  </div>
                </div>
              ))}
              <div className="card" style={{ padding: 14 }}>
                <div style={{ fontSize: 12, color: '#666' }}>Trend: {forecast.trend} · Letna sprememba: {forecast.yoy_change}%</div>
              </div>
            </div>
          )}

          {tab === 'analytics' && analytics && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Skupaj stroškov', value: `${analytics.total_expenses?.toFixed(0) || 0} €`, color: '#ef4444' },
                  { label: 'Strošek/naročilo', value: `${analytics.cost_per_order?.toFixed(2) || 0} €`, color: '#f59e0b' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {analytics.by_category?.map((c: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                    <span>{c.amount?.toFixed(0)} €</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: 4, height: 6 }}>
                    <div style={{ background: '#3b82f6', height: '100%', borderRadius: 4, width: `${c.percentage}%` }} />
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