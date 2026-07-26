import { useState, useEffect } from 'react'
import * as api from './api'

interface DailySales { date: string; sales: number; orders: number }
interface TopItem { name: string; quantity: number; total: number }
interface CategorySales { category: string; sales: number; quantity: number }
interface Summary { today_sales: number; week_sales: number; month_sales: number; orders_today: number; avg_order_value: number }

const API = '/api/v1/analytics'

function getJson(path: string) { return fetch(path, { headers: api.authHeader() }).then(r => r.json()) }

function BarChart({ data, labelKey, valueKey, color, height = 180 }: { data: any[]; labelKey: string; valueKey: string; color: string; height?: number }) {
  const max = Math.max(...data.map(d => d[valueKey]), 1)
  const w = 600 / data.length
  return (
    <svg viewBox={`0 0 600 ${height}`} style={{ width: '100%', height }} preserveAspectRatio="none">
      {data.map((d, i) => {
        const h = (d[valueKey] / max) * (height - 30)
        return (
          <g key={i}>
            <rect x={i * w + 4} y={height - 20 - h} width={Math.max(w - 8, 6)} height={h} fill={color} rx={3}>
              <title>{d[labelKey]}: {d[valueKey].toFixed?.(1) || d[valueKey]} €</title>
            </rect>
            <text x={i * w + w / 2} y={height - 4} textAnchor="end" fontSize="8" fill="#64748b" transform={`rotate(-45,${i * w + w / 2},${height - 4})`}>
              {String(d[labelKey]).slice(-5)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function LineChart({ datasets, labels, height = 180 }: { datasets: { data: number[]; color: string; label: string }[]; labels: string[]; height?: number }) {
  const allVals = datasets.flatMap(ds => ds.data)
  const max = Math.max(...allVals, 1)
  const w = 600
  const padding = 40
  const chartW = w - padding * 2
  const chartH = height - 40
  const step = labels.length > 1 ? chartW / (labels.length - 1) : chartW

  return (
    <svg viewBox={`0 0 ${w} ${height}`} style={{ width: '100%', height }} preserveAspectRatio="none">
      {[0, 0.25, 0.5, 0.75, 1].map(pct => (
        <g key={pct}>
          <line x1={padding} y1={20 + chartH * (1 - pct)} x2={w - padding} y2={20 + chartH * (1 - pct)} stroke="#e2e8f0" strokeWidth="1" />
          <text x={padding - 4} y={24 + chartH * (1 - pct)} textAnchor="end" fontSize="8" fill="#94a3b8">{(max * pct).toFixed(0)}</text>
        </g>
      ))}
      {labels.map((label, i) => (
        <text key={i} x={padding + i * step} y={height - 4} textAnchor="end" fontSize="8" fill="#64748b" transform={`rotate(-45,${padding + i * step},${height - 4})`}>
          {label.slice(-5)}
        </text>
      ))}
      {datasets.map((ds, di) => {
        const points = ds.data.map((val, i) => `${padding + i * step},${20 + chartH * (1 - val / max)}`).join(' ')
        return (
          <g key={di}>
            <polyline points={points} fill="none" stroke={ds.color} strokeWidth="2.5" strokeLinejoin="round">
              <title>{ds.label}</title>
            </polyline>
            {ds.data.map((val, i) => (
              <circle key={i} cx={padding + i * step} cy={20 + chartH * (1 - val / max)} r="3" fill={ds.color}>
                <title>{labels[i]}: {val.toFixed(1)} €</title>
              </circle>
            ))}
          </g>
        )
      })}
    </svg>
  )
}

function HeatMap({ data, rowLabels, colLabels, title }: { data: number[][]; rowLabels: string[]; colLabels: string[]; title: string }) {
  const max = Math.max(...data.flat(), 1)
  const cellW = 500 / colLabels.length
  const cellH = 30
  const colors = ['#f0fdf4', '#bbf7d0', '#4ade80', '#16a34a', '#15803d', '#166534']
  const getColor = (val: number) => {
    const idx = Math.min(Math.floor((val / max) * colors.length), colors.length - 1)
    return colors[idx]
  }

  return (
    <div>
      <h4 style={{ marginBottom: 8 }}>{title}</h4>
      <svg viewBox={`0 0 ${500 + 60} ${rowLabels.length * cellH + 40}`} style={{ width: '100%' }}>
        {colLabels.map((col, ci) => (
          <text key={ci} x={60 + ci * cellW + cellW / 2} y={12} textAnchor="middle" fontSize="9" fill="#64748b">{col}</text>
        ))}
        {data.map((row, ri) => (
          <g key={ri}>
            <text x={55} y={30 + ri * cellH + cellH / 2 + 3} textAnchor="end" fontSize="9" fill="#64748b">{rowLabels[ri]}</text>
            {row.map((val, ci) => (
              <g key={ci}>
                <rect x={60 + ci * cellW + 1} y={22 + ri * cellH + 1} width={cellW - 2} height={cellH - 2} fill={getColor(val)} rx={2}>
                  <title>{rowLabels[ri]} {colLabels[ci]}: {val.toFixed(0)} €</title>
                </rect>
                {val > 0 && (
                  <text x={60 + ci * cellW + cellW / 2} y={22 + ri * cellH + cellH / 2 + 3} textAnchor="middle" fontSize="8" fill={val > max * 0.5 ? '#fff' : '#334155'} fontWeight="600">
                    {val.toFixed(0)}
                  </text>
                )}
              </g>
            ))}
          </g>
        ))}
      </svg>
    </div>
  )
}

function PieChart({ data, labelKey, valueKey, size = 200 }: { data: any[]; labelKey: string; valueKey: string; size?: number }) {
  const total = data.reduce((s, d) => s + d[valueKey], 0) || 1
  const colors = ['#059669', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']
  let cumulative = 0
  const r = 80, cx = 100, cy = 100
  return (
    <svg viewBox={`0 0 200 ${size + 40}`} style={{ width: '100%', maxWidth: 400 }}>
      {data.map((d, i) => {
        const pct = d[valueKey] / total
        const angle = pct * 360
        const start = (cumulative / total) * 360
        cumulative += pct * 360
        const startRad = ((start - 90) * Math.PI) / 180
        const endRad = ((start + angle - 90) * Math.PI) / 180
        const x1 = cx + r * Math.cos(startRad)
        const y1 = cy + r * Math.sin(startRad)
        const x2 = cx + r * Math.cos(endRad)
        const y2 = cy + r * Math.sin(endRad)
        const large = angle > 180 ? 1 : 0
        if (angle < 0.5) return null
        return (
          <g key={i}>
            <path d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`} fill={colors[i % colors.length]}>
              <title>{d[labelKey]}: {d[valueKey].toFixed?.(1) || d[valueKey]}</title>
            </path>
            <text x={cx + 100} y={40 + i * 22} fontSize="12" fill="#334155">
              <tspan fill={colors[i % colors.length]} fontSize="14">●</tspan> {d[labelKey]} ({(pct * 100).toFixed(0)}%)
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function exportCSV(data: any[], filename: string) {
  const headers = Object.keys(data[0] || {}).join(',')
  const rows = data.map(r => Object.values(r).map(v => typeof v === 'string' ? `"${v}"` : v).join(',')).join('\n')
  const blob = new Blob([headers + '\n' + rows], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function Analytics({ onNotify }: { onNotify: (msg: string) => void }) {
  const [daily, setDaily] = useState<DailySales[]>([])
  const [hourly, setHourly] = useState<any[]>([])
  const [top, setTop] = useState<TopItem[]>([])
  const [cats, setCats] = useState<CategorySales[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [days, setDays] = useState(7)
  const [popularityDow, setPopularityDow] = useState<any[]>([])
  const [popularityHourly, setPopularityHourly] = useState<any[]>([])
  const [bottomItems, setBottomItems] = useState<TopItem[]>([])
  const [report, setReport] = useState<any>(null)

  useEffect(() => {
    getJson(`${API}/sales/daily?days=${days}`).then(setDaily)
    getJson(`${API}/sales/hourly?days=${days}`).then(setHourly)
    getJson(`${API}/top-items`).then(setTop)
    getJson(`${API}/categories`).then(setCats)
    getJson(`${API}/summary`).then(setSummary)
    getJson(`${API}/popularity/dow`).then(setPopularityDow)
    getJson(`${API}/popularity/hourly`).then(setPopularityHourly)
    getJson(`${API}/popularity/bottom`).then(setBottomItems)
    getJson(`${API}/report?days=${days}`).then(setReport)
  }, [days])

  const dailyLabels = daily.map(d => d.date)
  const hourlyLabels = hourly.map(h => `${h.hour}:00`)

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <h2>📊 Analitika</h2>
        <div className="analytics-controls">
          <label className="analytics-period-label">Obdobje:</label>
          <select value={days} onChange={e => setDays(Number(e.target.value))} className="input analytics-period-select">
            <option value={7}>7 dni</option>
            <option value={14}>14 dni</option>
            <option value={30}>30 dni</option>
          </select>
        </div>
      </div>

      {summary && (
        <div className="stat-grid analytics-stats">
          <div className="stat-card"><div className="stat-value analytics-stat green">{summary.today_sales.toFixed(0)} €</div><div className="stat-label">Danes</div></div>
          <div className="stat-card"><div className="stat-value">{summary.week_sales.toFixed(0)} €</div><div className="stat-label">Ta teden</div></div>
          <div className="stat-card"><div className="stat-value analytics-stat blue">{summary.month_sales.toFixed(0)} €</div><div className="stat-label">Ta mesec</div></div>
          <div className="stat-card"><div className="stat-value">{summary.orders_today}</div><div className="stat-label">Naročil danes</div></div>
          <div className="stat-card"><div className="stat-value analytics-stat amber">{summary.avg_order_value.toFixed(1)} €</div><div className="stat-label">Povp. vrednost</div></div>
        </div>
      )}

      <div className="analytics-grid">
        <div className="card analytics-card">
          <h4>Dnevna prodaja</h4>
          {daily.length > 0 ? <BarChart data={daily} labelKey="date" valueKey="sales" color="#059669" /> : <p className="analytics-no-data">Ni podatkov</p>}
          <div className="analytics-csv">
            <button onClick={() => exportCSV(daily, 'daily-sales.csv')} className="btn btn-sm btn-ghost">📥 CSV</button>
          </div>
        </div>
        <div className="card analytics-card">
          <h4>Prodaja po urah</h4>
          {hourly.length > 0 ? <BarChart data={hourly} labelKey="hour" valueKey="sales" color="#3b82f6" /> : <p className="analytics-no-data">Ni podatkov</p>}
        </div>
      </div>

      <div className="analytics-grid">
        <div className="card analytics-card">
          <h4>Trend prodaje (naročila)</h4>
          {daily.length > 0 ? (
            <LineChart
              datasets={[
                { data: daily.map(d => d.sales), color: '#059669', label: 'Prodaja (€)' },
                { data: daily.map(d => d.orders * (summary?.avg_order_value || 30)), color: '#3b82f6', label: 'Naročila (est.)' }
              ]}
              labels={dailyLabels}
            />
          ) : <p className="analytics-no-data">Ni podatkov</p>}
        </div>

        <div className="card analytics-card">
          <h4>Ura prodaje (trend)</h4>
          {hourly.length > 0 ? (
            <LineChart
              datasets={[{ data: hourly.map(h => h.sales), color: '#f59e0b', label: 'Prodaja po urah' }]}
              labels={hourlyLabels}
            />
          ) : <p className="analytics-no-data">Ni podatkov</p>}
        </div>
      </div>

      <div className="analytics-grid">
        <div className="card analytics-card">
          <h4>Najboljši artikli (30 dni)</h4>
          {top.length > 0 ? (
            <table className="analytics-table">
              <thead><tr>
                <th>Artikel</th>
                <th className="right">Količina</th>
                <th className="right">Skupaj</th>
              </tr></thead>
              <tbody>
                {top.map((item, i) => (
                  <tr key={i}>
                    <td>{item.name}</td>
                    <td className="right">{item.quantity}</td>
                    <td className="bold">{item.total.toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="analytics-no-data">Ni podatkov</p>}
          <div className="analytics-csv">
            <button onClick={() => exportCSV(top, 'top-items.csv')} className="btn btn-sm btn-ghost">📥 CSV</button>
          </div>
        </div>

        <div className="card analytics-card">
          <h4>Prodaja po kategorijah</h4>
          {cats.length > 0 ? <PieChart data={cats} labelKey="category" valueKey="sales" /> : <p className="analytics-no-data">Ni podatkov</p>}
        </div>
      </div>

      <div className="analytics-grid">
        <div className="card analytics-card">
          <h4>🔥 Priljubljenost po dnevih</h4>
          {popularityDow.length > 0 ? (
            <BarChart data={popularityDow} labelKey="day" valueKey="quantity" color="#ef4444" />
          ) : <p className="analytics-no-data">Ni podatkov</p>}
        </div>
        <div className="card analytics-card">
          <h4>🔥 Priljubljenost po urah</h4>
          {popularityHourly.length > 0 ? (
            <BarChart data={popularityHourly} labelKey="hour" valueKey="quantity" color="#8b5cf6" />
          ) : <p className="analytics-no-data">Ni podatkov</p>}
        </div>
      </div>

      {bottomItems.length > 0 && (
        <div className="card analytics-card" style={{ marginTop: 16 }}>
          <h4>⚠️ Najmanj prodajani artikli</h4>
          <table className="analytics-table">
            <thead><tr>
              <th>Artikel</th>
              <th className="right">Količina</th>
              <th className="right">Skupaj</th>
            </tr></thead>
            <tbody>
              {bottomItems.slice(0, 10).map((item, i) => (
                <tr key={i}>
                  <td>{item.name}</td>
                  <td className="right">{item.quantity}</td>
                  <td className="bold" style={{ color: 'var(--red)' }}>{item.total.toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {report && report.by_payment_method && (
        <div className="card analytics-card" style={{ marginTop: 16 }}>
          <h4>💳 Plačilne metode</h4>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {Object.entries(report.by_payment_method).map(([method, amount]: [string, any]) => (
              <div key={method} style={{ textAlign: 'center', padding: '8px 16px', background: 'var(--bg)', borderRadius: 8 }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{amount.toFixed(2)} €</div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                  {method === 'cash' ? '💵 Gotovina' : method === 'card' ? '💳 Kartica' : method === 'gift_card' ? '🎁 Darilna' : method === 'house_account' ? '🏠 Račun' : method}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
