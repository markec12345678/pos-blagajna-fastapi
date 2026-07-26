import { useState, useEffect } from 'react'
import * as api from './api'

export default function RatingsV2Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'reviews' | 'analytics' | 'sentiment'>('reviews')
  const [reviews, setReviews] = useState<any>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [sentiment, setSentiment] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/ratings-v2/reviews', { headers: api.h() }).then(r => r.json()).then(setReviews),
      fetch('/api/v1/ratings-v2/analytics', { headers: api.h() }).then(r => r.json()).then(setAnalytics),
      fetch('/api/v1/ratings-v2/sentiment-trends', { headers: api.h() }).then(r => r.json()).then(setSentiment),
    ]).catch(() => onNotify('Napaka pri nalaganju')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'reviews', label: '⭐ Mnenja', count: reviews?.total || 0 },
    { key: 'analytics', label: '📊 Analitika' },
    { key: 'sentiment', label: '😊 Čustva' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm"><h2 className="page-title">⭐ Mnenja V2</h2></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>
            {t.label}{'count' in t && t.count !== undefined && <span style={{ marginLeft: 4, background: 'var(--primary)', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 11 }}>{t.count}</span>}
          </button>
        ))}
      </div>
      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'reviews' && reviews && (
            <div>
              {reviews.reviews?.map((r: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8, borderLeft: `4px solid ${r.sentiment === 'positive' ? '#22c55e' : r.sentiment === 'negative' ? '#ef4444' : '#f59e0b'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontWeight: 600 }}>{r.author} · {'⭐'.repeat(r.rating)}</div>
                    <span style={{ background: '#e5e7eb', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{r.platform}</span>
                  </div>
                  <div style={{ fontSize: 13, marginBottom: 6 }}>{r.text}</div>
                  {r.responded ? (
                    <div style={{ background: '#f0fdf4', padding: 8, borderRadius: 6, fontSize: 12, color: '#16a34a' }}>💬 {r.response}</div>
                  ) : (
                    <div style={{ fontSize: 12, color: '#f59e0b' }}>⏳ Čaka na odgovor</div>
                  )}
                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{r.date}</div>
                </div>
              ))}
            </div>
          )}
          {tab === 'analytics' && analytics && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Povp. ocena', value: `${analytics.avg_rating}/5`, color: '#f59e0b' },
                  { label: 'Mnenj', value: analytics.total_reviews, color: '#3b82f6' },
                  { label: 'NPS', value: analytics.nps_score, color: '#22c55e' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <h4 style={{ margin: '0 0 8px' }}>Po platformi</h4>
              {analytics.by_platform?.map((p: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>{p.platform}</span>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                    <span>{p.count} mnenj</span>
                    <span>⭐ {p.avg_rating}</span>
                    <span>{p.response_rate}% odgovorov</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'sentiment' && sentiment && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Pozitivno', value: `${sentiment.sentiment?.positive}%`, color: '#22c55e' },
                  { label: 'Nevtralno', value: `${sentiment.sentiment?.neutral}%`, color: '#f59e0b' },
                  { label: 'Negativno', value: `${sentiment.sentiment?.negative}%`, color: '#ef4444' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#888' }}>Trend</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: sentiment.trend === 'increasing' ? '#22c55e' : '#ef4444' }}>{sentiment.trend === 'increasing' ? '📈 Rastoč' : '📉 Padajoč'}</div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}