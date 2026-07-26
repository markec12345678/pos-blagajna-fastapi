import { useState, useEffect } from 'react'
import * as api from './api'

interface BranchData { branch_id: number; branch_name: string; sales: number; orders: number; tips: number }

export default function BranchComparison({ onNotify }: { onNotify: (msg: string) => void }) {
  const [data, setData] = useState<BranchData[]>([])
  const [days, setDays] = useState(7)

  useEffect(() => {
    fetch(`/api/v1/analytics/by-branch?days=${days}`, { headers: api.authHeader() })
      .then(r => r.json()).then(setData).catch(() => {})
  }, [days])

  const maxSales = Math.max(...data.map(d => d.sales), 1)
  const maxOrders = Math.max(...data.map(d => d.orders), 1)
  const totalSales = data.reduce((s, d) => s + d.sales, 0)
  const totalOrders = data.reduce((s, d) => s + d.orders, 0)

  const barColors = ['#3b82f6', '#059669', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">📊 Primerjava podružnic</h2>
        <select className="input" value={days} onChange={e => setDays(parseInt(e.target.value))} style={{ width: 120 }}>
          <option value={1}>Danes</option>
          <option value={7}>Zadnjih 7 dni</option>
          <option value={30}>Zadnjih 30 dni</option>
          <option value={90}>Zadnjih 90 dni</option>
        </select>
      </div>

      {data.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text2)', padding: 40 }}>Ni podatkov</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Total summary */}
          <div className="card" style={{ padding: 16, display: 'flex', gap: 24, justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--green)' }}>{totalSales.toLocaleString()} €</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>Skupaj prihodki</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{totalOrders}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>Skupaj naročil</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--amber)' }}>{data.length}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>Podružnic</div>
            </div>
          </div>

          {/* Revenue bar chart */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 15 }}>💰 Prihodki</div>
            <svg viewBox={`0 0 ${data.length * 120 + 60} 220`} style={{ width: '100%', height: 220 }}>
              <line x1={40} y1={190} x2={data.length * 120 + 50} y2={190} stroke="var(--border)" />
              {data.map((d, i) => {
                const barH = (d.sales / maxSales) * 160
                const x = 50 + i * 120
                const pct = totalSales > 0 ? (d.sales / totalSales * 100).toFixed(1) : 0
                return (
                  <g key={d.branch_id}>
                    <rect x={x} y={190 - barH} width={40} height={Math.max(barH, 2)} rx={4} fill={barColors[i % barColors.length]} opacity={0.8}>
                      <title>{d.branch_name}: {d.sales.toLocaleString()}€ ({pct}%)</title>
                    </rect>
                    <text x={x + 20} y={205} textAnchor="middle" fontSize={10} fill="var(--text2)">{d.branch_name}</text>
                    <text x={x + 20} y={185 - barH} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--text)">{d.sales.toLocaleString()}€</text>
                    <text x={x + 20} y={175 - barH} textAnchor="middle" fontSize={9} fill="var(--text2)">{pct}%</text>
                  </g>
                )
              })}
            </svg>
          </div>

          {/* Orders bar chart */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 15 }}>📋 Naročila</div>
            <svg viewBox={`0 0 ${data.length * 120 + 60} 220`} style={{ width: '100%', height: 220 }}>
              <line x1={40} y1={190} x2={data.length * 120 + 50} y2={190} stroke="var(--border)" />
              {data.map((d, i) => {
                const barH = (d.orders / maxOrders) * 160
                const x = 50 + i * 120
                return (
                  <g key={d.branch_id}>
                    <rect x={x} y={190 - barH} width={40} height={Math.max(barH, 2)} rx={4} fill={barColors[i % barColors.length]} opacity={0.8}>
                      <title>{d.branch_name}: {d.orders} naročil</title>
                    </rect>
                    <text x={x + 20} y={205} textAnchor="middle" fontSize={10} fill="var(--text2)">{d.branch_name}</text>
                    <text x={x + 20} y={185 - barH} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--text)">{d.orders}</text>
                  </g>
                )
              })}
            </svg>
          </div>

          {/* Tips + Avg order value comparison */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 15 }}>📊 Povprečja in napitnine</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              {data.map((d, i) => {
                const avgOrder = d.orders ? d.sales / d.orders : 0
                const tipPct = d.sales > 0 ? (d.tips / d.sales * 100) : 0
                return (
                  <div key={d.branch_id} style={{ padding: 12, background: 'var(--bg)', borderRadius: 8, borderLeft: `3px solid ${barColors[i % barColors.length]}` }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{d.branch_name}</div>
                    <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span>💰 Napitnine: <strong>{d.tips.toLocaleString()}€</strong> ({tipPct.toFixed(1)}%)</span>
                      <span>📊 Povp. naročilo: <strong>{avgOrder.toFixed(2)}€</strong></span>
                      <span>💵 Naročil/dan: <strong>{d.orders ? (d.orders / days).toFixed(1) : 0}</strong></span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Detailed comparison table */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 15 }}>📋 Podrobna primerjava</div>
            <div style={{ overflowX: 'auto' }}>
              <table className="analytics-table" style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>Podružnica</th>
                    <th className="right">Prihodki</th>
                    <th className="right">Naročila</th>
                    <th className="right">Napitnine</th>
                    <th className="right">Povp. naročilo</th>
                    <th className="right">% prihodkov</th>
                    <th className="right">Naročil/dan</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(d => {
                    const avgOrder = d.orders ? d.sales / d.orders : 0
                    const pct = totalSales > 0 ? (d.sales / totalSales * 100) : 0
                    const perDay = days > 0 ? (d.orders / days) : 0
                    return (
                      <tr key={d.branch_id}>
                        <td style={{ fontWeight: 600 }}>{d.branch_name}</td>
                        <td className="right bold">{d.sales.toLocaleString()} €</td>
                        <td className="right">{d.orders}</td>
                        <td className="right">{d.tips.toLocaleString()} €</td>
                        <td className="right">{avgOrder.toFixed(2)} €</td>
                        <td className="right">{pct.toFixed(1)}%</td>
                        <td className="right">{perDay.toFixed(1)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
