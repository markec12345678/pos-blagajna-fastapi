import { useState, useEffect } from 'react'

interface Feedback {
  id: number; score: number; comment: string; name: string;
  food_quality: number; service_quality: number; created_at: string
}

export default function FeedbackPanel({ onNotify }: { onNotify: (msg: string) => void }) {
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(7)

  const headers = { ...JSON.parse(localStorage.getItem('auth') || '{}').headers }

  useEffect(() => { loadData() }, [days])

  const loadData = async () => {
    setLoading(true)
    try {
      const [fbR, stR] = await Promise.all([
        fetch(`/api/v1/feedback/analytics?days=${days}`, { headers }).then(r => r.json()),
        fetch(`/api/v1/feedback-qr/stats?days=${days}`, { headers }).then(r => r.json()),
      ])
      setFeedback(fbR.recent_comments || [])
      setStats(stR)
    } catch { onNotify('Napaka') }
    setLoading(false)
  }

  if (loading) return <div style={{ padding: 20, textAlign: 'center' }}>⏳</div>

  return (
    <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14 }}>💬 Zadnje ocene</h3>
        <select className="input" value={days} onChange={e => setDays(parseInt(e.target.value))} style={{ width: 80, fontSize: 11 }}>
          <option value={7}>7 dni</option>
          <option value={30}>30 dni</option>
        </select>
      </div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          <div style={{ textAlign: 'center', padding: 8, background: '#f3f4f6', borderRadius: 8 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#f59e0b' }}>⭐ {stats.average || 0}</div>
            <div style={{ fontSize: 10, color: '#888' }}>{stats.total} ocen</div>
          </div>
          <div style={{ textAlign: 'center', padding: 8, background: '#f3f4f6', borderRadius: 8 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: stats.nps >= 0 ? '#22c55e' : '#ef4444' }}>
              {stats.nps || 0}
            </div>
            <div style={{ fontSize: 10, color: '#888' }}>NPS</div>
          </div>
        </div>
      )}

      {feedback.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 20, color: '#888', fontSize: 13 }}>Ni novih ocen</div>
      ) : (
        <div style={{ display: 'grid', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
          {feedback.slice(0, 5).map(f => (
            <div key={f.id} style={{
              padding: 8, borderRadius: 8, borderLeft: `3px solid ${f.score >= 4 ? '#22c55e' : f.score >= 3 ? '#f59e0b' : '#ef4444'}`,
              background: '#fafafa'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 12 }}>{f.name || 'Anonimno'}</span>
                <span style={{ fontSize: 12 }}>{'⭐'.repeat(f.score)}</span>
              </div>
              {f.comment && <div style={{ fontSize: 11, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.comment}</div>}
              <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>
                {new Date(f.created_at).toLocaleDateString('sl-SI')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
