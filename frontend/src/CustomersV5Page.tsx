import { useState, useEffect } from 'react'

interface Journey { customer_id: number; name: string; stages: Array<{ stage: string; date: string; channel: string; action: string; spent?: number }>; current_stage: string; lifetime_value: number; visit_count: number }
interface CLVSegment { segment: string; count: number; avg_clv: number; avg_monthly: number; retention: number; acquisition_cost: number }
interface SentimentTopic { topic: string; positive: number; negative: number; neutral: number; trend: string }
interface ChurnCustomer { customer_id: number; name: string; last_visit: string; churn_probability: number; predicted_churn: string; value: number; intervention: string }

export default function CustomersV5Page({ onNotify }: { onNotify?: (msg: string, err?: boolean) => void }) {
  const [tab, setTab] = useState<string>('journey')
  const [journeys, setJourneys] = useState<Journey[]>([])
  const [clvData, setClvData] = useState<{ segments: CLVSegment[]; total_clv: number; avg_clv: number } | null>(null)
  const [sentiment, setSentiment] = useState<any>(null)
  const [churn, setChurn] = useState<any>(null)
  const [segments, setSegments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [jRes, cRes, sRes, chRes, segRes] = await Promise.all([
        fetch('/api/v1/customers-v5/customer-journey').then(r => r.json()),
        fetch('/api/v1/customers-v5/customer-lifetime-value').then(r => r.json()),
        fetch('/api/v1/customers-v5/sentiment-analysis').then(r => r.json()),
        fetch('/api/v1/customers-v5/churn-prediction').then(r => r.json()),
        fetch('/api/v1/customers-v5/customer-segments-advanced').then(r => r.json()),
      ])
      setJourneys(jRes.journeys || [])
      setClvData(cRes.clv || null)
      setSentiment(sRes.sentiment || null)
      setChurn(chRes.churn || null)
      setSegments(segRes.segments || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const stageColor = (s: string) => s === 'Ambasador' ? '#8b5cf6' : s === 'Zvestoba' ? '#10b981' : s === 'Ponovitev' ? '#3b82f6' : s === 'Obisk' ? '#f59e0b' : '#6b7280'

  if (loading) return <div className="loading">Nalagam...</div>

  return (
    <div style={{ padding: '2rem' }}>
      <h1>👥 Stranke V5</h1>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {[
          { key: 'journey', label: '🗺️ Pot stranke' },
          { key: 'clv', label: '💎 Vrednost stranke' },
          { key: 'sentiment', label: '😊 Sentiment' },
          { key: 'churn', label: '⚠️ Odhod' },
          { key: 'segments', label: '📊 Segmentacija' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: tab === t.key ? '2px solid #2563eb' : '1px solid #d1d5db', background: tab === t.key ? '#dbeafe' : 'white', cursor: 'pointer', fontSize: '0.85rem' }}>{t.label}</button>
        ))}
      </div>

      {tab === 'journey' && (
        <div>
          <h2>Pot stranke</h2>
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {journeys.map(j => (
              <div key={j.customer_id} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div>
                    <strong>{j.name}</strong>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{j.visit_count} obiskov · €{j.lifetime_value} CLV</div>
                  </div>
                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.8rem', background: stageColor(j.current_stage) + '20', color: stageColor(j.current_stage), fontWeight: 600 }}>{j.current_stage}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', padding: '0.5rem 0' }}>
                  {j.stages.map((s, i) => (
                    <div key={i} style={{ minWidth: '140px', padding: '0.75rem', borderRadius: '8px', background: stageColor(s.stage) + '10', border: `1px solid ${stageColor(s.stage)}40`, textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: stageColor(s.stage) }}>{s.stage}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{s.date}</div>
                      <div style={{ fontSize: '0.75rem' }}>{s.action}</div>
                      {s.spent && <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>€{s.spent}</div>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'clv' && clvData && (
        <div>
          <h2>Vrednost stranke</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ background: '#d1fae5', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>€{clvData.total_clv.toLocaleString()}</div>
              <div>Skupaj CLV</div>
            </div>
            <div style={{ background: '#dbeafe', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>€{clvData.avg_clv}</div>
              <div>Povprečje</div>
            </div>
          </div>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {clvData.segments.map(s => (
              <div key={s.segment} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <strong>{s.segment}</strong>
                  <span>{s.count} strank</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <div>CLV: €{s.avg_clv.toLocaleString()}</div>
                  <div>Mesečno: €{s.avg_monthly}</div>
                  <div>Retencija: {s.retention}%</div>
                  <div>Pridobitev: €{s.acquisition_cost}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'sentiment' && sentiment && (
        <div>
          <h2>Analiza sentimenta</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
            <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3>Teme</h3>
              {sentiment.topics.map((t: SentimentTopic) => (
                <div key={t.topic} style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}><strong>{t.topic}</strong><span style={{ fontSize: '0.8rem' }}>{t.trend === 'up' ? '📈' : t.trend === 'down' ? '📉' : '➡️'}</span></div>
                  <div style={{ height: '12px', borderRadius: '6px', background: '#e5e7eb', display: 'flex', overflow: 'hidden' }}>
                    <div style={{ width: `${t.positive}%`, background: '#10b981' }} />
                    <div style={{ width: `${t.neutral}%`, background: '#6b7280' }} />
                    <div style={{ width: `${t.negative}%`, background: '#ef4444' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#6b7280', marginTop: '0.15rem' }}>
                    <span style={{ color: '#10b981' }}>+{t.positive}%</span>
                    <span>{t.neutral}%</span>
                    <span style={{ color: '#ef4444' }}>-{t.negative}%</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3>Zadnja mnenja</h3>
              {sentiment.recent_reviews.map((r: any, i: number) => (
                <div key={i} style={{ padding: '0.75rem', borderRadius: '8px', background: '#f9fafb', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <strong>{'⭐'.repeat(r.rating)}</strong>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{r.date} · {r.source}</span>
                  </div>
                  <div style={{ fontSize: '0.9rem' }}>{r.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'churn' && churn && (
        <div>
          <h2>Napoved odhoda</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ background: '#fef2f2', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#ef4444' }}>{churn.total_at_risk}</div>
              <div>Nevarnost odhoda</div>
            </div>
            <div style={{ background: '#fef3c7', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>€{churn.total_value_at_risk.toLocaleString()}</div>
              <div>Vrednost na kocki</div>
            </div>
            <div style={{ background: '#d1fae5', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{churn.prevention_success_rate}%</div>
              <div>Uspešnost preprečitve</div>
            </div>
          </div>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {churn.at_risk.map((c: ChurnCustomer) => (
              <div key={c.customer_id} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <strong>{c.name}</strong>
                  <span style={{ color: '#ef4444', fontWeight: 700 }}>{(c.churn_probability * 100).toFixed(0)}% tveganje</span>
                </div>
                <div style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>Zadnji obisk: {c.last_visit} · Vrednost: €{c.value}</div>
                <div style={{ fontSize: '0.85rem', color: '#f59e0b' }}>Intervencija: {c.intervention}</div>
                <div style={{ height: '8px', borderRadius: '4px', background: '#e5e7eb', marginTop: '0.5rem', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${c.churn_probability * 100}%`, background: '#ef4444', borderRadius: '4px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'segments' && (
        <div>
          <h2>Napredna segmentacija</h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {segments.map(s => (
              <div key={s.name} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <strong>{s.name} ({s.count} strank)</strong>
                  <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>{s.channels.join(', ')}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  <div>Povprečje: €{s.avg_spend}</div>
                  <div>Pogostost: {s.visit_freq}x/mesec</div>
                  <div>Retencija: {s.retention}%</div>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Kriteriji: {s.criteria.join(' · ')}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
