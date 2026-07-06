import { useState, useEffect } from 'react'
import * as api from './api'

export default function ShiftsPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [users, setUsers] = useState<any[]>([])
  const [active, setActive] = useState<any[]>([])
  const [shifts, setShifts] = useState<any[]>([])
  const [selUser, setSelUser] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [hourlyWage, setHourlyWage] = useState(10)

  const load = async () => {
    setLoading(true)
    try {
      const u = await api.getUsers()
      setUsers(u)
    } catch {}
    try {
      const r = await fetch('/api/v1/shifts/active', { headers: api.h() })
      setActive(await r.json())
    } catch {}
    try {
      const r = await fetch('/api/v1/shifts?date_from=' + new Date(new Date().setHours(0,0,0,0)).toISOString().slice(0,19), { headers: api.h() })
      setShifts(await r.json())
    } catch {}
    try {
      const s = await fetch('/api/v1/settings', { headers: api.h() }).then(r => r.json())
      if (s.hourly_wage) setHourlyWage(parseFloat(s.hourly_wage) || 10)
    } catch {}
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  const doClockIn = async (userId: number) => {
    await fetch('/api/v1/shifts/clock-in', {
      method: 'POST', headers: { ...api.h(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    })
    onNotify('Prihod zabeležen'); load(); setSelUser(null)
  }

  const doClockOut = async (shiftId: number) => {
    await fetch(`/api/v1/shifts/${shiftId}/clock-out`, { method: 'POST', headers: api.h() })
    onNotify('Odhod zabeležen'); load()
  }

  const totalHours = shifts.filter(s => s.status === 'completed').reduce((sum, s) => sum + s.hours, 0)
  const laborCost = totalHours * hourlyWage

  if (loading) return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">👥 Evidenca dela</h2>
      </div>
      <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>⏳ Nalaganje...</div>
    </div>
  )

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">👥 Evidenca dela</h2>
        <button onClick={() => { setLoading(true); load().finally(() => setLoading(false)) }} className="btn btn-sm btn-ghost">{loading ? '⏳' : '🔄'}</button>
      </div>

      <div className="stat-grid mb-16" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-value">{active.length}</div>
          <div className="stat-label">Trenutno aktivni</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalHours.toFixed(1)}h</div>
          <div className="stat-label">Ur danes</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{laborCost.toFixed(2)} €</div>
          <div className="stat-label">Strošek dela</div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 12 }}>Povprečna bruto plača: {(laborCost / Math.max(totalHours, 1)).toFixed(2)} €/h</div>

      {/* Who's working now */}
      <div className="card mb-16">
        <h4 style={{ margin: '0 0 8px' }}>🟢 Aktivni zdaj</h4>
        {active.length === 0 ? (
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>Nihče ni prijavljen</p>
        ) : (
          active.map(a => (
            <div key={a.id} className="item-row" style={{ padding: '6px 0' }}>
              <span style={{ fontWeight: 600 }}>{a.user_name}</span>
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                od {new Date(a.clock_in).toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' })}
                {' • '}{a.hours.toFixed(1)}h
              </span>
            </div>
          ))
        )}
      </div>

      {/* Clock-in */}
      <div className="card mb-16">
        <h4 style={{ margin: '0 0 8px' }}>📌 Prijava / Odjava</h4>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!selUser && users.map(u => {
            const isActive = active.some(a => a.user_id === u.id)
            return (
              <button key={u.id} onClick={() => {
                if (isActive) {
                  const s = active.find(a => a.user_id === u.id)
                  doClockOut(s.id)
                } else {
                  doClockIn(u.id)
                }
              }} className={`btn btn-sm ${isActive ? 'btn-danger' : 'btn-primary'}`}
                title={isActive ? 'Odjava' : 'Prijava'}>
                {isActive ? '🔴 ' : '🟢 '}{u.full_name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Today's shifts */}
      <h4 style={{ marginBottom: 8 }}>Današnje izmene</h4>
      <div className="card">
        {shifts.length === 0 ? (
          <p style={{ color: 'var(--text2)', padding: 8, fontSize: 13 }}>Ni izmen</p>
        ) : (
          shifts.map(s => (
            <div key={s.id} className="item-row" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div className="item-info">
                <span className="item-name">{s.user_name}</span>
                <span className="item-desc">
                  {new Date(s.clock_in).toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' })}
                  {' → '}
                  {s.clock_out
                    ? new Date(s.clock_out).toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' })
                    : '—'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>{s.hours.toFixed(1)}h</span>
                <span className={`badge ${s.status === 'active' ? 'badge-green' : 'badge-blue'}`}>
                  {s.status === 'active' ? 'Aktiven' : 'Zaključeno'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
