import { useState, useEffect } from 'react'
import * as api from './api'

interface Analytics {
  total: number; average: number;
  sentiment_breakdown: { positive: number; neutral: number; negative: number; positive_pct: number; negative_pct: number };
  nps_score: number; nps_label: string;
  avg_food: number; avg_service: number; avg_ambiance: number;
  trends: { date: string; count: number; avg_score: number }[];
  top_keywords: { word: string; count: number }[];
  weekly_sentiment: { week: string; positive: number; neutral: number; negative: number; total: number }[];
  recent_comments: { id: number; name: string; score: number; comment: string; sentiment: string; date: string | null }[];
}

const SENTIMENT_ICONS: Record<string, string> = { positive: '😊', neutral: '😐', negative: '😞' }
const SENTIMENT_COLORS: Record<string, string> = { positive: '#22c55e', neutral: '#f59e0b', negative: '#ef4444' }

export default function FeedbackAnalyticsPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)
  const [tab, setTab] = useState<'overview' | 'comments' | 'trends'>('overview')

  useEffect(() => { loadData() }, [days])

  const loadData = async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/v1/feedback/analytics?days=${days}`, { headers: api.authHeader() }).then(r => r.json())
      setData(r)
    } catch { onNotify('Napaka pri nalaganju') }
    setLoading(false)
  }

  if (loading || !data) return <div style={{ padding: 40, textAlign: 'center' }}>⏳ Nalaganje...</div>

  const maxTrend = Math.max(...data.trends.map(t => t.count), 1)

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>💬 Analitika povratnih informacij</h2>
        <select className="input" value={days} onChange={e => setDays(parseInt(e.target.value))} style={{ width: 120, fontSize: 12 }}>
          <option value={7}>7 dni</option>
          <option value={30}>30 dni</option>
          <option value={90}>90 dni</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
        {[
          { icon: '⭐', value: data.average.toFixed(1), label: `Povprečje (${data.total})`, color: '#f59e0b' },
          { icon: '🎯', value: `${data.nps_score}`, label: `NPS ${data.nps_label}`, color: data.nps_score > 0 ? '#22c55e' : '#ef4444' },
          { icon: '😊', value: `${data.sentiment_breakdown.positive_pct}%`, label: 'Pozitivnih', color: '#22c55e' },
          { icon: '😞', value: `${data.sentiment_breakdown.negative_pct}%`, label: 'Negativnih', color: '#ef4444' },
          { icon: '🍽️', value: data.avg_food.toFixed(1), label: 'Hrana', color: '#3b82f6' },
          { icon: '🧑‍🍳', value: data.avg_service.toFixed(1), label: 'Storitev', color: '#8b5cf6' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 14, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
            <div style={{ fontSize: 24 }}>{s.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#888' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {([
          { key: 'overview', label: '📊 Pregled' },
          { key: 'comments', label: '💬 Komentarji' },
          { key: 'trends', label: '📈 Trendi' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div>
          {data.trends.length > 0 && (
            <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <h3 style={{ marginTop: 0 }}>📈 Dnevni trend ocen</h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 120 }}>
                {data.trends.map((t, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                    <div style={{ fontSize: 8, color: '#888' }}>{t.avg_score}</div>
                    <div style={{
                      width: '100%', maxWidth: 20, borderRadius: 3,
                      height: `${Math.max(4, (t.count / maxTrend) * 100)}%`,
                      background: t.avg_score >= 4 ? '#22c55e' : t.avg_score >= 3 ? '#f59e0b' : '#ef4444',
                      opacity: 0.7
                    }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.top_keywords.length > 0 && (
            <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 16 }}>
              <h3 style={{ marginTop: 0 }}>🏷️ Pogoste besede</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {data.top_keywords.map((k, i) => (
                  <span key={i} style={{
                    padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 500,
                    background: `hsl(${i * 25}, 60%, 92%)`, color: `hsl(${i * 25}, 60%, 35%)`
                  }}>
                    {k.word} ({k.count})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'comments' && (
        <div style={{ display: 'grid', gap: 8 }}>
          {data.recent_comments.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>Ni komentarjev</div>
          ) : data.recent_comments.map(c => (
            <div key={c.id} style={{
              background: 'var(--card, #fff)', borderRadius: 10, padding: 14,
              borderLeft: `4px solid ${SENTIMENT_COLORS[c.sentiment]}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>{SENTIMENT_ICONS[c.sentiment]}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name || 'Anonimno'}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>
                      {'⭐'.repeat(c.score)} • {c.date ? new Date(c.date).toLocaleDateString('sl-SI') : ''}
                    </div>
                  </div>
                </div>
                <span style={{
                  padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600,
                  background: `${SENTIMENT_COLORS[c.sentiment]}20`, color: SENTIMENT_COLORS[c.sentiment]
                }}>
                  {c.sentiment === 'positive' ? 'Pozitivno' : c.sentiment === 'negative' ? 'Negativno' : 'Nevtralno'}
                </span>
              </div>
              <div style={{ fontSize: 13, color: '#444' }}>{c.comment}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'trends' && (
        <div>
          {data.weekly_sentiment.length > 0 && (
            <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 16 }}>
              <h3 style={{ marginTop: 0 }}>📊 Tedenski sentiment</h3>
              <div style={{ display: 'grid', gap: 6 }}>
                {data.weekly_sentiment.map((w, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#888', width: 60 }}>{w.week}</span>
                    <div style={{ flex: 1, height: 20, borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
                      {w.total > 0 && (
                        <>
                          <div style={{ width: `${(w.positive / w.total) * 100}%`, background: '#22c55e' }} />
                          <div style={{ width: `${(w.neutral / w.total) * 100}%`, background: '#f59e0b' }} />
                          <div style={{ width: `${(w.negative / w.total) * 100}%`, background: '#ef4444' }} />
                        </>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: '#888', width: 30 }}>{w.total}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11 }}>
                <span>😊 Pozitivno</span> <span>😐 Nevtralno</span> <span>😞 Negativno</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
