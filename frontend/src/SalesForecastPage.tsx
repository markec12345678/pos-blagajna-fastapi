import { useState, useEffect } from 'react'

interface ForecastPoint { date: string; forecast: number; dow: number }
interface HistPoint { date: string; sales: number; dow: number }
interface MA7Point { date: string; ma7: number }
interface DOWAvg { dow: number; avg: number }

interface ForecastData {
  historical: HistPoint[]; ma7: MA7Point[]; forecast: ForecastPoint[];
  dow_averages: DOWAvg[]; slope: number;
  total_historical: number; total_forecast: number
}

const DOW_NAMES = ['Ned', 'Pon', 'Tor', 'Sre', 'Čet', 'Pet', 'Sob']

export default function SalesForecastPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [data, setData] = useState<ForecastData | null>(null)
  const [loading, setLoading] = useState(true)
  const [histDays, setHistDays] = useState(90)
  const [forecastDays, setForecastDays] = useState(14)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/v1/analytics/sales-forecast?days=${histDays}&forecast_days=${forecastDays}`, {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
    }).then(r => r.json()).then(d => { setData(d); setLoading(false) })
      .catch(() => { setLoading(false); onNotify('Napaka pri nalaganju napovedi') })
  }, [histDays, forecastDays])

  const maxVal = data ? Math.max(
    ...data.historical.map(h => h.sales),
    ...data.forecast.map(f => f.forecast),
    1
  ) : 1

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">🔮 Napoved prodaje</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="input" value={histDays} onChange={e => setHistDays(parseInt(e.target.value))} style={{ width: 110, fontSize: 12 }}>
            <option value={30}>30 dni zgod.</option>
            <option value={60}>60 dni</option>
            <option value={90}>90 dni</option>
            <option value={180}>180 dni</option>
          </select>
          <select className="input" value={forecastDays} onChange={e => setForecastDays(parseInt(e.target.value))} style={{ width: 110, fontSize: 12 }}>
            <option value={7}>7 dni naprej</option>
            <option value={14}>14 dni</option>
            <option value={30}>30 dni</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>⏳ Računam napoved...</div>
      ) : data ? (
        <div>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
            <div className="card" style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>Zgodovina ({histDays}d)</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#059669' }}>{data.total_historical.toFixed(2)} €</div>
            </div>
            <div className="card" style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>Napoved ({forecastDays}d)</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#3b82f6' }}>{data.total_forecast.toFixed(2)} €</div>
            </div>
            <div className="card" style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>Dnevni trend</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: data.slope >= 0 ? '#059669' : '#ef4444' }}>
                {data.slope >= 0 ? '▲' : '▼'} {Math.abs(data.slope).toFixed(2)} €/dan
              </div>
            </div>
          </div>

          {/* Combined chart */}
          <div className="card" style={{ padding: 16, marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>📈 Zgodovina + napoved</div>
            <div style={{ overflowX: 'auto' }}>
              <svg width={Math.max(data.historical.length * 4 + data.forecast.length * 4 + 80, 400)} height="200" viewBox={`0 0 ${Math.max(data.historical.length * 4 + data.forecast.length * 4 + 80, 400)} 200`}>
                {(() => {
                  const w = Math.max(data.historical.length * 4 + data.forecast.length * 4 + 80, 400)
                  const h = 200; const pl = 50; const pr = 10; const pt = 10; const pb = 25
                  const gw = w - pl - pr; const gh = h - pt - pb

                  // grid lines
                  const lines = []
                  for (let i = 0; i <= 4; i++) {
                    const y = pt + gh * (1 - i / 4)
                    lines.push(<line key={`g${i}`} x1={pl} y1={y} x2={w - pr} y2={y} stroke="var(--border)" strokeWidth="0.5" />)
                    lines.push(<text key={`gl${i}`} x={pl - 4} y={y + 3} textAnchor="end" fontSize="8" fill="var(--text2)">{(maxVal * i / 4).toFixed(0)}</text>)
                  }

                  // historical bars
                  const bars = data.historical.map((h, i) => {
                    const x = pl + i * 4
                    const bh = (h.sales / maxVal) * gh
                    return <rect key={`hb${i}`} x={x} y={pt + gh - bh} width={3} height={bh} fill="#059669" rx="1" opacity="0.6" />
                  })

                  // MA7 line
                  const maPoints = data.ma7.map((m, i) => {
                    const histIdx = data.historical.findIndex(h => h.date === m.date)
                    if (histIdx < 0) return null
                    const x = pl + histIdx * 4 + 1.5
                    const y = pt + gh - (m.ma7 / maxVal) * gh
                    return { x, y }
                  }).filter(p => p !== null) as { x: number; y: number }[]

                  let maPath = ''
                  maPoints.forEach((p, i) => {
                    maPath += i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`
                  })

                  // forecast bars
                  const fbarX = pl + data.historical.length * 4 + 8
                  const fbars = data.forecast.map((f, i) => {
                    const x = fbarX + i * 4
                    const bh = (f.forecast / maxVal) * gh
                    return <rect key={`fb${i}`} x={x} y={pt + gh - bh} width={3} height={bh} fill="#3b82f6" rx="1" opacity="0.8" />
                  })

                  // Separator line
                  const sepX = pl + data.historical.length * 4 + 4
                  const sep = <line key="sep" x1={sepX} y1={pt} x2={sepX} y2={pt + gh} stroke="#f59e0b" strokeWidth="1" strokeDasharray="3,2" />

                  // X-axis labels
                  const xlabels = []
                  for (let i = 0; i < data.historical.length; i += Math.max(1, Math.floor(data.historical.length / 10))) {
                    const hp = data.historical[i]
                    const x = pl + i * 4 + 1.5
                    xlabels.push(
                      <text key={`xl${i}`} x={x} y={pt + gh + 12} textAnchor="middle" fontSize="7" fill="var(--text2)">
                        {new Date(hp.date + 'T00:00:00').toLocaleDateString('sl-SI', { day: 'numeric', month: 'short' })}
                      </text>
                    )
                  }

                  return [...lines, ...bars, ...fbars, sep,
                    maPath ? <path key="ma" d={maPath} fill="none" stroke="#f59e0b" strokeWidth="1.5" /> : null,
                    ...xlabels,
                    <text key="histlab" x={pl} y={pt + gh + 22} fontSize="8" fill="#059669" fontWeight="600">Zgodovina</text>,
                    <text key="fclab" x={fbarX} y={pt + gh + 22} fontSize="8" fill="#3b82f6" fontWeight="600">Napoved</text>
                  ]
                })()}
              </svg>
            </div>
          </div>

          {/* DOW averages */}
          <div className="card" style={{ padding: 16, marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>📅 Povprečje po dnevih v tednu</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              {data.dow_averages.map((d, i) => {
                const maxDow = Math.max(...data.dow_averages.map(x => x.avg), 1)
                const pct = (d.avg / maxDow) * 100
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: d.dow >= 5 ? '#ef4444' : 'var(--text)' }}>{DOW_NAMES[d.dow]}</div>
                    <div style={{
                      width: '100%', maxWidth: 40, height: 80, background: 'var(--bg2)', borderRadius: 4, display: 'flex', alignItems: 'flex-end', overflow: 'hidden'
                    }}>
                      <div style={{ width: '100%', height: `${pct}%`, background: d.dow >= 5 ? '#ef4444' : '#3b82f6', borderRadius: 4, minHeight: 4, transition: 'height 0.3s' }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text2)' }}>{d.avg.toFixed(0)} €</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Forecast table */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>📋 Podrobna napoved</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '4px 8px' }}>Datum</th>
                <th style={{ textAlign: 'left', padding: '4px 8px' }}>Dan</th>
                <th style={{ textAlign: 'right', padding: '4px 8px' }}>Napoved</th>
              </tr></thead>
              <tbody>
                {data.forecast.map(f => (
                  <tr key={f.date} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '4px 8px' }}>{new Date(f.date + 'T00:00:00').toLocaleDateString('sl-SI')}</td>
                    <td style={{ padding: '4px 8px' }}>{DOW_NAMES[f.dow]}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, color: '#3b82f6' }}>{f.forecast.toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.historical.length === 0 && (
            <div className="card" style={{ padding: 20, textAlign: 'center', color: 'var(--text2)' }}>Ni dovolj podatkov za napoved</div>
          )}
        </div>
      ) : null}
    </div>
  )
}
