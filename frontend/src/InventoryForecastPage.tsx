import { useState, useEffect } from 'react'

interface IngForecast {
  ingredient_id: number; ingredient_name: string; unit: string; category: string;
  current_stock: number; min_stock: number; cost_per_unit: number;
  daily_usage: number; forecast_usage_7d: number; forecast_usage: number;
  days_remaining: number; will_run_out: boolean; need_to_order: boolean; cost_at_risk: number
}

interface InvForecastData {
  ingredients: IngForecast[]
  summary: { total_ingredients: number; will_run_out: number; need_to_order: number; total_cost_at_risk: number; forecast_days: number; total_stock_value: number }
}

export default function InventoryForecastPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [data, setData] = useState<InvForecastData | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(7)
  const [filter, setFilter] = useState<'all' | 'risk' | 'order'>('all')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/v1/analytics/inventory-forecast?forecast_days=${days}`, {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
    }).then(r => r.json()).then(d => { setData(d); setLoading(false) })
      .catch(() => { setLoading(false); onNotify('Napaka pri napovedi zalog') })
  }, [days])

  const items = data ? data.ingredients.filter(i => {
    if (filter === 'risk') return i.will_run_out
    if (filter === 'order') return i.need_to_order
    return true
  }) : []

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">📦 Napoved zalog</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="input" value={days} onChange={e => setDays(parseInt(e.target.value))} style={{ width: 110, fontSize: 12 }}>
            <option value={7}>7 dni</option>
            <option value={14}>14 dni</option>
            <option value={30}>30 dni</option>
          </select>
          <select className="input" value={filter} onChange={e => setFilter(e.target.value as any)} style={{ width: 110, fontSize: 12 }}>
            <option value="all">Vse</option>
            <option value="risk">⚠️ Zmanjka</option>
            <option value="order">📥 Za naročilo</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>⏳ Računam napoved...</div>
      ) : data ? (
        <div>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
            <div className="card" style={{ padding: '12px 14px', borderLeft: '3px solid #059669' }}>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>Vrednost zaloge</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#059669' }}>{data.summary.total_stock_value.toFixed(2)} €</div>
            </div>
            <div className="card" style={{ padding: '12px 14px', borderLeft: '3px solid #ef4444' }}>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>⚠️ Zmanjka v {days}d</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#ef4444' }}>{data.summary.will_run_out}</div>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>sestavin</div>
            </div>
            <div className="card" style={{ padding: '12px 14px', borderLeft: '3px solid #f59e0b' }}>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>📥 Za naročilo</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b' }}>{data.summary.need_to_order}</div>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>sestavin</div>
            </div>
            <div className="card" style={{ padding: '12px 14px', borderLeft: '3px solid #8b5cf6' }}>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>&#x1f4b0; Tveganje</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#8b5cf6' }}>{data.summary.total_cost_at_risk.toFixed(2)} €</div>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>če zmanjka</div>
            </div>
          </div>

          {/* Table */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>
              {filter === 'all' ? '📋 Vse sestavine' : filter === 'risk' ? '⚠️ Sestavine ki bodo zmanjkale' : '📥 Sestavine za naročilo'}
              <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--text2)', marginLeft: 8 }}>({items.length})</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '4px 8px' }}>Sestavina</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px' }}>Zaloga</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px' }}>Min</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px' }}>Dnevna poraba</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px' }}>Napoved ({days}d)</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px' }}>Dni zaloge</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px' }}>Tveganje</th>
                </tr></thead>
                <tbody>
                  {items.map(i => {
                    const stockPct = i.daily_usage > 0 ? Math.min(100, (i.current_stock / (i.daily_usage * days)) * 100) : 100
                    return (
                      <tr key={i.ingredient_id} style={{
                        borderBottom: '1px solid var(--border)',
                        background: i.will_run_out ? 'rgba(239,68,68,0.05)' : i.need_to_order ? 'rgba(245,158,11,0.05)' : undefined
                      }}>
                        <td style={{ padding: '4px 8px', fontWeight: 600 }}>
                          {i.ingredient_name}
                          <span style={{ fontSize: 10, color: 'var(--text2)', marginLeft: 4 }}>{i.unit}</span>
                        </td>
                        <td style={{ padding: '4px 8px', textAlign: 'right' }}>{i.current_stock}</td>
                        <td style={{ padding: '4px 8px', textAlign: 'right', color: 'var(--text2)' }}>{i.min_stock}</td>
                        <td style={{ padding: '4px 8px', textAlign: 'right' }}>{i.daily_usage.toFixed(2)}</td>
                        <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600, color: i.will_run_out ? '#ef4444' : 'var(--text)' }}>
                          {i.forecast_usage.toFixed(1)}
                        </td>
                        <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                          <span style={{ color: i.days_remaining < 7 ? '#ef4444' : i.days_remaining < 14 ? '#f59e0b' : '#059669', fontWeight: 700 }}>
                            {i.days_remaining >= 999 ? '∞' : `${i.days_remaining}d`}
                          </span>
                        </td>
                        <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                          {i.will_run_out ? (
                            <span style={{ color: '#ef4444', fontWeight: 700 }}>{i.cost_at_risk.toFixed(2)} €</span>
                          ) : (
                            <span style={{ color: '#059669' }}>✅</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {items.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text2)', padding: 20 }}>Ni podatkov</p>}
          </div>
        </div>
      ) : null}
    </div>
  )
}
