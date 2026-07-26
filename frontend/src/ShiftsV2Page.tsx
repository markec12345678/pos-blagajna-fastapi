import { useState, useEffect } from 'react'
import * as api from './api'

export default function ShiftsV2Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'current' | 'weekly' | 'time-clock' | 'labor' | 'coverage' | 'swaps' | 'stats'>('current')
  const [current, setCurrent] = useState<any>(null)
  const [weekly, setWeekly] = useState<any>(null)
  const [timeClock, setTimeClock] = useState<any>(null)
  const [labor, setLabor] = useState<any>(null)
  const [coverage, setCoverage] = useState<any>(null)
  const [swaps, setSwaps] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/shifts-v2/current', { headers: api.h() }).then(r => r.json()).then(setCurrent),
      fetch('/api/v1/shifts-v2/weekly', { headers: api.h() }).then(r => r.json()).then(setWeekly),
      fetch('/api/v1/shifts-v2/time-clock', { headers: api.h() }).then(r => r.json()).then(setTimeClock),
      fetch('/api/v1/shifts-v2/labor-cost', { headers: api.h() }).then(r => r.json()).then(setLabor),
      fetch('/api/v1/shifts-v2/coverage', { headers: api.h() }).then(r => r.json()).then(setCoverage),
      fetch('/api/v1/shifts-v2/swap-requests', { headers: api.h() }).then(r => r.json()).then(setSwaps),
    ]).catch(() => onNotify('Napaka pri nalaganju')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'current', label: '⏰ Trenutne' },
    { key: 'weekly', label: '📅 Tedenski' },
    { key: 'time-clock', label: '🕐 Ura' },
    { key: 'labor', label: '👥 Stroški dela' },
    { key: 'coverage', label: '✅ Pokritost' },
    { key: 'swaps', label: '🔄 Zamenjave', count: swaps?.pending || 0 },
    { key: 'stats', label: '📊 Statistika' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">⏰ Izemene V2</h2>
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
          {tab === 'current' && current && (
            <div>
              {current.shifts?.map((s: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8, borderLeft: `4px solid ${s.status === 'active' ? '#22c55e' : '#3b82f6'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{s.start} - {s.end}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ background: s.status === 'active' ? '#dcfce7' : '#dbeafe', color: s.status === 'active' ? '#16a34a' : '#2563eb', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{s.status === 'active' ? 'Aktivna' : 'Napovedana'}</span>
                      {s.labor_cost > 0 && <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{s.labor_cost} €</div>}
                    </div>
                  </div>
                  {s.employees?.map((e: any, j: number) => (
                    <div key={j} className="card" style={{ padding: 8, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontWeight: 600 }}>{e.name}</span>
                        <span style={{ marginLeft: 8, fontSize: 11, color: '#888' }}>{e.role}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {e.clock_in ? `${e.clock_in} - ${e.clock_out || '...'}` : 'Ni prišel'} · {e.hours_worked}h
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {tab === 'weekly' && weekly && (
            <div>
              {weekly.days?.map((d: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>{d.day} ({d.date})</div>
                  {d.shifts?.map((s: any, j: number) => (
                    <div key={j} className="card" style={{ padding: 8, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontWeight: 600 }}>{s.name}</span>
                        <span style={{ marginLeft: 8, fontSize: 12, color: '#888' }}>{s.time}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: '#666' }}>{s.employees?.join(', ')}</span>
                        <span style={{ fontWeight: 600, fontSize: 12 }}>{s.labor_cost} €</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              <div className="card" style={{ padding: 14, marginTop: 8, textAlign: 'center', fontWeight: 600 }}>
                Skupaj stroški dela: {weekly.total_labor_cost} €
              </div>
            </div>
          )}

          {tab === 'time-clock' && timeClock && (
            <div>
              <h4 style={{ margin: '0 0 8px' }}>🕐 Aktivni</h4>
              {timeClock.active_clocks?.map((c: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8, borderLeft: '4px solid #22c55e' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{c.employee}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{c.role} · Prišel ob {c.clock_in}</div>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#22c55e' }}>{c.hours_worked}h</div>
                  </div>
                </div>
              ))}
              <h4 style={{ margin: '16px 0 8px' }}>📋 Vsi danes</h4>
              {timeClock.today_records?.map((r: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>{r.employee}</span>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    {r.clock_in || '-'} - {r.clock_out || '...'} · {r.hours}h · {r.breaks}h pavza
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'labor' && labor && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Skupaj ur', value: labor.total_hours, color: '#3b82f6' },
                  { label: 'Skupaj stroški', value: `${labor.total_cost} €`, color: '#22c55e' },
                  { label: 'Nadur', value: `${labor.overtime_hours}h`, color: '#f59e0b' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {labor.by_employee?.map((e: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{e.name}</span>
                    <span style={{ fontWeight: 700, color: '#22c55e' }}>{e.cost} €</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    {e.hours} ur · {e.hourly_rate} €/h {e.overtime > 0 ? `· +${e.overtime}h nadur` : ''}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'coverage' && coverage && (
            <div>
              <div className="card" style={{ padding: 14, marginBottom: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#888' }}>Skupaj pokritost</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: coverage.today?.overall_coverage >= 80 ? '#22c55e' : '#f59e0b' }}>{coverage.today?.overall_coverage}%</div>
              </div>
              {coverage.today?.by_role?.map((r: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{r.role}</span>
                    <span style={{ color: r.coverage >= 100 ? '#22c55e' : '#f59e0b' }}>{r.coverage}%</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: 4, height: 6 }}>
                    <div style={{ background: r.coverage >= 100 ? '#22c55e' : '#f59e0b', height: '100%', borderRadius: 4, width: `${r.coverage}%` }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Potrebno: {r.required} · Na razpolago: {r.scheduled}</div>
                </div>
              ))}
              {coverage.gaps?.length > 0 && <h4 style={{ margin: '16px 0 8px' }}>⚠️ Luknje</h4>}
              {coverage.gaps?.map((g: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 6, borderLeft: `4px solid ${g.severity === 'high' ? '#ef4444' : '#f59e0b'}` }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{g.time} — {g.role}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>{g.suggestion}</div>
                </div>
              ))}
            </div>
          )}

          {tab === 'swaps' && swaps && (
            <div>
              {swaps.requests?.map((r: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8, borderLeft: `4px solid ${r.status === 'approved' ? '#22c55e' : '#f59e0b'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontWeight: 600 }}>{r.from} → {r.to}</div>
                    <span style={{ background: r.status === 'approved' ? '#dcfce7' : '#fef3c7', color: r.status === 'approved' ? '#16a34a' : '#d97706', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{r.status === 'approved' ? 'Potrjeno' : 'V čakanju'}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>{r.date} · {r.shift} · {r.reason}</div>
                </div>
              ))}
            </div>
          )}

          {tab === 'stats' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Aktivne izmene', value: current?.total_active || 0, color: '#22c55e' },
                { label: 'Zaposleni danes', value: current?.total_employees_today || 0, color: '#3b82f6' },
                { label: 'Ure danes', value: current?.total_hours_today || 0, color: '#8b5cf6' },
                { label: 'Stroški danes', value: `${current?.labor_cost_today || 0} €`, color: '#22c55e' },
                { label: 'Tedenski stroški', value: `${weekly?.total_labor_cost || 0} €`, color: '#f59e0b' },
                { label: 'Nadure', value: `${labor?.overtime_hours || 0}h`, color: '#ef4444' },
                { label: 'Pokritost', value: `${coverage?.today?.overall_coverage || 0}%`, color: coverage?.today?.overall_coverage >= 80 ? '#22c55e' : '#f59e0b' },
                { label: 'Zamenjave', value: swaps?.pending || 0, color: '#3b82f6' },
              ].map((s, i) => (
                <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}