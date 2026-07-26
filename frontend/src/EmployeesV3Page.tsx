import { useState, useEffect } from 'react'
import * as api from './api'

export default function EmployeesV3Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'list' | 'training' | 'goals'>('list')
  const [employees, setEmployees] = useState<any[]>([])
  const [training, setTraining] = useState<any>(null)
  const [goals, setGoals] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/employees-v2/', { headers: api.h() }).then(r => r.json()).then(d => setEmployees(d.employees || [])),
      fetch('/api/v1/employees-v2/training', { headers: api.h() }).then(r => r.json()).then(setTraining),
      fetch('/api/v1/employees-v2/goals', { headers: api.h() }).then(r => r.json()).then(setGoals),
    ]).catch(() => onNotify('Napaka pri nalaganju')).finally(() => setLoading(false))
  }, [])

  const perfColor = (p: number) => p >= 4.7 ? '#22c55e' : p >= 4.0 ? '#f59e0b' : '#ef4444'
  const goalStatusColor = (s: string) => ({ on_track: '#22c55e', behind: '#f59e0b', completed: '#3b82f6' }[s] || '#6b7280')

  const tabs = [
    { key: 'list', label: '👥 Zaposleni', count: employees.length },
    { key: 'training', label: '📚 Usposabljanje' },
    { key: 'goals', label: '🎯 Cilji' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">👥 Zaposleni V2</h2>
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
          {tab === 'list' && (
            <div>
              {employees.map((e, i) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{e.name}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{e.role} · {e.department}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: perfColor(e.performance) }}>⭐ {e.performance}</span>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12, color: '#666' }}>
                    <div>Izmene: {e.shifts_this_month}</div>
                    <div>Ure: {e.hours_this_month}h</div>
                    <div>Tečaji: {e.training_completed}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: '#888' }}>
                    <span>Cilji: {e.goals_met}/{e.training_completed + 2}</span>
                    <span>Od: {e.start_date}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'training' && training && (
            <div>
              <div className="card" style={{ padding: 14, marginBottom: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#888' }}>Skladnost usposabljanja</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: training.compliance_rate >= 95 ? '#22c55e' : '#f59e0b' }}>{training.compliance_rate}%</div>
              </div>
              {training.courses?.map((c: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    {c.required && <span style={{ background: '#fee2e2', color: '#dc2626', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>Obvezno</span>}
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: 6, height: 8, marginBottom: 4 }}>
                    <div style={{ background: '#22c55e', height: '100%', borderRadius: 6, width: `${(c.completed / c.total) * 100}%` }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666' }}>
                    <span>Dokončano: {c.completed}/{c.total}</span>
                    <span>V teku: {c.in_progress}</span>
                  </div>
                </div>
              ))}
              {training.upcoming_deadlines?.length > 0 && (
                <div className="card" style={{ padding: 14, marginTop: 12, borderLeft: '4px solid #ef4444' }}>
                  <h4 style={{ margin: '0 0 8px', color: '#ef4444' }}>⏰ Prihajajoče roke</h4>
                  {training.upcoming_deadlines.map((d: any, i: number) => (
                    <div key={i} style={{ fontSize: 13 }}>{d.employee}: {d.course} — {d.deadline}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'goals' && goals && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Skupaj ciljev</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6' }}>{goals.total_goals}</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Doseženi</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>{goals.met_goals}</div>
                </div>
              </div>
              {goals.goals?.map((g: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{g.employee}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{g.goal}</div>
                    </div>
                    <span style={{ background: goalStatusColor(g.status), color: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>{g.progress}%</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: 6, height: 8, marginBottom: 4 }}>
                    <div style={{ background: goalStatusColor(g.status), height: '100%', borderRadius: 6, width: `${g.progress}%` }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#888' }}>Rok: {g.deadline}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}