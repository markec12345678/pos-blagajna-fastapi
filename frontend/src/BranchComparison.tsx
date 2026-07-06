import { useState, useEffect } from 'react'

export default function BranchComparison({ onNotify }: { onNotify: (msg: string) => void }) {
  const [data, setData] = useState<any[]>([])
  const [days, setDays] = useState(7)

  useEffect(() => {
    fetch(`/api/v1/analytics/by-branch?days=${days}`, { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } })
      .then(r => r.json()).then(setData).catch(() => {})
  }, [days])

  const maxSales = Math.max(...data.map(d => d.sales), 1)
  const maxOrders = Math.max(...data.map(d => d.orders), 1)

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
          {/* Sales bar chart */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 15 }}>💰 Prihodki</div>
            <svg viewBox={`0 0 ${data.length * 120 + 60} 220`} style={{ width: '100%', height: 220 }}>
              <line x1={40} y1={190} x2={data.length * 120 + 50} y2={190} stroke="var(--border)" />
              {data.map((d, i) => {
                const barH = (d.sales / maxSales) * 160
                const x = 50 + i * 120
                return (
                  <g key={d.branch_id}>
                    <rect x={x} y={190 - barH} width={40} height={Math.max(barH, 2)} rx={4} fill="var(--blue)" opacity={0.8}>
                      <title>{d.branch_name}: {d.sales}€</title>
                    </rect>
                    <text x={x + 20} y={205} textAnchor="middle" fontSize={11} fill="var(--text2)">{d.branch_name}</text>
                    <text x={x + 20} y={185 - barH} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--text)">{d.sales}€</text>
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
                    <rect x={x} y={190 - barH} width={40} height={Math.max(barH, 2)} rx={4} fill="var(--green)" opacity={0.8}>
                      <title>{d.branch_name}: {d.orders}</title>
                    </rect>
                    <text x={x + 20} y={205} textAnchor="middle" fontSize={11} fill="var(--text2)">{d.branch_name}</text>
                    <text x={x + 20} y={185 - barH} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--text)">{d.orders}</text>
                  </g>
                )
              })}
            </svg>
          </div>

          {/* Summary cards */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {data.map(d => (
              <div key={d.branch_id} className="card" style={{ padding: '12px 16px', flex: 1, minWidth: 180 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{d.branch_name}</div>
                <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span>💰 Prihodki: <strong>{d.sales}€</strong></span>
                  <span>📋 Naročila: <strong>{d.orders}</strong></span>
                  <span>💵 Napitnine: <strong>{d.tips}€</strong></span>
                  <span>📊 Povprečje: <strong>{d.orders ? (d.sales / d.orders).toFixed(2) : 0}€</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
