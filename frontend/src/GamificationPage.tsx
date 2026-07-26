import { useState, useEffect } from 'react'
import * as api from './api'

interface Challenge {
  id: number; name: string; description: string; icon: string;
  target: number; metric: string; reward_points: number; reward_badge: string | null;
  valid_from: string | null; valid_to: string | null; is_active: boolean;
}
interface ChallengeProgress {
  challenge: Challenge;
  progress: { current: number; target: number; completed: boolean; rewarded: boolean; completed_at: string | null };
}
interface Badge { id: number; name: string; icon: string; description: string; earned_at: string | null }
interface LeaderboardEntry {
  rank: number; customer_id: number; name: string; points: number;
  total_spent: number; badges: number; streak: number; score: number;
}
interface Stats {
  active_challenges: number; total_badges_awarded: number;
  customers_with_streaks: number; challenges_completed: number;
}

const METRICS = [
  { value: 'orders', label: 'Naročila', label_en: 'Orders' },
  { value: 'spent', label: 'Poraba (€)', label_en: 'Spent (€)' },
  { value: 'visits', label: 'Obiski', label_en: 'Visits' },
  { value: 'items', label: 'Artikli', label_en: 'Items' },
  { value: 'categories', label: 'Kategorije', label_en: 'Categories' },
]

const BADGE_ICONS = ['🏅', '🥇', '🥈', '🥉', '⭐', '🎯', '🔥', '💎', '🍕', '🥩', '☕', '🍰', '👑', '🎖️', '🏆']

export default function GamificationPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [challenges, setChallenges] = useState<ChallengeProgress[]>([])
  const [badges, setBadges] = useState<Badge[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [tab, setTab] = useState<'challenges' | 'badges' | 'leaderboard' | 'manage'>('challenges')
  const [showCreate, setShowCreate] = useState(false)
  const [customerId, setCustomerId] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    name: '', description: '', icon: '🏆', target: 5, metric: 'orders',
    reward_points: 50, reward_badge: '', valid_from: '', valid_to: ''
  })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [statsRes, lbRes] = await Promise.all([
        fetch('/api/v1/gamification/stats', { headers: api.authHeader() }).then(r => r.json()),
        fetch('/api/v1/gamification/leaderboard', { headers: api.authHeader() }).then(r => r.json()),
      ])
      setStats(statsRes)
      setLeaderboard(lbRes)
      if (customerId > 0) {
        const [chRes, bdRes] = await Promise.all([
          fetch(`/api/v1/gamification/challenges/${customerId}/progress`, { headers: api.authHeader() }).then(r => r.json()),
          fetch(`/api/v1/gamification/badges/${customerId}`, { headers: api.authHeader() }).then(r => r.json()),
        ])
        setChallenges(chRes)
        setBadges(bdRes)
      } else {
        const chRes = await fetch('/api/v1/gamification/challenges', { headers: api.authHeader() }).then(r => r.json())
        setChallenges(chRes.map((c: Challenge) => ({ challenge: c, progress: { current: 0, target: c.target, completed: false, rewarded: false, completed_at: null } })))
      }
    } catch { onNotify('Napaka pri nalaganju') }
    setLoading(false)
  }

  const loadCustomerData = async (id: number) => {
    setCustomerId(id)
    if (id > 0) {
      const [chRes, bdRes] = await Promise.all([
        fetch(`/api/v1/gamification/challenges/${id}/progress`, { headers: api.authHeader() }).then(r => r.json()),
        fetch(`/api/v1/gamification/badges/${id}`, { headers: api.authHeader() }).then(r => r.json()),
      ])
      setChallenges(chRes)
      setBadges(bdRes)
    } else {
      loadData()
    }
  }

  const createChallenge = async () => {
    if (!form.name || form.target <= 0) return onNotify('Izpolni ime in cilj')
    const body: any = {
      name: form.name, description: form.description, icon: form.icon,
      target: form.target, metric: form.metric, reward_points: form.reward_points,
    }
    if (form.reward_badge) body.reward_badge = form.reward_badge
    if (form.valid_from) body.valid_from = form.valid_from
    if (form.valid_to) body.valid_to = form.valid_to
    const r = await fetch('/api/v1/gamification/challenges', {
      method: 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(r => r.json())
    if (r.id) { onNotify('✅ Izziv ustvarjen!'); setShowCreate(false); loadData() }
    else onNotify(r.detail || 'Napaka')
  }

  const deleteChallenge = async (id: number) => {
    if (!confirm('Izbriši izziv?')) return
    await fetch(`/api/v1/gamification/challenges/${id}`, { method: 'DELETE', headers: api.authHeader() })
    onNotify('🗑️ Izziv izbrisan'); loadData()
  }

  const autoCheck = async () => {
    const r = await fetch('/api/v1/gamification/auto-check', { method: 'POST', headers: api.authHeader() }).then(r => r.json())
    onNotify(`✅ Preverjeno: ${r.checked} strank, ${r.newly_completed} novih zaključenih`)
    loadData()
  }

  const getMetricLabel = (m: string) => METRICS.find(x => x.value === m)?.label || m

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>⏳ Nalaganje...</div>

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0 }}>🏆 Izzivi in zvestoba</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={autoCheck} className="btn btn-sm">🔄 Samodejno preveri</button>
          <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm">+ Nov izziv</button>
        </div>
      </div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
          {[
            { icon: '🎯', value: stats.active_challenges, label: 'Aktivnih izzivov' },
            { icon: '🏅', value: stats.total_badges_awarded, label: 'Podeljenih bedžev' },
            { icon: '🔥', value: stats.customers_with_streaks, label: 'Zaporednih dni' },
            { icon: '✅', value: stats.challenges_completed, label: 'Zaključenih' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 14, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
              <div style={{ fontSize: 24 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#888' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['challenges', 'badges', 'leaderboard', 'manage'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-ghost'}`}>
            {t === 'challenges' ? '🎯 Izzivi' : t === 'badges' ? '🏅 Bedži' : t === 'leaderboard' ? '🏆 lestvica' : '⚙️ Upravljanje'}
          </button>
        ))}
      </div>

      {tab === 'challenges' && (
        <div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Stranka (ID): </label>
            <input className="input" type="number" style={{ width: 120 }} value={customerId || ''}
              onChange={e => loadCustomerData(parseInt(e.target.value) || 0)} placeholder="Vpiši ID" />
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {challenges.map((cp, i) => (
              <div key={i} style={{
                background: 'var(--card, #fff)', borderRadius: 12, padding: 16,
                border: cp.progress.completed ? '2px solid #059669' : '1px solid var(--border, #e2e8f0)',
                boxShadow: '0 1px 4px rgba(0,0,0,.06)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 28 }}>{cp.challenge.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{cp.challenge.name}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{cp.challenge.description}</div>
                    </div>
                  </div>
                  {cp.progress.completed && <span style={{ color: '#059669', fontWeight: 700, fontSize: 13 }}>✅ Zaključeno</span>}
                </div>
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span>{getMetricLabel(cp.challenge.metric)}</span>
                    <span style={{ fontWeight: 600 }}>{cp.progress.current} / {cp.challenge.target}</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: 99, height: 8 }}>
                    <div style={{
                      background: cp.progress.completed ? '#059669' : '#3b82f6',
                      borderRadius: 99, height: '100%', transition: 'width .3s',
                      width: `${Math.min(100, (cp.progress.current / cp.challenge.target) * 100)}%`
                    }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, color: '#888' }}>
                  {cp.challenge.reward_points > 0 && <span>🎁 +{cp.challenge.reward_points} točk</span>}
                  {cp.challenge.reward_badge && <span>🏅 {cp.challenge.reward_badge}</span>}
                  {cp.challenge.valid_to && <span>📅 do {new Date(cp.challenge.valid_to).toLocaleDateString('sl-SI')}</span>}
                </div>
              </div>
            ))}
            {challenges.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>Ni izzivov. Ustvari prvega!</div>}
          </div>
        </div>
      )}

      {tab === 'badges' && (
        <div>
          {customerId === 0 ? (
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Stranka (ID): </label>
              <input className="input" type="number" style={{ width: 120 }} value={customerId || ''}
                onChange={e => loadCustomerData(parseInt(e.target.value) || 0)} placeholder="Vpiši ID" />
            </div>
          ) : null}
          {badges.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              {badges.map(b => (
                <div key={b.id} style={{
                  background: 'var(--card, #fff)', borderRadius: 12, padding: 16, textAlign: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,.08)', border: '1px solid var(--border, #e2e8f0)'
                }}>
                  <div style={{ fontSize: 40 }}>{b.icon}</div>
                  <div style={{ fontWeight: 700, marginTop: 8 }}>{b.name}</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{b.description}</div>
                  {b.earned_at && <div style={{ fontSize: 10, color: '#aaa', marginTop: 6 }}>📅 {new Date(b.earned_at).toLocaleDateString('sl-SI')}</div>}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>
              {customerId === 0 ? 'Izberi stranko za ogled bedžev' : 'Ni bedžev za to stranko'}
            </div>
          )}
        </div>
      )}

      {tab === 'leaderboard' && (
        <div style={{ background: 'var(--card, #fff)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                {['#', 'Ime', 'Točke', 'Bedži', '🔥 Niz', 'Skupaj'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#888' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leaderboard.map(e => (
                <tr key={e.customer_id} style={{ borderBottom: '1px solid var(--border)', background: e.rank <= 3 ? '#fffbeb' : 'transparent' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 700 }}>
                    {e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : e.rank}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>{e.name}</td>
                  <td style={{ padding: '10px 14px' }}>⭐ {e.points}</td>
                  <td style={{ padding: '10px 14px' }}>🏅 {e.badges}</td>
                  <td style={{ padding: '10px 14px' }}>🔥 {e.streak} dni</td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#059669' }}>{e.score}</td>
                </tr>
              ))}
              {leaderboard.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: '#888' }}>Ni podatkov na lestvici</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'manage' && (
        <div>
          <h3 style={{ marginTop: 0 }}>Upravljanje izzivov</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {challenges.map(cp => (
              <div key={cp.challenge.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'var(--card, #fff)', borderRadius: 8, padding: '10px 14px',
                border: '1px solid var(--border)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span>{cp.challenge.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{cp.challenge.name}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{getMetricLabel(cp.challenge.metric)} → {cp.challenge.target} | +{cp.challenge.reward_points} točk</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => deleteChallenge(cp.challenge.id)} className="btn btn-sm btn-ghost" style={{ color: '#ef4444' }}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>🎯 Nov izziv</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Ime *</label>
                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="npr. 5 obiskov" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Opis</label>
                <input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Opis izziva" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Ikona</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {BADGE_ICONS.map(icon => (
                    <button key={icon} onClick={() => setForm(f => ({ ...f, icon }))}
                      style={{ fontSize: 22, padding: 4, background: form.icon === icon ? '#e0f2fe' : 'transparent', borderRadius: 6, border: form.icon === icon ? '2px solid #3b82f6' : '2px solid transparent', cursor: 'pointer' }}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Metrika</label>
                  <select className="input" value={form.metric} onChange={e => setForm(f => ({ ...f, metric: e.target.value }))}>
                    {METRICS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Cilj *</label>
                  <input className="input" type="number" min="1" value={form.target} onChange={e => setForm(f => ({ ...f, target: parseInt(e.target.value) || 1 }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Nagrada (točke)</label>
                  <input className="input" type="number" min="0" value={form.reward_points} onChange={e => setForm(f => ({ ...f, reward_points: parseInt(e.target.value) || 0 }))} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Nagrada (bedž)</label>
                  <input className="input" value={form.reward_badge} onChange={e => setForm(f => ({ ...f, reward_badge: e.target.value }))} placeholder="Ime bedža" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Velja od</label>
                  <input className="input" type="datetime-local" value={form.valid_from} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Velja do</label>
                  <input className="input" type="datetime-local" value={form.valid_to} onChange={e => setForm(f => ({ ...f, valid_to: e.target.value }))} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={createChallenge} className="btn btn-primary">✅ Ustvari</button>
              <button onClick={() => setShowCreate(false)} className="btn btn-ghost">Prekliči</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
