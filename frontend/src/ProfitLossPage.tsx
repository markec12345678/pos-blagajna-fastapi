import { useState, useEffect } from 'react'

interface PLSummary {
  revenue: number; cogs: number; gross_profit: number; gross_margin_pct: number;
  labor_cost: number; labor_hours: number; operating_expenses: number;
  net_profit: number; net_margin_pct: number;
  order_count: number; avg_order_value: number; cogs_pct: number; labor_pct: number;
  categories: { name: string; revenue: number; cogs: number; margin_pct: number }[]
}

interface PLData {
  current: PLSummary; previous: PLSummary | null;
  daily: { date: string; revenue: number; cogs: number; gross_profit: number; labor_cost: number; operating_expenses: number; net_profit: number }[];
  date_from: string; date_to: string; days: number
}

export default function ProfitLossPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [data, setData] = useState<PLData | null>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState('this-month')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [chartMode, setChartMode] = useState<'revenue' | 'profit'>('revenue')

  const presets: Record<string, { label: string; fn: () => [string, string] }> = {
    'this-month': { label: 'Ta mesec', fn: () => {
      const n = new Date(); const f = new Date(n.getFullYear(), n.getMonth(), 1)
      return [f.toISOString().slice(0, 10), n.toISOString().slice(0, 10)]
    }},
    'last-month': { label: 'Prejšnji mesec', fn: () => {
      const n = new Date(); const f = new Date(n.getFullYear(), n.getMonth() - 1, 1)
      const t = new Date(n.getFullYear(), n.getMonth(), 0)
      return [f.toISOString().slice(0, 10), t.toISOString().slice(0, 10)]
    }},
    'this-quarter': { label: 'To četrtletje', fn: () => {
      const n = new Date(); const q = Math.floor(n.getMonth() / 3) * 3
      const f = new Date(n.getFullYear(), q, 1)
      return [f.toISOString().slice(0, 10), n.toISOString().slice(0, 10)]
    }},
    'last-7': { label: 'Zadnjih 7 dni', fn: () => {
      const n = new Date(); const f = new Date(n); f.setDate(f.getDate() - 6)
      return [f.toISOString().slice(0, 10), n.toISOString().slice(0, 10)]
    }},
    'last-30': { label: 'Zadnjih 30 dni', fn: () => {
      const n = new Date(); const f = new Date(n); f.setDate(f.getDate() - 29)
      return [f.toISOString().slice(0, 10), n.toISOString().slice(0, 10)]
    }},
    'custom': { label: 'Po meri', fn: () => [dateFrom || '2026-01-01', dateTo || new Date().toISOString().slice(0, 10)] }
  }

  const load = () => {
    const [f, t] = presets[range]?.fn() || ['', '']
    const df = range === 'custom' ? (dateFrom || '2026-01-01') : f
    const dt = range === 'custom' ? (dateTo || new Date().toISOString().slice(0, 10)) : t
    setLoading(true)
    fetch(`/api/v1/analytics/profit-loss?date_from=${df}&date_to=${dt}`, {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
    }).then(r => r.json()).then(d => {
      setData(d); setLoading(false)
    }).catch(() => { setLoading(false); onNotify('Napaka pri nalaganju P&L') })
  }

  useEffect(load, [range])

  const fmt = (n: number) => n.toFixed(2) + ' €'
  const arrow = (cur: number, prev?: number) => {
    if (prev === undefined || prev === 0) return null
    const pct = ((cur - prev) / prev) * 100
    return (
      <span style={{ fontSize: 11, color: pct >= 0 ? '#059669' : '#ef4444', marginLeft: 4 }}>
        {pct >= 0 ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
      </span>
    )
  }

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">📊 Bilanca uspeha (P&L)</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="input" value={range} onChange={e => setRange(e.target.value)} style={{ width: 140, fontSize: 12 }}>
            {Object.entries(presets).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {range === 'custom' && (
            <>
              <input className="input" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: 120, fontSize: 12 }} />
              <input className="input" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: 120, fontSize: 12 }} />
            </>
          )}
          <button onClick={load} className="btn btn-sm btn-primary" disabled={loading}>Osveži</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>⏳ Nalaganje...</div>
      ) : data ? (
        <div>
          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
            <div className="card" style={{ padding: '12px 14px', borderLeft: '3px solid #059669' }}>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>Prihodki</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#059669' }}>{fmt(data.current.revenue)}</div>
              {data.previous && <div style={{ fontSize: 11 }}>{fmt(data.previous.revenue)} {arrow(data.current.revenue, data.previous.revenue)}</div>}
            </div>
            <div className="card" style={{ padding: '12px 14px', borderLeft: '3px solid #ef4444' }}>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>Stroški blaga</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#ef4444' }}>{fmt(data.current.cogs)}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{data.current.cogs_pct}% prihodkov</div>
            </div>
            <div className="card" style={{ padding: '12px 14px', borderLeft: '3px solid #f59e0b' }}>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>Bruto dobiček</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b' }}>{fmt(data.current.gross_profit)}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Marža: {data.current.gross_margin_pct}%</div>
            </div>
            <div className="card" style={{ padding: '12px 14px', borderLeft: '3px solid #3b82f6' }}>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>Stroški dela</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#3b82f6' }}>{fmt(data.current.labor_cost)}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{data.current.labor_hours}h • {data.current.labor_pct}%</div>
            </div>
            <div className="card" style={{ padding: '12px 14px', borderLeft: '3px solid #f97316' }}>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>Poslovni stroški</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#f97316' }}>{fmt(data.current.operating_expenses)}</div>
            </div>
            <div className="card" style={{ padding: '12px 14px', borderLeft: '3px solid #8b5cf6' }}>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>Čisti dobiček</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: data.current.net_profit >= 0 ? '#059669' : '#ef4444' }}>{fmt(data.current.net_profit)}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Marža: {data.current.net_margin_pct}%</div>
            </div>
          </div>

          {/* Cost breakdown donut */}
          <div className="card" style={{ padding: 16, marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>🧩 Struktura stroškov</div>
            {data.current.revenue > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                <svg width="160" height="160" viewBox="0 0 160 160">
                  {(() => {
                    const total = data.current.revenue
                    const cogsPct = (data.current.cogs / total) * 100
                    const laborPct = (data.current.labor_cost / total) * 100
                    const opExPct = (data.current.operating_expenses / total) * 100
                    const profitPct = 100 - cogsPct - laborPct - opExPct
                    const r = 60; const cx = 80; const cy = 80
                    const arc = (pct: number, offset: number, color: string) => {
                      const angle = (pct / 100) * 360
                      if (angle <= 0) return null
                      const start = ((offset / 100) * 360 - 90) * Math.PI / 180
                      const end = (((offset + pct) / 100) * 360 - 90) * Math.PI / 180
                      const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start)
                      const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end)
                      const large = angle > 180 ? 1 : 0
                      return <path d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`} fill={color} />
                    }
                    return [arc(cogsPct, 0, '#ef4444'), arc(laborPct, cogsPct, '#3b82f6'), arc(opExPct, cogsPct + laborPct, '#f97316'), arc(Math.max(profitPct, 0), cogsPct + laborPct + opExPct, '#059669')]
                  })()}
                  <text x={80} y={76} textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--text)">{data.current.net_margin_pct}%</text>
                  <text x={80} y={92} textAnchor="middle" fontSize="8" fill="var(--text2)">čista marža</text>
                </svg>
                <div style={{ fontSize: 12, lineHeight: 1.8 }}>
                  <div><span style={{ display: 'inline-block', width: 10, height: 10, background: '#ef4444', borderRadius: 2, marginRight: 6 }} />COGS: {data.current.cogs_pct}%</div>
                  <div><span style={{ display: 'inline-block', width: 10, height: 10, background: '#3b82f6', borderRadius: 2, marginRight: 6 }} />Delo: {data.current.labor_pct}%</div>
                  <div><span style={{ display: 'inline-block', width: 10, height: 10, background: '#f97316', borderRadius: 2, marginRight: 6 }} />Obrat.: {((data.current.operating_expenses / data.current.revenue) * 100).toFixed(1)}%</div>
                  <div><span style={{ display: 'inline-block', width: 10, height: 10, background: '#059669', borderRadius: 2, marginRight: 6 }} />Dobiček: {Math.max(0, 100 - data.current.cogs_pct - data.current.labor_pct - ((data.current.operating_expenses / data.current.revenue) * 100)).toFixed(1)}%</div>
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.8, color: 'var(--text2)' }}>
                  <div>📦 Naročil: {data.current.order_count}</div>
                  <div>💰 Povprečje: {fmt(data.current.avg_order_value)}</div>
                </div>
              </div>
            )}
          </div>

          {/* Daily trend */}
          {data.daily.length > 0 && (
            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>📈 Dnevni trend</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setChartMode('revenue')} className={`btn btn-xs ${chartMode === 'revenue' ? 'btn-primary' : 'btn-ghost'}`}>Prihodki</button>
                  <button onClick={() => setChartMode('profit')} className={`btn btn-xs ${chartMode === 'profit' ? 'btn-primary' : 'btn-ghost'}`}>Dobiček</button>
                </div>
              </div>
              <svg width="100%" height="140" viewBox={`0 0 ${data.daily.length * 40 + 40} 140`} style={{ display: 'block' }}>
                {(() => {
                  const w = data.daily.length * 40 + 40; const h = 140; const pad = { t: 10, b: 25, l: 50, r: 10 }
                  const gw = w - pad.l - pad.r; const gh = h - pad.t - pad.b
                  const values = data.daily.map(d => chartMode === 'revenue' ? d.revenue : d.net_profit)
                  const maxV = Math.max(...values, 1)
                  const minV = Math.min(...values, 0)
                  const rangeV = maxV - minV || 1
                  return (
                    <>
                      {[0, 0.25, 0.5, 0.75, 1].map(pct => {
                        const y = pad.t + gh * (1 - pct)
                        return <g key={pct}>
                          <line x1={pad.l} y1={y} x2={w - pad.r} y2={y} stroke="var(--border)" strokeWidth="0.5" />
                          <text x={pad.l - 4} y={y + 3} textAnchor="end" fontSize="8" fill="var(--text2)">
                            {(maxV - rangeV * pct).toFixed(0)} €
                          </text>
                        </g>
                      })}
                      {data.daily.map((d, i) => {
                        const x = pad.l + i * 40 + 10
                        const barW = 20
                        const v = chartMode === 'revenue' ? d.revenue : d.net_profit
                        const barH = ((v - minV) / rangeV) * gh
                        const color = chartMode === 'revenue' ? '#059669' : (v >= 0 ? '#059669' : '#ef4444')
                        return <g key={d.date}>
                          <rect x={x} y={pad.t + gh - barH} width={barW} height={Math.max(barH, 0)} fill={color} rx="2" opacity="0.8" />
                          {i % Math.max(1, Math.floor(data.daily.length / 7)) === 0 && (
                            <text x={x + barW / 2} y={h - 4} textAnchor="middle" fontSize="7" fill="var(--text2)">
                              {new Date(d.date + 'T00:00:00').toLocaleDateString('sl-SI', { day: 'numeric', month: 'short' })}
                            </text>
                          )}
                        </g>
                      })}
                    </>
                  )
                })()}
              </svg>
            </div>
          )}

          {/* Category breakdown */}
          {data.current.categories.length > 0 && (
            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>📂 Po kategorijah</div>
              {(() => {
                const maxRev = Math.max(...data.current.categories.map(c => c.revenue), 1)
                return <div style={{ fontSize: 12 }}>
                  {data.current.categories.map(c => (
                    <div key={c.name} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontWeight: 600 }}>{c.name}</span>
                        <span>{fmt(c.revenue)} — marža <span style={{ color: c.margin_pct >= 50 ? '#059669' : c.margin_pct >= 30 ? '#f59e0b' : '#ef4444', fontWeight: 700 }}>{c.margin_pct}%</span></span>
                      </div>
                      <div style={{ background: 'var(--bg2)', borderRadius: 4, height: 16, overflow: 'hidden', display: 'flex' }}>
                        <div style={{ width: `${(c.revenue / maxRev) * 100}%`, background: '#059669', height: '100%', transition: 'width 0.3s' }} />
                        <div style={{ width: `${(c.cogs / maxRev) * 100}%`, background: '#ef4444', height: '100%', opacity: 0.7, transition: 'width 0.3s' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text2)' }}>
                        <span>🟢 Prihodki</span>
                        <span>🔴 COGS: {fmt(c.cogs)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              })()}
            </div>
          )}

          {/* Previous period comparison table */}
          {data.previous && (
            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>📊 Primerjava s prejšnjim obdobjem</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>Kazalnik</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px' }}>Prejšnje</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px' }}>Trenutno</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px' }}>Sprememba</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Prihodki', cur: data.current.revenue, prev: data.previous.revenue, fmt: fmt },
                    { label: 'COGS', cur: data.current.cogs, prev: data.previous.cogs, fmt: fmt },
                    { label: 'Bruto dobiček', cur: data.current.gross_profit, prev: data.previous.gross_profit, fmt: fmt },
                    { label: 'Bruto marža', cur: data.current.gross_margin_pct, prev: data.previous.gross_margin_pct, fmt: (n: number) => n + '%' },
                    { label: 'Stroški dela', cur: data.current.labor_cost, prev: data.previous.labor_cost, fmt: fmt },
                    { label: 'Poslovni stroški', cur: data.current.operating_expenses, prev: data.previous.operating_expenses, fmt: fmt },
                    { label: 'Čisti dobiček', cur: data.current.net_profit, prev: data.previous.net_profit, fmt: fmt },
                    { label: 'Čista marža', cur: data.current.net_margin_pct, prev: data.previous.net_margin_pct, fmt: (n: number) => n + '%' },
                    { label: 'Št. naročil', cur: data.current.order_count, prev: data.previous.order_count, fmt: (n: number) => String(n) },
                  ].map((r, i) => {
                    const change = r.prev ? ((r.cur - r.prev) / r.prev) * 100 : 0
                    const isGood = (r.label === 'COGS' || r.label === 'Stroški dela' || r.label === 'Poslovni stroški') ? change <= 0 : change >= 0
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '6px 8px', fontWeight: 600 }}>{r.label}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--text2)' }}>{r.fmt(r.prev)}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>{r.fmt(r.cur)}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', color: isGood ? '#059669' : '#ef4444', fontWeight: 600 }}>
                          {change > 0 ? '▲' : change < 0 ? '▼' : '—'} {Math.abs(change).toFixed(1)}%
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {data.current.order_count === 0 && (
            <div className="card" style={{ padding: 20, textAlign: 'center', color: 'var(--text2)' }}>
              Ni podatkov za izbrano obdobje
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
