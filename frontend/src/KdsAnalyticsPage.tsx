import { useState, useEffect } from 'react'

const API = '/api/v1/kds/analytics'
const auth = () => ({ 'Authorization': 'Bearer ' + localStorage.getItem('pos_token') })

export default function KdsAnalyticsPage({ onNotify }: { onNotify: (m: string) => void }) {
  const [data, setData] = useState<any>(null)
  const [days, setDays] = useState(7)

  useEffect(() => {
    fetch(`${API}?days=${days}`, { headers: auth() })
      .then(r => r.json()).then(setData).catch(() => {})
  }, [days])

  if (!data) return <div className="page"><p>Nalaganje...</p></div>

  const bar = (val: number, max: number) => ({
    width: `${Math.max(4, (val / (max || 1)) * 100)}%`,
    background: val > (max * 0.7) ? 'var(--red)' : val > (max * 0.4) ? 'var(--amber)' : 'var(--green)',
    height: 20, borderRadius: 4, minWidth: 20,
    display: 'flex', alignItems: 'center', paddingLeft: 6,
    fontSize: 11, fontWeight: 600, color: '#fff',
  })

  return (
    <div className="page">
      <div className="page-header">
        <h2>⏱️ KDS Analytics — čas priprave</h2>
        <select className="input" value={days} onChange={e => setDays(parseInt(e.target.value))} style={{ width: 120 }}>
          <option value={1}>Zadnji 1 dan</option>
          <option value={7}>Zadnjih 7 dni</option>
          <option value={30}>Zadnjih 30 dni</option>
          <option value={90}>Zadnjih 90 dni</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="stat-card" style={{ borderLeft: '3px solid var(--blue)', flex: 1 }}>
          <div className="stat-value">{data.total_items}</div>
          <div className="stat-label">Postavk</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '3px solid var(--green)', flex: 1 }}>
          <div className="stat-value">{data.avg_prep_time} min</div>
          <div className="stat-label">Povprečen čas priprave</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 2, minWidth: 300 }}>
          <h4 style={{ marginBottom: 8 }}>⏳ Najpočasnejši artikli</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {data.by_item?.map((i: any) => (
              <div key={i.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                  <span>{i.name}</span>
                  <span style={{ fontWeight: 600 }}>{i.avg_min} min ({i.count}x)</span>
                </div>
                <div style={{ background: 'var(--bg3)', borderRadius: 4 }}>
                  <div style={bar(i.avg_min, data.by_item[0]?.avg_min || 1)} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 250, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <h4 style={{ marginBottom: 8 }}>📊 Po kategoriji</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {data.by_course?.map((c: any) => (
                <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span>{c.name}</span>
                  <span style={{ fontWeight: 600 }}>{c.avg_min} min</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h4 style={{ marginBottom: 8 }}>🕐 Po uri dneva</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {data.by_hour?.map((h: any) => (
                <div key={h.hour} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span>{h.hour}</span>
                  <span style={{ fontWeight: 600 }}>{h.avg_min} min ({h.count})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
