import { useState, useEffect } from 'react'
import * as api from './api'

export default function ScheduleV2Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'weekly' | 'conflicts' | 'swap' | 'availability' | 'optimize'>('weekly')
  const [weekly, setWeekly] = useState<any>(null)
  const [conflicts, setConflicts] = useState<any[]>([])
  const [swap, setSwap] = useState<any[]>([])
  const [availability, setAvailability] = useState<any[]>([])
  const [optimize, setOptimize] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/schedule-v2/weekly', { headers: api.h() }).then(r => r.json()).then(setWeekly),
      fetch('/api/v1/schedule-v2/conflicts', { headers: api.h() }).then(r => r.json()).then(setConflicts),
      fetch('/api/v1/schedule-v2/swap-requests', { headers: api.h() }).then(r => r.json()).then(setSwap),
      fetch('/api/v1/schedule-v2/availability', { headers: api.h() }).then(r => r.json()).then(setAvailability),
      fetch('/api/v1/schedule-v2/optimize', { headers: api.h() }).then(r => r.json()).then(setOptimize),
    ]).catch(() => onNotify('Napaka pri nalaganju')).finally(() => setLoading(false))
  }, [])

  const dayLabel = (d: string) => ({ Mon: 'Pon', Tue: 'Tor', Wed: 'Sre', Thu: 'Čet', Fri: 'Pet', Sat: 'Sob', Sun: 'Ned' }[d] || d)
  const statusColor = (s: string) => ({ approved: '#22c55e', pending: '#f59e0b', rejected: '#ef4444', resolved: '#22c55e', unresolved: '#ef4444' }[s] || '#6b7280')

  const tabs = [
    { key: 'weekly', label: '📅 Tedenski urnik' },
    { key: 'conflicts', label: '⚠️ Konflikti', count: conflicts.length },
    { key: 'swap', label: '🔄 Zamenjave', count: swap.length },
    { key: 'availability', label: '👥 Razpoložljivost' },
    { key: 'optimize', label: '⚡ Optimizacija' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">📅 Napredni urnik</h2>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>
            {t.label}{'count' in t && t.count !== undefined && <span style={{ marginLeft: 4, background: t.count > 0 ? '#ef4444' : 'var(--primary)', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 11 }}>{t.count}</span>}
          </button>
        ))}
      </div>

      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'weekly' && weekly && (
            <div>
              <div className="card" style={{ padding: 12, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: '#888' }}>{weekly.start_date} — {weekly.end_date}</span>
                  <span style={{ fontSize: 13 }}>Ure: {weekly.total_hours}h</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13 }}>Stroški: {weekly.total_cost?.toFixed(0)} €</span>
                  <span style={{ fontSize: 13, color: '#22c55e' }}>Optimizirano</span>
                </div>
              </div>
              {weekly.shifts?.map((s: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{s.employee}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{dayLabel(s.day)} · {s.start} — {s.end}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{s.hours}h</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{s.role}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'conflicts' && (
            <div>
              {conflicts.length === 0 ? <div className="card" style={{ padding: 24, textAlign: 'center', color: '#22c55e' }}>✅ Ni konfliktov</div> : conflicts.map((c, i) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8, borderLeft: `4px solid ${statusColor(c.status)}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{c.employee}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{c.day} · {c.start} — {c.end}</div>
                      <div style={{ fontSize: 12, color: '#ef4444' }}>{c.reason}</div>
                    </div>
                    <span style={{ background: statusColor(c.status), color: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>{c.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'swap' && (
            <div>
              {swap.length === 0 ? <div className="card" style={{ padding: 24, textAlign: 'center', color: '#888' }}>Ni zahtev za zamenjavo</div> : swap.map((s, i) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{s.requester} → {s.target}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{s.shift_date} · {s.start} — {s.end}</div>
                      <div style={{ fontSize: 12, color: '#f59e0b' }}>{s.reason}</div>
                    </div>
                    <span style={{ background: statusColor(s.status), color: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>{s.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'availability' && (
            <div>
              {availability.map((a, i) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 6 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{a.employee}</div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                    {a.days?.map((d: any, j: number) => (
                      <span key={j} style={{
                        padding: '2px 8px', borderRadius: 12, fontSize: 11,
                        background: d.available ? '#dcfce7' : '#fee2e2',
                        color: d.available ? '#16a34a' : '#dc2626',
                      }}>
                        {dayLabel(d.day)} {d.available ? '✓' : '✗'}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'optimize' && optimize && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Kritične ure', value: `${optimize.critical_hours || 0}`, color: '#ef4444' },
                  { label: 'Nepokrite ure', value: `${optimize.understaffed_hours || 0}`, color: '#f59e0b' },
                  { label: 'Odvečne ure', value: `${optimize.overstaffed_hours || 0}`, color: '#3b82f6' },
                  { label: 'Prihranek', value: `${optimize.savings?.toFixed(0) || 0} €`, color: '#22c55e' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {optimize.suggestions?.length > 0 && (
                <div className="card" style={{ padding: 14 }}>
                  <h4 style={{ margin: '0 0 8px' }}>📋 Predlogi</h4>
                  {optimize.suggestions.map((s: any, i: number) => (
                    <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>{s}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}