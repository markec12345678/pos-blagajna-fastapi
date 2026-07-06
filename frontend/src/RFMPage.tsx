import { useState, useEffect } from 'react'

interface RFMCustomer {
  customer_id: number; name: string; phone: string; email: string;
  recency: number; frequency: number; monetary: number; avg_order: number;
  r_score: number; f_score: number; m_score: number; rfm: string;
  segment: string; last_order: string; loyalty_points: number; is_member: boolean
}

interface RFMSegment {
  label: string; desc: string; count: number; total_spent: number; avg_recency: number
}

interface RFMData {
  segments: Record<string, RFMSegment>
  customers: RFMCustomer[]
  summary: { total_customers: number; total_spent: number; avg_frequency: number; avg_recency: number; avg_order_value: number }
}

const SEGMENT_ORDER = ['champions', 'loyal', 'potential', 'new', 'at_risk', 'need_attention', 'dormant', 'other']
const SEGMENT_COLORS: Record<string, string> = {
  champions: '#8b5cf6', loyal: '#059669', potential: '#3b82f6',
  new: '#22c55e', at_risk: '#f59e0b', need_attention: '#f97316', dormant: '#94a3b8', other: '#6b7280'
}

export default function RFMPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [data, setData] = useState<RFMData | null>(null)
  const [loading, setLoading] = useState(true)
  const [minOrders, setMinOrders] = useState(1)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/v1/analytics/customer-rfm?min_orders=${minOrders}`, {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
    }).then(r => r.json()).then(d => { setData(d); setLoading(false) })
      .catch(() => { setLoading(false); onNotify('Napaka pri RFM analizi') })
  }, [minOrders])

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">🎯 RFM analiza strank</h2>
        <select className="input" value={minOrders} onChange={e => setMinOrders(parseInt(e.target.value))} style={{ width: 110, fontSize: 12 }}>
          <option value={1}>Min. 1 naročilo</option>
          <option value={3}>Min. 3 naročila</option>
          <option value={5}>Min. 5 naročil</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>⏳ Nalaganje...</div>
      ) : data && data.customers.length === 0 ? (
        <div className="card" style={{ padding: 20, textAlign: 'center', color: 'var(--text2)' }}>Ni strank z ustreznim številom naročil</div>
      ) : data ? (
        <div>
          {/* Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 16 }}>
            <div className="card" style={{ padding: '10px 14px' }}>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>Strank</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{data.summary.total_customers}</div>
            </div>
            <div className="card" style={{ padding: '10px 14px' }}>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>Skupaj poraba</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#059669' }}>{data.summary.total_spent.toFixed(2)} €</div>
            </div>
            <div className="card" style={{ padding: '10px 14px' }}>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>Povprečna vrednost</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#3b82f6' }}>{data.summary.avg_order_value.toFixed(2)} €</div>
            </div>
            <div className="card" style={{ padding: '10px 14px' }}>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>Pogostost</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{data.summary.avg_frequency}x</div>
            </div>
            <div className="card" style={{ padding: '10px 14px' }}>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>Zadnji obisk</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{data.summary.avg_recency} dni</div>
            </div>
          </div>

          {/* Segment cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
            {SEGMENT_ORDER.filter(s => data.segments[s]).map(s => {
              const seg = data.segments[s]
              const maxCount = Math.max(...SEGMENT_ORDER.filter(x => data.segments[x]).map(x => data.segments[x].count), 1)
              return (
                <div key={s} className="card" style={{
                  padding: '12px', borderTop: `3px solid ${SEGMENT_COLORS[s] || '#6b7280'}`,
                  background: s === 'at_risk' || s === 'dormant' ? 'rgba(239,68,68,0.05)' : undefined
                }}>
                  <div style={{ fontSize: 18, marginBottom: 2 }}>{seg.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 6 }}>{seg.desc}</div>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{seg.count}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)' }}>{seg.avg_recency} dni • {seg.total_spent.toFixed(0)} €</div>
                  <div style={{ background: 'var(--bg2)', borderRadius: 4, height: 6, marginTop: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${(seg.count / maxCount) * 100}%`, height: '100%', background: SEGMENT_COLORS[s] || '#6b7280', borderRadius: 4 }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Customer table */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>📋 Seznam strank (razvrščeno po porabi)</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '4px 8px' }}>Stranka</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px' }}>R</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px' }}>F</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px' }}>M</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px' }}>Poraba</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px' }}>Naročil</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px' }}>Povprečje</th>
                  <th style={{ textAlign: 'left', padding: '4px 8px' }}>Segment</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px' }}>Zadnjič</th>
                </tr></thead>
                <tbody>
                  {data.customers.map(c => (
                    <tr key={c.customer_id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '4px 8px', fontWeight: 600 }}>{c.name}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                        <span style={{ color: c.r_score >= 4 ? '#059669' : c.r_score >= 3 ? '#f59e0b' : '#ef4444', fontWeight: 700 }}>{c.r_score}</span>
                      </td>
                      <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                        <span style={{ color: c.f_score >= 4 ? '#059669' : c.f_score >= 3 ? '#f59e0b' : '#ef4444', fontWeight: 700 }}>{c.f_score}</span>
                      </td>
                      <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                        <span style={{ color: c.m_score >= 4 ? '#059669' : c.m_score >= 3 ? '#f59e0b' : '#ef4444', fontWeight: 700 }}>{c.m_score}</span>
                      </td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600 }}>{c.monetary.toFixed(2)} €</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right' }}>{c.frequency}x</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right' }}>{c.avg_order.toFixed(2)} €</td>
                      <td style={{ padding: '4px 8px' }}>
                        <span className="badge" style={{ background: SEGMENT_COLORS[c.segment] || '#6b7280', color: '#fff', fontSize: 10 }}>
                          {data.segments[c.segment]?.label || c.segment}
                        </span>
                      </td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', fontSize: 10, color: 'var(--text2)' }}>
                        {c.recency > 90 ? `${Math.floor(c.recency / 30)}m` : `${c.recency}d`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
