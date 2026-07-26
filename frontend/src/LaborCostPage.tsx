import { useState, useEffect } from 'react'
import { authHeader } from './api'

interface LaborEmployee {
  user_id: number; user_name: string; role: string;
  hourly_rate: number; hours: number; cost: number;
  shift_count: number
}

interface LaborDaily {
  date: string; hours: number; labor_cost: number;
  revenue: number; labor_pct: number
}

export default function LaborCostPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [employees, setEmployees] = useState<LaborEmployee[]>([])
  const [daily, setDaily] = useState<LaborDaily[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(7)

  const api = () => fetch(`/api/v1/analytics/labor-costs?days=${days}`, {
    headers: authHeader()
  })

  const load = () => {
    setLoading(true)
    api().then(r => r.json()).then(d => {
      setEmployees(d.employees || [])
      setDaily(d.daily || [])
      setSummary({
        total_labor_cost: d.total_labor_cost,
        total_hours: d.total_hours,
        total_revenue: d.total_revenue,
        labor_cost_pct: d.labor_cost_pct,
        employee_count: d.employee_count,
        default_rate: d.default_rate
      })
      setLoading(false)
    }).catch(() => { setLoading(false); onNotify('Napaka pri nalaganju') })
  }

  useEffect(load, [days])

  const lcColor = (pct: number) => {
    if (pct <= 20) return '#059669'
    if (pct <= 30) return '#22c55e'
    if (pct <= 40) return '#f59e0b'
    return '#ef4444'
  }

  if (loading) return <div className="page-container-sm"><p style={{ textAlign: 'center', color: 'var(--text2)', padding: 40 }}>Nalaganje...</p></div>

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">👥 Stroški dela</h2>
        <select className="input" value={days} onChange={e => setDays(parseInt(e.target.value))} style={{ width: 100, fontSize: 12 }}>
          <option value={1}>Danes</option>
          <option value={7}>7 dni</option>
          <option value={30}>30 dni</option>
          <option value={90}>90 dni</option>
        </select>
      </div>

      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 16 }}>
          <div className="card" style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>Stroški dela</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#ef4444' }}>{summary.total_labor_cost.toFixed(2)} €</div>
          </div>
          <div className="card" style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>Prihodki</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#059669' }}>{summary.total_revenue.toFixed(2)} €</div>
          </div>
          <div className="card" style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>% dela</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: lcColor(summary.labor_cost_pct) }}>
              {summary.labor_cost_pct}%
            </div>
          </div>
          <div className="card" style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>Ure</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{summary.total_hours.toFixed(1)}</div>
          </div>
          <div className="card" style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>Zaposlenih</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{summary.employee_count}</div>
          </div>
        </div>
      )}

      {/* Labor cost gauge */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>📊 Delež stroškov dela v prihodkih</div>
        {summary && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ position: 'relative', display: 'inline-block', width: 200, height: 100, overflow: 'hidden' }}>
              <svg viewBox="0 0 200 120" style={{ width: 200, height: 100 }}>
                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#e2e8f0" strokeWidth="20" strokeLinecap="round" />
                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={lcColor(summary.labor_cost_pct)} strokeWidth="20" strokeLinecap="round"
                  strokeDasharray={`${summary.labor_cost_pct * 2.51} 251`} />
                <text x="100" y="60" textAnchor="middle" fontSize="28" fontWeight="800" fill={lcColor(summary.labor_cost_pct)}>{summary.labor_cost_pct}%</text>
                <text x="100" y="80" textAnchor="middle" fontSize="10" fill="#94a3b8">stroškov dela</text>
              </svg>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, fontSize: 11, color: '#64748b', marginTop: 4 }}>
              <span>🎯 Cilj: &lt;30%</span>
              <span style={{ color: summary.labor_cost_pct <= 30 ? '#059669' : '#ef4444' }}>
                {summary.labor_cost_pct <= 30 ? '✅ OK' : '⚠️ Previsoko'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Daily chart */}
      {daily.length > 0 && (
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>📈 Dnevni stroški dela</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '6px 8px' }}>Dan</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px' }}>Ure</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px' }}>Strošek</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px' }}>Prihodek</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px' }}>%</th>
                </tr>
              </thead>
              <tbody>
                {daily.map(d => (
                  <tr key={d.date} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 600 }}>
                      {new Date(d.date + 'T00:00:00').toLocaleDateString('sl-SI', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>{d.hours.toFixed(1)}h</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: '#ef4444' }}>{d.labor_cost.toFixed(2)} €</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: '#059669' }}>{d.revenue.toFixed(2)} €</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: lcColor(d.labor_pct) }}>{d.labor_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Per employee */}
      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>👤 Po zaposlenih</div>
        {employees.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text2)', padding: 20 }}>Ni podatkov</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '6px 8px' }}>Zaposleni</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px' }}>Vloga</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px' }}>Urna postavka</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px' }}>Izmen</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px' }}>Ur</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px' }}>Strošek</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(e => (
                  <tr key={e.user_id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 600 }}>{e.user_name}</td>
                    <td style={{ padding: '6px 8px', color: 'var(--text2)', textTransform: 'capitalize' }}>{e.role}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>{e.hourly_rate.toFixed(2)} €/h</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>{e.shift_count}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>{e.hours.toFixed(1)}h</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>{e.cost.toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
