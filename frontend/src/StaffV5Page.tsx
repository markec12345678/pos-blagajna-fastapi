import { useState, useEffect } from 'react'
import * as api from './api'

export default function StaffV5Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'skills' | 'paths' | 'reviews' | 'optimization'>('skills')
  const [skills, setSkills] = useState<any>(null)
  const [paths, setPaths] = useState<any>(null)
  const [reviews, setReviews] = useState<any>(null)
  const [optimization, setOptimization] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/staff-v5/skills', { headers: api.h() }).then(r => r.json()).then(setSkills),
      fetch('/api/v1/staff-v5/training-paths', { headers: api.h() }).then(r => r.json()).then(setPaths),
      fetch('/api/v1/staff-v5/performance-reviews', { headers: api.h() }).then(r => r.json()).then(setReviews),
      fetch('/api/v1/staff-v5/labor-optimization', { headers: api.h() }).then(r => r.json()).then(setOptimization),
    ]).catch(() => onNotify('Napaka')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'skills', label: '🎯 Sposobnosti' },
    { key: 'paths', label: '🛤️ Poti usposabljanja' },
    { key: 'reviews', label: '📋 Pregledi' },
    { key: 'optimization', label: '⚙️ Optimizacija' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm"><h2 className="page-title">👥 Osebje V5</h2></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>{t.label}</button>
        ))}
      </div>
      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'skills' && skills && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Pokritost</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: skills.coverage_rate > 70 ? '#22c55e' : '#f59e0b' }}>{skills.coverage_rate}%</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Pomanjkljivosti</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b' }}>{skills.skill_gaps?.length}</div>
                </div>
              </div>
              {skills.matrix?.map((s: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{s.staff}</span>
                    <span style={{ color: '#f59e0b' }}>⭐ Nivo {s.level}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>
                    {s.skills?.map((sk: string, j: number) => (
                      <span key={j} style={{ background: '#dcfce7', color: '#16a34a', padding: '1px 6px', borderRadius: 4, fontSize: 10 }}>{sk}</span>
                    ))}
                  </div>
                  {s.gaps?.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {s.gaps?.map((g: string, j: number) => (
                        <span key={j} style={{ background: '#fef3c7', color: '#d97706', padding: '1px 6px', borderRadius: 4, fontSize: 10 }}>📈 {g}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {tab === 'paths' && paths && (
            <div>
              {paths.paths?.map((p: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                    <span style={{ color: '#888', fontSize: 12 }}>{p.duration_weeks} tednov</span>
                  </div>
                  {p.progress?.map((step: any, j: number) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 12 }}>
                      <span style={{ fontSize: 14 }}>{step.status === 'completed' ? '✅' : step.status === 'in_progress' ? '🔄' : '⏳'}</span>
                      <span style={{ color: step.status === 'pending' ? '#888' : '#333' }}>{step.step}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
          {tab === 'reviews' && reviews && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Čakajoči</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b' }}>{reviews.due_this_month}</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Povp. ocena</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>⭐ {reviews.avg_score_all}</div>
                </div>
              </div>
              {reviews.reviews?.map((r: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{r.staff}</span>
                    <span style={{ color: '#f59e0b' }}>⭐ {r.score}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                    <span>📅 {r.date}</span>
                    <span>{r.areas?.join(', ')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'optimization' && optimization && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Trenutni', value: `${optimization.current_cost_week} €`, color: '#ef4444' },
                  { label: 'Optimizirano', value: `${optimization.optimized_cost_week} €`, color: '#22c55e' },
                  { label: 'Prihranek/teden', value: `${optimization.saving_week} €`, color: '#3b82f6' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <h4 style={{ margin: '0 0 8px' }}>💡 Priporočila</h4>
              {optimization.recommendations?.map((r: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 6, borderLeft: '4px solid #22c55e' }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{r.title}</div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>+{r.saving} €</span>
                    <span>{r.impact}</span>
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