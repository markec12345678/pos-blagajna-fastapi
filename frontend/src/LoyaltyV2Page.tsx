import { useState, useEffect } from 'react'
import * as api from './api'

export default function LoyaltyV2Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'tiers' | 'rewards' | 'leaderboard' | 'challenges' | 'analytics'>('tiers')
  const [tiers, setTiers] = useState<any>(null)
  const [rewards, setRewards] = useState<any>(null)
  const [leaderboard, setLeaderboard] = useState<any>(null)
  const [challenges, setChallenges] = useState<any>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/loyalty-v2/tiers', { headers: api.h() }).then(r => r.json()).then(setTiers),
      fetch('/api/v1/loyalty-v2/rewards', { headers: api.h() }).then(r => r.json()).then(setRewards),
      fetch('/api/v1/loyalty-v2/leaderboard', { headers: api.h() }).then(r => r.json()).then(setLeaderboard),
      fetch('/api/v1/loyalty-v2/challenges', { headers: api.h() }).then(r => r.json()).then(setChallenges),
      fetch('/api/v1/loyalty-v2/analytics', { headers: api.h() }).then(r => r.json()).then(setAnalytics),
    ]).catch(() => onNotify('Napaka pri nalaganju')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'tiers', label: '🏆 Stopnje' },
    { key: 'rewards', label: '🎁 Nagrade', count: rewards?.total_rewards || 0 },
    { key: 'leaderboard', label: '🥇 Lestvica' },
    { key: 'challenges', label: '🎯 Izzivi', count: challenges?.active_challenges || 0 },
    { key: 'analytics', label: '📊 Analitika' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">🏆 Zvestoba V2</h2>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>
            {t.label}{'count' in t && t.count !== undefined && <span style={{ marginLeft: 4, background: 'var(--primary)', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 11 }}>{t.count}</span>}
          </button>
        ))}
      </div>

      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'tiers' && tiers && (
            <div>
              {tiers.tiers?.map((t: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8, borderLeft: `4px solid ${t.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>{t.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#888', fontSize: 12 }}>{t.members} članov</span>
                      <span style={{ background: t.color, color: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>{t.discount}% popust</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Min. točk: {t.min_points}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {t.benefits?.map((b: string, j: number) => (
                      <span key={j} style={{ background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: 8, fontSize: 11 }}>✓ {b}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'rewards' && rewards && (
            <div>
              {rewards.rewards?.map((r: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{r.category} · {r.redemptions} unovčitev</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: '#f59e0b' }}>{r.points} točk</div>
                    <div style={{ fontSize: 11, color: '#888' }}>Zaloga: {r.stock}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'leaderboard' && leaderboard && (
            <div>
              {leaderboard.leaderboard?.map((l: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 20, fontWeight: 700, color: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7f32' : '#6b7280' }}>#{l.rank}</span>
                    <div>
                      <div style={{ fontWeight: 600 }}>{l.name}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{l.tier} · {l.visits} obiskov</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{l.points} točk</div>
                </div>
              ))}
            </div>
          )}

          {tab === 'challenges' && challenges && (
            <div>
              {challenges.challenges?.map((c: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <span style={{ background: '#f59e0b', color: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>{c.reward} točk</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>{c.description}</div>
                  <div style={{ background: '#e5e7eb', borderRadius: 6, height: 8, marginBottom: 4 }}>
                    <div style={{ background: '#22c55e', height: '100%', borderRadius: 6, width: `${(c.progress / c.target) * 100}%` }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666' }}>
                    <span>{c.progress}/{c.target}</span>
                    <span>Poteče: {c.expires}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'analytics' && analytics && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Člani', value: analytics.total_members || 0, color: '#3b82f6' },
                  { label: 'Aktivni', value: analytics.active_members || 0, color: '#22c55e' },
                  { label: 'Stopnja unovčitve', value: `${analytics.redemption_rate || 0}%`, color: '#f59e0b' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {analytics.tier_distribution?.map((t: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{t.tier}</span>
                    <span>{t.members} ({t.percentage}%)</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: 4, height: 6 }}>
                    <div style={{ background: '#3b82f6', height: '100%', borderRadius: 4, width: `${t.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}