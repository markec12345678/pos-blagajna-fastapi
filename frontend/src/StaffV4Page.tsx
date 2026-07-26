import { useState, useEffect } from 'react'
import * as api from './api'

export default function StaffV4Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'training' | 'performance' | 'scheduling' | 'absences'>('training')
  const [training, setTraining] = useState<any>(null)
  const [performance, setPerformance] = useState<any>(null)
  const [scheduling, setScheduling] = useState<any>(null)
  const [absences, setAbsences] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/staff-v4/training', { headers: api.h() }).then(r => r.json()).then(setTraining),
      fetch('/api/v1/staff-v4/performance', { headers: api.h() }).then(r => r.json()).then(setPerformance),
      fetch('/api/v1/staff-v4/scheduling', { headers: api.h() }).then(r => r.json()).then(setScheduling),
      fetch('/api/v1/staff-v4/absences', { headers: api.h() }).then(r => r.json()).then(setAbsences),
    ]).catch(() => onNotify('Napaka')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'training', label: '📚 Usposabljanje' },
    { key: 'performance', label: '📊 Uspešnost' },
    { key: 'scheduling', label: '📅 Razpored' },
    { key: 'absences', label: '🏖️ Odsotnosti' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm"><h2 className="page-title">👥 Osebje V4</h2></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>{t.label}</button>
        ))}
      </div>
      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'training' && training && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Skupaj osebja', value: training.total_staff, color: '#3b82f6' },
                  { label: 'Zaključeno', value: training.completed_training, color: '#22c55e' },
                  { label: 'V teku', value: training.pending_training, color: '#f59e0b' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <h4 style={{ margin: '0 0 8px' }}>📚 Tečaji</h4>
              {training.courses?.map((c: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {c.required && <span style={{ background: '#fef2f2', color: '#dc2626', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>Obvezno</span>}
                      <span style={{ background: c.completed === training.total_staff ? '#dcfce7' : '#fef3c7', color: c.completed === training.total_staff ? '#16a34a' : '#d97706', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{c.completed}/{training.total_staff}</span>
                    </div>
                  </div>
                  {c.expires && <div style={{ fontSize: 11, color: '#888' }}>Poteče: {c.expires}</div>}
                </div>
              ))}
              {training.upcoming?.length > 0 && (
                <>
                  <h4 style={{ margin: '16px 0 8px' }}>⏳ Pending</h4>
                  {training.upcoming?.map((u: any, i: number) => (
                    <div key={i} className="card" style={{ padding: 10, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600 }}>{u.staff}</span>
                      <div style={{ fontSize: 12, color: '#666' }}>{u.course} · Rok: {u.deadline}</div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
          {tab === 'performance' && performance && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Povp. ocena</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b' }}>⭐ {performance.avg_score}</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Pregledi</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6' }}>{performance.reviews_due}</div>
                </div>
              </div>
              {performance.staff?.map((s: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                    <span style={{ color: '#f59e0b' }}>⭐ {s.score}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{s.role}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12 }}>
                    <div>Pritočnost: <b>{s.punctuality}%</b></div>
                    <div>Učinkovitost: <b>{s.efficiency}%</b></div>
                    <div>Ocena: <b>{s.customer_rating}</b></div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'scheduling' && scheduling && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Ure tedensko', value: scheduling.current_week_hours?.scheduled, color: '#3b82f6' },
                  { label: 'Strošek tedensko', value: `${scheduling.labor_cost_week} €`, color: '#f59e0b' },
                  { label: 'Strošek/obrok', value: `${scheduling.cost_per_cover} €`, color: '#8b5cf6' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div className="card" style={{ padding: 14, marginBottom: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>📈 Vrhnje zasedenosti</div>
                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                  <span>📅 {scheduling.peak_staffing?.day}</span>
                  <span>⏰ {scheduling.peak_staffing?.hours}</span>
                  <span>👥 {scheduling.peak_staffing?.staff_current}/{scheduling.peak_staffing?.staff_needed}</span>
                </div>
              </div>
              <h4 style={{ margin: '0 0 8px' }}>💡 Priporočila</h4>
              {scheduling.recommendations?.map((r: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 6, borderLeft: `4px solid ${r.saving > 0 ? '#22c55e' : '#f59e0b'}` }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{r.title}</div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                    <span style={{ color: r.saving > 0 ? '#22c55e' : '#ef4444', fontWeight: 700 }}>{r.saving > 0 ? '+' : ''}{r.saving} €</span>
                    <span>{r.impact}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'absences' && absences && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Aktivne', value: absences.active, color: '#ef4444' },
                  { label: 'Prihajajoče', value: absences.upcoming, color: '#f59e0b' },
                  { label: 'Stopnja', value: `${absences.absence_rate}%`, color: '#3b82f6' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {absences.absences?.map((a: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8, borderLeft: `4px solid ${a.status === 'active' ? '#ef4444' : '#f59e0b'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{a.staff}</span>
                    <span style={{ background: a.status === 'active' ? '#fef2f2' : '#fef3c7', color: a.status === 'active' ? '#dc2626' : '#d97706', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{a.type}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>📅 {a.start} — {a.end}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}