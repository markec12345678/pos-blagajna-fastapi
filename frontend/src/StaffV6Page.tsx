import { useState, useEffect } from 'react'

interface Scorecard { employee: string; role: string; sales: number; upsells: number; customer_rating: number; punctuality: number; efficiency: number; overall_score: number; trend: string; bonuses_earned: number }
interface Training { employee: string; courses: Array<{ name: string; status: string; completed?: string; score?: number; progress?: number; deadline?: string }>; total_hours: number; certifications: number }
interface Wellness { employee: string; overtime_hours: number; days_since_rest: number; burnout_risk: string; mood_score: number; satisfaction: number; stress_level: string }
interface Payroll { employee: string; hours_worked: number; hourly_rate: number; base_pay: number; overtime: number; bonus: number; deductions: number; net_pay: number }

export default function StaffV6Page({ onNotify }: { onNotify?: (msg: string, err?: boolean) => void }) {
  const [tab, setTab] = useState<string>('scorecard')
  const [scorecard, setScorecard] = useState<Scorecard[]>([])
  const [training, setTraining] = useState<Training[]>([])
  const [wellness, setWellness] = useState<Wellness[]>([])
  const [payroll, setPayroll] = useState<Payroll[]>([])
  const [utilization, setUtilization] = useState<any[]>([])
  const [gaps, setGaps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [sRes, tRes, wRes, pRes, uRes, gRes] = await Promise.all([
        fetch('/api/v1/staff-v6/performance-scorecard').then(r => r.json()),
        fetch('/api/v1/staff-v6/training-progress').then(r => r.json()),
        fetch('/api/v1/staff-v6/employee-wellness').then(r => r.json()),
        fetch('/api/v1/staff-v6/payroll-summary').then(r => r.json()),
        fetch('/api/v1/staff-v6/team-utilization').then(r => r.json()),
        fetch('/api/v1/staff-v6/skill-gaps').then(r => r.json()),
      ])
      setScorecard(sRes.scorecard || [])
      setTraining(tRes.training || [])
      setWellness(wRes.wellness || [])
      setPayroll(pRes.payroll || [])
      setUtilization(uRes.utilization || [])
      setGaps(gRes.gaps || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  if (loading) return <div className="loading">Nalagam...</div>

  return (
    <div style={{ padding: '2rem' }}>
      <h1>👥 Osebje V6</h1>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {[
          { key: 'scorecard', label: '📊 Karta uspešnosti' },
          { key: 'training', label: '🎓 Usposabljanje' },
          { key: 'wellness', label: '💚 Počutje' },
          { key: 'payroll', label: '💰 Plače' },
          { key: 'utilization', label: '⏱️ Izkoriščenost' },
          { key: 'gaps', label: '🔍 Praznine znanja' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: tab === t.key ? '2px solid #2563eb' : '1px solid #d1d5db', background: tab === t.key ? '#dbeafe' : 'white', cursor: 'pointer', fontSize: '0.85rem' }}>{t.label}</button>
        ))}
      </div>

      {tab === 'scorecard' && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {scorecard.map(s => (
            <div key={s.employee} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div><strong>{s.employee}</strong> <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>{s.role}</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700, color: s.overall_score >= 90 ? '#10b981' : s.overall_score >= 80 ? '#f59e0b' : '#ef4444' }}>{s.overall_score}</span>
                  <span style={{ fontSize: '0.8rem' }}>{s.trend === 'up' ? '📈' : s.trend === 'down' ? '📉' : '➡️'}</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', fontSize: '0.85rem' }}>
                <div>Prodaja: €{s.sales}</div>
                <div>Upsell: {s.upsells}</div>
                <div>Ocena: ⭐ {s.customer_rating}</div>
                <div>Punktualnost: {s.punctuality}%</div>
                <div>Učinkovitost: {s.efficiency}%</div>
              </div>
              {s.bonuses_earned > 0 && <div style={{ marginTop: '0.5rem', color: '#10b981', fontWeight: 600, fontSize: '0.85rem' }}>Bonus: €{s.bonuses_earned}</div>}
            </div>
          ))}
        </div>
      )}

      {tab === 'training' && (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {training.map(t => (
            <div key={t.employee} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <strong>{t.employee}</strong>
                <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>{t.total_hours} ur · {t.certifications} certifikatov</span>
              </div>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {t.courses.map((c, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', borderRadius: '8px', background: c.status === 'completed' ? '#d1fae5' : '#fef3c7', alignItems: 'center' }}>
                    <div>
                      <strong>{c.name}</strong>
                      {c.score && <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem', color: '#6b7280' }}>Ocena: {c.score}%</span>}
                      {c.deadline && <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: '#6b7280' }}>Rok: {c.deadline}</span>}
                    </div>
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '8px', fontSize: '0.75rem', background: c.status === 'completed' ? '#059669' : '#d97706', color: 'white' }}>{c.status === 'completed' ? 'Končano' : `${c.progress || 0}%`}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'wellness' && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {wellness.map(w => (
            <div key={w.employee} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: `4px solid ${w.burnout_risk === 'low' ? '#10b981' : w.burnout_risk === 'medium' ? '#f59e0b' : '#ef4444'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <strong>{w.employee}</strong>
                <span style={{ padding: '0.2rem 0.6rem', borderRadius: '8px', fontSize: '0.75rem', background: w.burnout_risk === 'low' ? '#d1fae5' : '#fef3c7', color: w.burnout_risk === 'low' ? '#065f46' : '#92400e' }}>{w.burnout_risk === 'low' ? 'Nizko tveganje' : 'Srednje tveganje'}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', fontSize: '0.85rem' }}>
                <div>Nadure: {w.overtime_hours}h</div>
                <div>Počitek: {w.days_since_rest} dni</div>
                <div>Razpoloženje: {w.mood_score}/10</div>
                <div>Zadovoljstvo: {w.satisfaction}%</div>
                <div>Stres: {w.stress_level}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'payroll' && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {payroll.map(p => (
              <div key={p.employee} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 80px', alignItems: 'center', gap: '1rem', padding: '0.75rem', borderRadius: '8px', background: '#f9fafb' }}>
                <strong>{p.employee}</strong>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <div>Ure: {p.hours_worked}</div>
                  <div>Osnova: €{p.base_pay}</div>
                  <div>Nadure: €{p.overtime}</div>
                  <div>Bonus: €{p.bonus}</div>
                </div>
                <div style={{ fontWeight: 700 }}>€{p.net_pay}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'utilization' && (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {utilization.map(u => (
            <div key={u.employee} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <strong>{u.employee}</strong>
                <span style={{ fontWeight: 700, color: u.utilization >= 85 && u.utilization <= 95 ? '#10b981' : '#f59e0b' }}>{u.utilization}%</span>
              </div>
              <div style={{ height: '12px', borderRadius: '6px', background: '#e5e7eb', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${u.utilization}%`, background: u.utilization >= 85 && u.utilization <= 95 ? '#10b981' : '#f59e0b', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                <div>Načrt: {u.scheduled_hours}h</div>
                <div>Produktivno: {u.productive_hours}h</div>
                <div>Prosto: {u.idle_hours}h</div>
                <div>Pavze: {u.break_compliance}%</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'gaps' && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {gaps.map(g => (
            <div key={g.skill} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <strong>{g.skill}</strong>
                <span style={{ padding: '0.2rem 0.6rem', borderRadius: '8px', fontSize: '0.75rem', background: g.priority === 'high' ? '#fef2f2' : g.priority === 'medium' ? '#fef3c7' : '#d1fae5', color: g.priority === 'high' ? '#991b1b' : g.priority === 'medium' ? '#92400e' : '#065f46' }}>{g.priority}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ height: '8px', borderRadius: '4px', background: '#e5e7eb', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${g.current_team_avg}%`, background: '#3b82f6', borderRadius: '4px' }} />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>Trenutno: {g.current_team_avg}% / Zahtevano: {g.required}%</div>
                </div>
                <span style={{ fontWeight: 700, color: '#ef4444', fontSize: '1.1rem' }}>-{g.gap}%</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Vpliv: {g.affected.join(', ')}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
