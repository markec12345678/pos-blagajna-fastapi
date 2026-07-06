import { useState, useEffect } from 'react'

const DOWS = ['Ponedeljek', 'Torek', 'Sreda', 'Četrtek', 'Petek', 'Sobota', 'Nedelja']
const API = '/api/v1/schedule'
const auth = () => ({ 'Authorization': 'Bearer ' + localStorage.getItem('token'), 'Content-Type': 'application/json' })

interface ShiftRow { id: number; user_id: number; user_name: string; date: string; start_time: string; end_time: string; role: string; notes: string; status: string }
interface Employee { id: number; name: string; role: string }

export default function SchedulePage({ onNotify }: { onNotify: (m: string) => void }) {
  const [weekData, setWeekData] = useState<any>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [monday, setMonday] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return d.toISOString().slice(0, 10)
  })
  const [editModal, setEditModal] = useState<{ id?: number; user_id: number; date: string; start_time: string; end_time: string; role: string; notes: string } | null>(null)

  const load = () => {
    setLoading(true)
    Promise.all([
      fetch(`${API}/week?date=${monday}`, { headers: auth() }).then(r => r.json()),
      fetch(`${API}/employees`, { headers: auth() }).then(r => r.json())
    ]).then(([w, e]) => { setWeekData(w); setEmployees(e) }).catch(() => onNotify('Napaka pri nalaganju'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [monday])

  const navWeek = (dir: number) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + dir * 7)
    setMonday(d.toISOString().slice(0, 10))
  }

  const saveShift = async () => {
    if (!editModal) return
    const body = editModal
    try {
      if (editModal.id) {
        await fetch(`${API}/shifts/${editModal.id}`, { method: 'PUT', headers: auth(), body: JSON.stringify(body) })
      } else {
        await fetch(`${API}/shifts`, { method: 'POST', headers: auth(), body: JSON.stringify(body) })
      }
      onNotify(editModal.id ? 'Posodobljeno' : 'Dodano')
      setEditModal(null); load()
    } catch { onNotify('Napaka') }
  }

  const deleteShift = async (id: number) => {
    if (!confirm('Izbrišem izmeno?')) return
    await fetch(`${API}/shifts/${id}`, { method: 'DELETE', headers: auth() })
    onNotify('Izbrisano'); load()
  }

  return (
    <div className="page-container" style={{ maxWidth: 1000, margin: '0 auto', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>📅 Urnik</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => navWeek(-1)} className="btn btn-sm btn-ghost">‹ Prejšnji</button>
          <span style={{ fontSize: 14, fontWeight: 600, minWidth: 220, textAlign: 'center' }}>
            {weekData ? `${weekData.monday} – ${weekData.sunday}` : '...'}
          </span>
          <button onClick={() => navWeek(1)} className="btn btn-sm btn-ghost">Naslednji ›</button>
          <button onClick={() => setMonday(new Date().toISOString().slice(0, 10))} className="btn btn-sm btn-ghost">Danes</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>⏳ Nalagam...</div>
      ) : weekData ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {weekData.days.map((day: any, idx: number) => (
            <div key={day.date} className="card" style={{ padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{DOWS[idx]}</span>
                  <span style={{ color: 'var(--text2)', fontSize: 12, marginLeft: 8 }}>{day.date}</span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>{day.shifts.length} izmen</span>
              </div>
              {day.shifts.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0 }}>Ni izmen</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {day.shifts.map((s: any) => {
                    const isToday = day.date === new Date().toISOString().slice(0, 10)
                    return (
                      <div key={s.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '6px 10px', borderRadius: 6, fontSize: 13,
                        background: s.status === 'cancelled' ? 'rgba(239,68,68,0.08)' : isToday ? 'rgba(59,130,246,0.06)' : 'var(--bg)',
                        borderLeft: s.status === 'cancelled' ? '3px solid #ef4444' : isToday ? '3px solid #3b82f6' : '3px solid transparent'
                      }}>
                        <div>
                          <span style={{ fontWeight: 600 }}>{s.user_name}</span>
                          {s.role && <span style={{ color: 'var(--text2)', fontSize: 11, marginLeft: 6 }}>{s.role}</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 500 }}>{s.start_time} – {s.end_time}</span>
                          {s.notes && <span style={{ fontSize: 11, color: 'var(--text2)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.notes}</span>}
                          {s.status === 'cancelled' && <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 600 }}>PREKLIC</span>}
                          <button onClick={() => setEditModal({
                            id: s.id, user_id: s.user_id, date: day.date,
                            start_time: s.start_time, end_time: s.end_time,
                            role: s.role, notes: s.notes
                          })} className="btn btn-sm btn-ghost" style={{ fontSize: 11 }}>✎</button>
                          <button onClick={() => deleteShift(s.id)} className="btn btn-sm btn-ghost" style={{ fontSize: 11, color: '#ef4444' }}>✕</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              <button onClick={() => setEditModal({
                user_id: employees[0]?.id || 0, date: day.date,
                start_time: '08:00', end_time: '16:00', role: '', notes: ''
              })} className="btn btn-sm btn-ghost" style={{ marginTop: 6, fontSize: 11 }}>+ Dodaj izmeno</button>
            </div>
          ))}
        </div>
      ) : null}

      {editModal && (
        <div className="overlay" onClick={() => setEditModal(null)}>
          <div className="modal modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h3 style={{ marginTop: 0 }}>{editModal.id ? 'Uredi izmeno' : 'Nova izmena'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <select className="input" value={editModal.user_id} onChange={e => setEditModal({ ...editModal, user_id: parseInt(e.target.value) })}>
                <option value={0}>— Izberi zaposlenega —</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}
              </select>
              <input className="input" type="date" value={editModal.date} onChange={e => setEditModal({ ...editModal, date: e.target.value })} />
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" type="time" value={editModal.start_time} onChange={e => setEditModal({ ...editModal, start_time: e.target.value })} style={{ flex: 1 }} />
                <input className="input" type="time" value={editModal.end_time} onChange={e => setEditModal({ ...editModal, end_time: e.target.value })} style={{ flex: 1 }} />
              </div>
              <input className="input" placeholder="Vloga (npr. natakar, kuhar)" value={editModal.role} onChange={e => setEditModal({ ...editModal, role: e.target.value })} />
              <textarea className="input" placeholder="Opomba" value={editModal.notes} onChange={e => setEditModal({ ...editModal, notes: e.target.value })} style={{ minHeight: 50 }} />
            </div>
            <div className="modal-btns" style={{ marginTop: 16 }}>
              <button onClick={saveShift} className="btn btn-primary" disabled={!editModal.user_id}>Shrani</button>
              <button onClick={() => setEditModal(null)} className="btn btn-ghost">Prekliči</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
