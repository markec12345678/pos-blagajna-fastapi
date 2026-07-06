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
              {d[labelKey].slice(-5)}
            </text>
          </g>
        )
      })}
    </svg>
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

  useEffect(() => {
    getJson(`${API}/sales/daily?days=${days}`).then(setDaily)
    getJson(`${API}/sales/hourly?days=${days}`).then(setHourly)
    getJson(`${API}/top-items`).then(setTop)
    getJson(`${API}/categories`).then(setCats)
    getJson(`${API}/summary`).then(setSummary)
  }, [days])

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
    </div>
  )
}
