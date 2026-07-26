import React, { useState, useEffect, useRef } from 'react'

interface Shift {
  id: number; user_id: number; employee_name: string; date: string;
  start_time: string; end_time: string; role: string; notes: string
}

interface Employee { id: number; name: string; role: string }

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6) // 6:00 - 21:00
const DAY_NAMES = ['Pon', 'Tor', 'Sre', 'Čet', 'Pet', 'Sob', 'Ned']
const ROLES = ['Natačnik', 'Kuhar', 'Vodja', 'Pomočnik']

import { autoSchedule } from './api'

export default function ScheduleCalendarPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return d.toISOString().split('T')[0]
  })
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addDate, setAddDate] = useState('')
  const [addStart, setAddStart] = useState('08:00')
  const [addEnd, setAddEnd] = useState('16:00')
  const [addEmployee, setAddEmployee] = useState<number>(0)
  const [addRole, setAddRole] = useState('')
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [dragShift, setDragShift] = useState<Shift | null>(null)
  const [view, setView] = useState<'calendar' | 'stats'>('calendar')

  const headers = { ...JSON.parse(localStorage.getItem('auth') || '{}').headers }

  useEffect(() => { loadCalendar(); loadStats() }, [weekStart])

  const loadCalendar = async () => {
    setLoading(true)
    try {
      const end = new Date(weekStart)
      end.setDate(end.getDate() + 6)
      const r = await fetch(`/api/v1/schedule-calendar/?start=${weekStart}&end=${end.toISOString().split('T')[0]}`, { headers })
        .then(r => r.json())
      setShifts(r.shifts || [])
      setEmployees(r.employees || [])
    } catch { onNotify('Napaka') }
    setLoading(false)
  }

  const loadStats = async () => {
    try {
      const end = new Date(weekStart); end.setDate(end.getDate() + 6)
      const r = await fetch(`/api/v1/schedule-calendar/stats?start=${weekStart}&end=${end.toISOString().split('T')[0]}`, { headers })
        .then(r => r.json())
      setStats(r)
    } catch {}
  }

  const handleAutoSchedule = async () => {
    try {
      const end = new Date(weekStart); end.setDate(end.getDate() + 6)
      const r = await autoSchedule(weekStart, end.toISOString().split('T')[0])
      if (r.created > 0) {
        onNotify(`Avtomatsko generiranih ${r.created} izmen`)
        loadCalendar()
        loadStats()
      } else {
        onNotify('Ni prostih terminov za avtomatsko generiranje')
      }
    } catch { onNotify('Napaka') }
  }

  const getWeekDates = () => {
    const dates = []
    const start = new Date(weekStart)
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      dates.push(d.toISOString().split('T')[0])
    }
    return dates
  }

  const prevWeek = () => {
    const d = new Date(weekStart); d.setDate(d.getDate() - 7)
    setWeekStart(d.toISOString().split('T')[0])
  }

  const nextWeek = () => {
    const d = new Date(weekStart); d.setDate(d.getDate() + 7)
    setWeekStart(d.toISOString().split('T')[0])
  }

  const addShift = async () => {
    if (!addEmployee) { onNotify('Izberite zaposlenega'); return }
    try {
      await fetch('/api/v1/schedule-calendar/', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: addEmployee, date: addDate,
          start_time: addStart, end_time: addEnd, role: addRole
        })
      })
      setShowAddModal(false)
      loadCalendar()
      loadStats()
      onNotify('Izmena dodana')
    } catch { onNotify('Napaka') }
  }

  const deleteShift = async (id: number) => {
    try {
      await fetch(`/api/v1/schedule-calendar/${id}`, { method: 'DELETE', headers })
      loadCalendar()
      loadStats()
      onNotify('Izmena izbrisana')
    } catch { onNotify('Napaka') }
  }

  const handleDragStart = (shift: Shift) => setDragShift(shift)
  const handleDrop = async (date: string) => {
    if (!dragShift) return
    try {
      await fetch(`/api/v1/schedule-calendar/${dragShift.id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ date })
      })
      setDragShift(null)
      loadCalendar()
      loadStats()
    } catch { onNotify('Napaka pri premikanju') }
  }

  const weekDates = getWeekDates()

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ margin: '0 0 16px' }}>📅 Koledar urnika</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={prevWeek} className="btn btn-sm btn-ghost">←</button>
        <span style={{ fontWeight: 600 }}>{weekStart}</span>
        <button onClick={nextWeek} className="btn btn-sm btn-ghost">→</button>
        <button onClick={() => {
          const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1)
          setWeekStart(d.toISOString().split('T')[0])
        }} className="btn btn-sm btn-ghost">Danes</button>
        <div style={{ flex: 1 }} />
        <button onClick={() => setView(view === 'calendar' ? 'stats' : 'calendar')} className="btn btn-sm btn-ghost">
          {view === 'calendar' ? '📊 Statistika' : '📅 Koledar'}
        </button>
        <button onClick={handleAutoSchedule} className="btn btn-sm btn-ghost" title="Avtomatsko generiraj urnik">
          🤖 Auto
        </button>
        <button onClick={() => setShowAddModal(true)} className="btn btn-sm btn-primary">+ Dodaj izmeno</button>
      </div>

      {view === 'stats' && stats && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
            <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>⏱️ {stats.total_hours}h</div>
              <div style={{ fontSize: 11, color: '#888' }}>Skupaj ur</div>
            </div>
            <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>👥 {stats.employee_stats?.length || 0}</div>
              <div style={{ fontSize: 11, color: '#888' }}>Zaposlenih</div>
            </div>
          </div>
          <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Ure po zaposlenem</h3>
            {(stats.employee_stats || []).map((emp: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                <span>{emp.name}</span>
                <span><strong>{emp.total_hours}h</strong> ({emp.shift_count} izmen)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'calendar' && (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '100px repeat(7, 1fr)', gap: 1, minWidth: 700 }}>
            {/* Header */}
            <div style={{ background: '#f3f4f6', padding: 8, fontWeight: 600, fontSize: 12, borderRadius: '8px 0 0 0' }} />
            {weekDates.map((d, i) => (
              <div key={i} style={{
                background: d === new Date().toISOString().split('T')[0] ? '#e0f2fe' : '#f3f4f6',
                padding: 8, textAlign: 'center', fontWeight: 600, fontSize: 12,
                borderRadius: i === 6 ? '0 8px 0 0' : 0
              }}>
                {DAY_NAMES[i]}
                <div style={{ fontSize: 10, color: '#888' }}>{d.split('-')[2]}.{d.split('-')[1]}</div>
              </div>
            ))}

            {/* Employee rows */}
            {employees.filter(e => !selectedEmployee || e.id === selectedEmployee).map(emp => (
              <React.Fragment key={emp.id}>
                <div style={{
                  padding: 8, fontSize: 12, fontWeight: 500,
                  background: '#fff', borderBottom: '1px solid #eee',
                  display: 'flex', alignItems: 'center', gap: 4
                }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                    {emp.name.charAt(0)}
                  </div>
                  {emp.name.split(' ')[0]}
                </div>
                {weekDates.map((date, di) => {
                  const dayShifts = shifts.filter(s => s.user_id === emp.id && s.date === date)
                  return (
                    <div key={di}
                      onDragOver={e => e.preventDefault()}
                      onDrop={() => handleDrop(date)}
                      style={{
                        background: di % 2 === 0 ? '#fff' : '#fafafa',
                        padding: 4, minHeight: 60, borderBottom: '1px solid #eee'
                      }}>
                      {dayShifts.map(s => (
                        <div key={s.id}
                          draggable
                          onDragStart={() => handleDragStart(s)}
                          style={{
                            background: '#dbeafe', borderRadius: 6, padding: '4px 6px', marginBottom: 2,
                            fontSize: 10, cursor: 'grab', borderLeft: '3px solid #3b82f6',
                            position: 'relative'
                          }}>
                          <div style={{ fontWeight: 600 }}>{s.start_time}–{s.end_time}</div>
                          {s.role && <div style={{ color: '#666' }}>{s.role}</div>}
                          <button onClick={(e) => { e.stopPropagation(); deleteShift(s.id) }}
                            style={{ position: 'absolute', top: 2, right: 2, background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: '#ef4444' }}>
                            ×
                          </button>
                        </div>
                      ))}
                      <button onClick={() => {
                        setAddDate(date); setAddEmployee(emp.id); setShowAddModal(true)
                      }} style={{ width: '100%', background: 'none', border: '1px dashed #ddd', borderRadius: 4, padding: 4, cursor: 'pointer', fontSize: 16, color: '#ccc' }}>
                        +
                      </button>
                    </div>
                  )
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Add modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: '#00000050', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 24, width: '90%', maxWidth: 400 }}>
            <h3 style={{ marginTop: 0 }}>➕ Nova izmena</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#888' }}>Datum</label>
                <input type="date" className="input" value={addDate} onChange={e => setAddDate(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888' }}>Zaposleni</label>
                <select className="input" value={addEmployee} onChange={e => setAddEmployee(parseInt(e.target.value))}>
                  <option value={0}>Izberi...</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#888' }}>Začetek</label>
                  <input type="time" className="input" value={addStart} onChange={e => setAddStart(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#888' }}>Konec</label>
                  <input type="time" className="input" value={addEnd} onChange={e => setAddEnd(e.target.value)} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888' }}>Vloga</label>
                <select className="input" value={addRole} onChange={e => setAddRole(e.target.value)}>
                  <option value="">Brez</option>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAddModal(false)} className="btn btn-ghost">Prekliči</button>
              <button onClick={addShift} className="btn btn-primary">Shrani</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
