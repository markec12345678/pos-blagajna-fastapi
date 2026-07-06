import { useState, useEffect } from 'react'
import { LanguageToggle } from './LanguageToggle'

export default function ReviewWall() {
  const [reviews, setReviews] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [currentIdx, setCurrentIdx] = useState(0)

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch('/api/v1/ratings?days=90')
        if (r.ok) {
          const d = await r.json()
          setStats(d)
          const withComments = d.recent?.filter((r: any) => r.comment) || []
          setReviews(withComments.length > 0 ? withComments : d.recent || [])
        }
      } catch {}
    }
    load()
    const iv = setInterval(load, 60000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    if (!reviews.length) return
    const iv = setInterval(() => setCurrentIdx(p => (p + 1) % reviews.length), 5000)
    return () => clearInterval(iv)
  }, [reviews.length])

  const current = reviews[currentIdx]
  if (!stats) return <div style={{ height: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>Loading...</div>

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex', flexDirection: 'column', padding: 40, overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ position: 'relative', textAlign: 'center', marginBottom: 40 }}>
        <div style={{ position: 'absolute', right: 0, top: 0 }}>
          <LanguageToggle />
        </div>
        <div style={{ fontSize: 14, color: '#64748b', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 }}>
          Our Guests Say
        </div>
        <div style={{ fontSize: 48, fontWeight: 400 }}>⭐ {stats.average?.toFixed(1)}</div>
        <div style={{ fontSize: 16, color: '#94a3b8' }}>based on {stats.total} reviews</div>
      </div>

      {/* Stars */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 40 }}>
        {[5, 4, 3, 2, 1].map(s => (
          <div key={s} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24 }}>{'⭐'.repeat(s)}</div>
            <div style={{
              width: 80, height: 8, background: '#1e293b', borderRadius: 4, marginTop: 4, overflow: 'hidden'
            }}>
              <div style={{
                height: '100%', background: '#f59e0b', borderRadius: 4,
                width: `${((stats.distribution?.[s] || 0) / stats.total) * 100}%` || '0%',
                transition: 'width 0.5s'
              }} />
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{stats.distribution?.[s] || 0}</div>
          </div>
        ))}
      </div>

      {/* Animated Review Card */}
      {current && (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeSlideIn 4.5s ease-in-out'
        }}>
          <div style={{
            maxWidth: 700, textAlign: 'center',
            background: 'rgba(255,255,255,0.05)', borderRadius: 24,
            padding: '40px 48px', backdropFilter: 'blur(10px)'
          }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>
              {'⭐'.repeat(current.score)}{'☆'.repeat(5 - current.score)}
            </div>
            {current.comment && (
              <div style={{ fontSize: 26, lineHeight: 1.4, fontWeight: 300, fontStyle: 'italic', marginBottom: 16 }}>
                "{current.comment}"
              </div>
            )}
            <div style={{ fontSize: 16, color: '#94a3b8' }}>
              — {current.customer_name || 'Anonymous'}
            </div>
          </div>
        </div>
      )}

      {reviews.length === 0 && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 20 }}>
          No reviews yet. Be the first!
        </div>
      )}

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: '#334155' }}>
        Reviews update automatically
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          0% { opacity: 0; transform: translateY(20px); }
          15% { opacity: 1; transform: translateY(0); }
          85% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
      `}</style>
    </div>
  )
}
