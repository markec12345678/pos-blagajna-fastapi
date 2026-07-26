import React, { useState, useEffect } from 'react'
import { authHeader } from './api'
import { useTranslation } from './i18n'

export default function LoyaltyV3Page({ onNotify }: { onNotify: (m: string) => void }) {
  const { t } = useTranslation()
  const [tiers, setTiers] = useState<any>(null)
  const [rewards, setRewards] = useState<any>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [gamification, setGamification] = useState<any>(null)
  const [referrals, setReferrals] = useState<any>(null)
  const [personalization, setPersonalization] = useState<any[]>([])
  const [birthdays, setBirthdays] = useState<any>(null)
  const [tab, setTab] = useState('tiers')

  useEffect(() => {
    fetch('/api/v1/loyalty-v3/tiers', { headers: authHeader() }).then(r => r.json()).then(d => setTiers(d)).catch(() => {})
    fetch('/api/v1/loyalty-v3/rewards-catalog', { headers: authHeader() }).then(r => r.json()).then(d => setRewards(d)).catch(() => {})
    fetch('/api/v1/loyalty-v3/points-analytics', { headers: authHeader() }).then(r => r.json()).then(d => setAnalytics(d.analytics || null)).catch(() => {})
    fetch('/api/v1/loyalty-v3/gamification', { headers: authHeader() }).then(r => r.json()).then(d => setGamification(d)).catch(() => {})
    fetch('/api/v1/loyalty-v3/referral-program', { headers: authHeader() }).then(r => r.json()).then(d => setReferrals(d.referrals || null)).catch(() => {})
    fetch('/api/v1/loyalty-v3/personalization', { headers: authHeader() }).then(r => r.json()).then(d => setPersonalization(d.insights || [])).catch(() => {})
    fetch('/api/v1/loyalty-v3/birthday-rewards', { headers: authHeader() }).then(r => r.json()).then(d => setBirthdays(d)).catch(() => {})
  }, [])

  return (
    <div style={{ padding: 16 }}>
      <h2>🏆 Zvestoba V3</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['tiers', 'rewards', 'points', 'gamification', 'referrals', 'personalization', 'birthdays'] as const).map(s => (
          <button key={s} onClick={() => setTab(s)} className={`btn ${tab === s ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: 12 }}>
            {s === 'tiers' ? 'Stopnje' : s === 'rewards' ? 'Nagrade' : s === 'points' ? 'Točke' : s === 'gamification' ? 'Izzivi' : s === 'referrals' ? 'Priporočila' : s === 'personalization' ? 'Osebno' : 'Rojstni dnevi'}
          </button>
        ))}
      </div>

      {tab === 'tiers' && tiers && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            {(tiers.tiers || []).map((tier: any, i: number) => (
              <div key={i} className="card" style={{ borderTop: `4px solid ${tier.color}` }}>
                <h4 style={{ margin: 0, color: tier.color }}>{tier.name}</h4>
                <p style={{ fontSize: 22, fontWeight: 700, margin: '8px 0' }}>{tier.members} članov</p>
                <p style={{ fontSize: 11, color: 'var(--muted)' }}>{tier.min_points}–{tier.max_points || '∞'} točk</p>
                <ul style={{ margin: '8px 0 0', paddingLeft: 16, fontSize: 12 }}>
                  {tier.benefits.map((b: string, j: number) => <li key={j} style={{ marginBottom: 2 }}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Skupaj članov: <strong>{tiers.total_members}</strong></span>
              <span>Izdanih točk: <strong>{tiers.total_points_issued?.toLocaleString()}</strong></span>
            </div>
          </div>
        </div>
      )}

      {tab === 'rewards' && rewards && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
            {(rewards.rewards || []).map((r: any) => (
              <div key={r.id} className="card" style={{ textAlign: 'center' }}>
                <h4 style={{ margin: 0 }}>{r.name}</h4>
                <p style={{ fontSize: 22, fontWeight: 700, margin: '8px 0', color: 'var(--primary, #059669)' }}>{r.points} točk</p>
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>{r.category}</p>
                <p style={{ fontSize: 12 }}>{r.redemptions} unovčitev</p>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Skupaj unovčitev: <strong>{rewards.total_redemptions}</strong></span>
              <span>Skupaj strošek: <strong>€{rewards.total_cost}</strong></span>
            </div>
          </div>
        </div>
      )}

      {tab === 'points' && analytics && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Izdane', value: analytics.issued_this_month?.toLocaleString() },
              { label: 'Unovčene', value: analytics.redeemed_this_month?.toLocaleString() },
              { label: 'Stanje', value: analytics.outstanding_balance?.toLocaleString() },
              { label: 'Iztečene', value: `${analytics.breakage_rate}%` },
              { label: 'Povprečje', value: analytics.avg_points_per_member },
            ].map((kpi, i) => (
              <div key={i} className="card" style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>{kpi.label}</p>
                <p style={{ fontSize: 22, fontWeight: 700, margin: '4px 0' }}>{kpi.value}</p>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding: 16 }}>
            <h4 style={{ marginTop: 0 }}>Najboljši zbiratelji</h4>
            {(analytics.top_earners || []).map((e: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                <span>{e.name}</span>
                <span><strong>{e.points.toLocaleString()}</strong> točk · {e.tier}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'gamification' && gamification && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12, marginBottom: 16 }}>
            {(gamification.challenges || []).map((c: any) => (
              <div key={c.id} className="card">
                <h4 style={{ margin: 0 }}>{c.name}</h4>
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0' }}>{c.description}</p>
                <div style={{ marginTop: 8, background: 'var(--bg, #f1f5f9)', borderRadius: 4, overflow: 'hidden', height: 8 }}>
                  <div style={{ width: `${(c.progress / c.target) * 100}%`, background: 'var(--primary, #059669)', height: '100%' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 12 }}>
                  <span>{c.progress}/{c.target}</span>
                  <span style={{ color: 'var(--primary, #059669)' }}>{c.reward} točk</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.participants} udeležencev · Poteče: {c.expires}</div>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding: 16 }}>
            <h4 style={{ marginTop: 0 }}>Abecede</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {(gamification.badges || []).map((b: any, i: number) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: 28 }}>{b.icon}</span>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{b.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{b.holders} imetnikov</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'referrals' && referrals && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Priporočila', value: referrals.total_referrals },
              { label: 'Konverzije', value: referrals.successful_conversions },
              { label: 'Stopnja', value: `${referrals.conversion_rate}%` },
              { label: 'Nagrade', value: `€${referrals.reward_given}` },
            ].map((kpi, i) => (
              <div key={i} className="card" style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>{kpi.label}</p>
                <p style={{ fontSize: 22, fontWeight: 700, margin: '4px 0' }}>{kpi.value}</p>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding: 16 }}>
            <h4 style={{ marginTop: 0 }}>Najboljši priporočevalci</h4>
            {(referrals.top_referrers || []).map((r: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                <span>{r.name}</span>
                <span>{r.referrals} priporočil · {r.conversions} konverzij</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'personalization' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {personalization.map((p: any, i: number) => (
            <div key={i} className="card" style={{ padding: 16 }}>
              <h4 style={{ margin: 0 }}>{p.customer}</h4>
              <div style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0' }}>{p.visit_frequency} · Povprečje €{p.avg_spend}</div>
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600 }}>Priljubljene jedi:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  {p.preferred_items.map((item: string) => (
                    <span key={item} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: 'var(--bg, #f1f5f9)' }}>{item}</span>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600 }}>Priporočila:</div>
                <ul style={{ margin: '4px 0 0', paddingLeft: 16, fontSize: 12 }}>
                  {p.recommendations.map((r: string, j: number) => <li key={j}>{r}</li>)}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'birthdays' && birthdays && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div className="card" style={{ textAlign: 'center' }}><p style={{ fontSize: 12, color: 'var(--muted)' }}>Poslano ta mesec</p><p style={{ fontSize: 24, fontWeight: 700 }}>{birthdays.sent_this_month}</p></div>
            <div className="card" style={{ textAlign: 'center' }}><p style={{ fontSize: 12, color: 'var(--muted)' }}>Stopnja unovčitve</p><p style={{ fontSize: 24, fontWeight: 700, color: 'var(--green)' }}>{birthdays.redeemed_rate}%</p></div>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {(birthdays.upcoming || []).map((b: any, i: number) => (
              <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px' }}>
                <span style={{ fontSize: 28 }}>🎂</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{b.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{b.date} · {b.tier}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13 }}>{b.reward}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{b.days_until} dni</div>
                </div>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: b.status === 'scheduled' ? 'var(--green)' : 'var(--amber)', color: '#fff' }}>{b.status === 'scheduled' ? 'Načrtovano' : 'Čaka'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
