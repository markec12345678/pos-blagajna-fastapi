import { useState, useEffect } from 'react'

const API = '/api/v1/employees/performance'
const auth = () => ({ 'Authorization': 'Bearer ' + localStorage.getItem('pos_token') })

function BarChart({ data, labelKey, valueKey, color, unit, height = 180 }: {
  data: any[]; labelKey: string; valueKey: string; color: string; unit?: string; height?: number
}) {
  const max = Math.max(...data.map(d => d[valueKey]), 1)
  const w = Math.max(40, Math.min(80, 600 / data.length))
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height, padding: '16px 0 0 0', overflowX: 'auto' }}>
      {data.map((d, i) => {
        const pct = (d[valueKey] / max) * 100
        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: w }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', marginBottom: 2, whiteSpace: 'nowrap' }}>
              {d[valueKey]}{unit || ''}
            </div>
            <div style={{
              width: w - 8, height: `${pct * (height - 40) / 100}px`,
              background: color, borderRadius: '4px 4px 0 0',
              transition: 'height 0.3s', minHeight: 2,
            }} />
            <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 4, textAlign: 'center', maxWidth: w + 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {d[labelKey]}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function EmployeePerformance({ onNotify }: { onNotify: (m: string) => void }) {
  const [data, setData] = useState<any>(null)
  const [days, setDays] = useState(30)
  const [sortKey, setSortKey] = useState('revenue')
  const [chartKey, setChartKey] = useState('revenue')

  useEffect(() => {
    fetch(`${API}?days=${days}`, { headers: auth() })
      .then(r => r.json()).then(setData).catch(() => {})
  }, [days])

  if (!data) return <div className="page"><p>Nalaganje...</p></div>

  const sorted = [...(data.employees || [])].sort((a: any, b: any) => (b[sortKey] || 0) - (a[sortKey] || 0))

  const chartConfigs: Record<string, { label: string; valueKey: string; color: string; unit: string }> = {
    revenue: { label: 'Prihodek', valueKey: 'revenue', color: '#059669', unit: ' €' },
    orders: { label: 'Naročila', valueKey: 'orders', color: '#3b82f6', unit: '' },
    hours: { label: 'Ure', valueKey: 'hours_worked', color: '#f59e0b', unit: 'h' },
    rev_per_hour: { label: '€/h', valueKey: 'revenue_per_hour', color: '#8b5cf6', unit: ' €' },
    items: { label: 'Artikli', valueKey: 'total_items', color: '#ec4899', unit: '' },
    avg_order: { label: 'Povp. €', valueKey: 'avg_order', color: '#14b8a6', unit: ' €' },
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>👥 Statistika zaposlenih</h2>
        <select className="input" value={days} onChange={e => setDays(parseInt(e.target.value))} style={{ width: 120 }}>
          <option value={7}>Zadnjih 7 dni</option>
          <option value={30}>Zadnjih 30 dni</option>
          <option value={90}>Zadnjih 90 dni</option>
          <option value={365}>Zadnje leto</option>
        </select>
      </div>

      {data.totals && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Naročila', value: data.totals.total_orders, color: '#3b82f6' },
            { label: 'Prihodek', value: `${data.totals.total_revenue.toFixed(0)} €`, color: '#059669' },
            { label: 'Artikli', value: data.totals.total_items, color: '#8b5cf6' },
            { label: 'Ure', value: data.totals.total_hours.toFixed(1), color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ borderLeft: `3px solid ${s.color}` }}>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text2)', padding: '6px 0' }}>Grafikon:</span>
          {Object.entries(chartConfigs).map(([k, v]) => (
            <button key={k} onClick={() => setChartKey(k)}
              className={`btn btn-sm ${chartKey === k ? 'btn-primary' : 'btn-ghost'}`}>{v.label}</button>
          ))}
        </div>
        {sorted.length > 0 && (
          <BarChart data={sorted} labelKey="name" valueKey={chartConfigs[chartKey].valueKey}
            color={chartConfigs[chartKey].color} unit={chartConfigs[chartKey].unit} />
        )}
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--text2)', padding: '6px 0' }}>Razvrsti po:</span>
        {[
          { key: 'revenue', label: 'Prihodku' },
          { key: 'orders', label: 'Naročilih' },
          { key: 'avg_order', label: 'Povp. vrednosti' },
          { key: 'items_per_order', label: 'Artikli/naročilo' },
          { key: 'hours_worked', label: 'Urah' },
          { key: 'revenue_per_hour', label: '€/h' },
        ].map(s => (
          <button key={s.key} onClick={() => setSortKey(s.key)}
            className={`btn btn-sm ${sortKey === s.key ? 'btn-primary' : 'btn-ghost'}`}>{s.label}</button>
        ))}
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: 8 }}>Zaposleni</th>
              <th style={{ textAlign: 'center', padding: 8 }}>Vloga</th>
              <th style={{ textAlign: 'center', padding: 8 }}>Naročila</th>
              <th style={{ textAlign: 'right', padding: 8 }}>Prihodek</th>
              <th style={{ textAlign: 'right', padding: 8 }}>Povp. €</th>
              <th style={{ textAlign: 'center', padding: 8 }}>Artikli</th>
              <th style={{ textAlign: 'center', padding: 8 }}>Art./nar.</th>
              <th style={{ textAlign: 'center', padding: 8 }}>Ure</th>
              <th style={{ textAlign: 'right', padding: 8 }}>€/h</th>
              <th style={{ textAlign: 'center', padding: 8 }}>Nar./h</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((e: any) => (
              <tr key={e.user_id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: 8, fontWeight: 600 }}>{e.name}</td>
                <td style={{ textAlign: 'center', padding: 8 }}>
                  <span className={`badge ${e.role === 'admin' ? 'badge-green' : e.role === 'cashier' ? 'badge-blue' : 'badge-gray'}`}>
                    {e.role}
                  </span>
                </td>
                <td style={{ textAlign: 'center', padding: 8 }}>{e.orders}</td>
                <td style={{ textAlign: 'right', padding: 8, fontWeight: 600 }}>{e.revenue.toFixed(2)} €</td>
                <td style={{ textAlign: 'right', padding: 8 }}>{e.avg_order.toFixed(2)} €</td>
                <td style={{ textAlign: 'center', padding: 8 }}>{e.total_items}</td>
                <td style={{ textAlign: 'center', padding: 8 }}>{e.items_per_order}</td>
                <td style={{ textAlign: 'center', padding: 8 }}>{e.hours_worked.toFixed(1)}</td>
                <td style={{ textAlign: 'right', padding: 8 }}>{e.revenue_per_hour.toFixed(2)} €</td>
                <td style={{ textAlign: 'center', padding: 8 }}>{e.orders_per_hour.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sorted.length === 0 && <p style={{ color: 'var(--text2)', padding: 20, textAlign: 'center' }}>Ni podatkov.</p>}
    </div>
  )
}
