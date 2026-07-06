import { useState, useEffect } from 'react'

interface YoYData {
  current: {
    date_from: string; date_to: string; sales: number; orders: number; avg_order: number;
    daily: { date: string; sales: number; dow: number }[];
    dow: { dow: number; label: string; count: number }[];
  };
  last_year: {
    date_from: string; date_to: string; sales: number; orders: number; avg_order: number;
    daily: { date: string; sales: number; dow: number }[];
    dow: { dow: number; label: string; count: number }[];
  };
  changes: { sales_pct: number; orders_pct: number; sales_diff: number };
}

export default function YoYComparisonPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [data, setData] = useState<YoYData | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/v1/analytics/yoy-comparison?days=${days}`, {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
    }).then(r => r.json()).then(d => { setData(d); setLoading(false) })
      .catch(() => { setLoading(false); onNotify('Napaka pri YoY primerjavi') })
  }, [days])

  const fmt = (n: number) => n.toFixed(2) + ' €'
  const arrow = (pct: number, reverse = false) => {
    const good = reverse ? pct <= 0 : pct >= 0
    return <span style={{ color: good ? '#059669' : '#ef4444', fontWeight: 700 }}>
      {pct >= 0 ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
    </span>
  }

  const maxDaily = data ? Math.max(
    ...data.current.daily.map(d => d.sales),
    ...data.last_year.daily.map(d => d.sales),
    1
  ) : 1

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">📅 Medletna primerjava (YoY)</h2>
        <select className="input" value={days} onChange={e => setDays(parseInt(e.target.value))} style={{ width: 120, fontSize: 12 }}>
          <option value={7}>7 dni</option>
          <option value={30}>30 dni</option>
          <option value={60}>60 dni</option>
          <option value={90}>90 dni</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>⏳ Nalaganje...</div>
      ) : data ? (
        <div>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
            <div className="card" style={{ padding: '12px 14px', borderLeft: '3px solid #059669' }}>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>Prodaja letos</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#059669' }}>{fmt(data.current.sales)}</div>
              <div style={{ fontSize: 11 }}>Lani: {fmt(data.last_year.sales)} {arrow(data.changes.sales_pct)}</div>
            </div>
            <div className="card" style={{ padding: '12px 14px', borderLeft: '3px solid #3b82f6' }}>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>Naročila</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{data.current.orders}</div>
              <div style={{ fontSize: 11 }}>Lani: {data.last_year.orders} {arrow(data.changes.orders_pct)}</div>
            </div>
            <div className="card" style={{ padding: '12px 14px', borderLeft: '3px solid #f59e0b' }}>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>Povprečje</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b' }}>{fmt(data.current.avg_order)}</div>
              <div style={{ fontSize: 11 }}>Lani: {fmt(data.last_year.avg_order)}</div>
            </div>
            <div className="card" style={{ padding: '12px 14px', borderLeft: `3px solid ${data.changes.sales_diff >= 0 ? '#059669' : '#ef4444'}` }}>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>Razlika</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: data.changes.sales_diff >= 0 ? '#059669' : '#ef4444' }}>
                {data.changes.sales_diff >= 0 ? '+' : ''}{fmt(Math.abs(data.changes.sales_diff))}
              </div>
              <div style={{ fontSize: 11 }}>{arrow(data.changes.sales_pct)}</div>
            </div>
          </div>

          {/* Daily comparison chart */}
          <div className="card" style={{ padding: 16, marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>📊 Dnevna primerjava</div>
            <svg width="100%" height="140" viewBox={`0 0 ${data.current.daily.length * 30 + 60} 140`}>
              {(() => {
                const n = data.current.daily.length
                const w = n * 30 + 60; const h = 140; const pl = 45; const pr = 10; const pt = 10; const pb = 25
                const gw = w - pl - pr; const gh = h - pt - pb
                return (
                  <>
                    {[0, 0.25, 0.5, 0.75, 1].map(p => {
                      const y = pt + gh * (1 - p)
                      return <g key={p}>
                        <line x1={pl} y1={y} x2={w - pr} y2={y} stroke="var(--border)" strokeWidth="0.5" />
                        <text x={pl - 4} y={y + 3} textAnchor="end" fontSize="7" fill="var(--text2)">{(maxDaily * p).toFixed(0)}</text>
                      </g>
                    })}
                    {data.current.daily.map((d, i) => {
                      const x = pl + i * 30
                      const curH = (d.sales / maxDaily) * gh
                      const ly = data.last_year.daily[i]
                      const lyH = ly ? (ly.sales / maxDaily) * gh : 0
                      return (
                        <g key={d.date}>
                          <rect x={x} y={pt + gh - curH} width={10} height={Math.max(curH, 0)} fill="#059669" rx="2" opacity="0.8" />
                          <rect x={x + 12} y={pt + gh - lyH} width={10} height={Math.max(lyH, 0)} fill="#94a3b8" rx="2" opacity="0.6" />
                          {i % Math.max(1, Math.floor(n / 7)) === 0 && (
                            <text x={x + 11} y={h - 5} textAnchor="middle" fontSize="6" fill="var(--text2)">
                              {new Date(d.date + 'T00:00:00').toLocaleDateString('sl-SI', { day: 'numeric', month: 'short' })}
                            </text>
                          )}
                        </g>
                      )
                    })}
                    <text x={pl} y={10} fontSize="7" fill="#059669">Letos</text>
                    <text x={pl + 14} y={10} fontSize="7" fill="#94a3b8">Lani</text>
                  </>
                )
              })()}
            </svg>
          </div>

          {/* DOW comparison */}
          <div className="card" style={{ padding: 16, marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>📅 Po dnevih v tednu</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '4px 8px' }}>Dan</th>
                <th style={{ textAlign: 'right', padding: '4px 8px' }}>Letos</th>
                <th style={{ textAlign: 'right', padding: '4px 8px' }}>Lani</th>
                <th style={{ textAlign: 'right', padding: '4px 8px' }}>Sprememba</th>
              </tr></thead>
              <tbody>
                {data.current.dow.map((cd, i) => {
                  const ld = data.last_year.dow[i]
                  const change = ld && ld.count ? ((cd.count - ld.count) / ld.count) * 100 : 0
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '4px 8px', fontWeight: 600 }}>{cd.label}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right' }}>{cd.count}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', color: 'var(--text2)' }}>{ld?.count || 0}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', color: change >= 0 ? '#059669' : '#ef4444', fontWeight: 700 }}>
                        {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(0)}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}
