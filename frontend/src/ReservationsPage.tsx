import { useState, useEffect } from 'react'
import * as api from './api'

export default function ReservationsPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [reservations, setReservations] = useState<any[]>([])
  const [tables, setTables] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [filter, setFilter] = useState('today')
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar')
  const [selDate, setSelDate] = useState(new Date().toISOString().slice(0, 10))
  const [form, setForm] = useState({
    customer_name: '', customer_phone: '', customer_email: '',
    guests: '2', reservation_time: '', table_id: '', notes: ''
  })

  const resetForm = () => setForm({
    customer_name: '', customer_phone: '', customer_email: '',
    guests: '2', reservation_time: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    table_id: '', notes: ''
  })

  const load = async () => {
    try { const t = await api.getTables(); setTables(t) } catch {}
    try {
      let r
      if (filter === 'today') {
        r = await fetch(`/api/v1/reservations/today?date=${selDate}`, { headers: api.h() }).then(r => r.json())
      } else {
        const q = selDate ? `?date_from=${selDate}T00:00:00&date_to=${selDate}T23:59:59` : ''
        r = await fetch(`/api/v1/reservations${q}`, { headers: api.h() }).then(r => r.json())
      }
      setReservations(r)
    } catch {}
  }
  useEffect(() => { load() }, [filter, selDate])

  const save = async () => {
    if (!form.customer_name || !form.reservation_time) return
    const payload = {
      customer_name: form.customer_name, customer_phone: form.customer_phone,
      customer_email: form.customer_email, guests: parseInt(form.guests) || 2,
      reservation_time: new Date(form.reservation_time).toISOString(),
      table_id: form.table_id ? parseInt(form.table_id) : null, notes: form.notes,
      branch_id: api.branchId() || undefined
    }
    if (editing) {
      await fetch(`/api/v1/reservations/${editing.id}`, { method: 'PUT', headers: { ...api.h(), 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      onNotify(`Rezervacija #${editing.id} posodobljena`)
    } else {
      await fetch('/api/v1/reservations', { method: 'POST', headers: { ...api.h(), 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      onNotify('Rezervacija dodana')
    }
    setShowForm(false); setEditing(null); load()
  }

  const editRes = (r: any) => {
    setEditing(r)
    setForm({
      customer_name: r.customer_name, customer_phone: r.customer_phone || '',
      customer_email: r.customer_email || '',
      guests: String(r.guests), reservation_time: r.reservation_time.slice(0, 16),
      table_id: r.table_id ? String(r.table_id) : '', notes: r.notes || ''
    })
    setShowForm(true)
  }

  const actionRes = async (id: number, action: string) => {
    await fetch(`/api/v1/reservations/${id}/${action}`, { method: 'POST', headers: api.h() })
    onNotify(`Rezervacija #${id}: ${action}`); load()
  }

  const deleteRes = async (id: number) => {
    if (!confirm('Izbrišem rezervacijo?')) return
    await fetch(`/api/v1/reservations/${id}`, { method: 'DELETE', headers: api.h() })
    onNotify('Rezervacija izbrisana'); load()
  }

  const statusColor: Record<string, string> = { confirmed: '#3b82f6', seated: '#22c55e', cancelled: '#ef4444', no_show: '#f97316' }
  const statusLabel: Record<string, string> = { confirmed: 'Potrjeno', seated: 'Sedeči', cancelled: 'Preklicano', no_show: 'Ni prišel' }

  // Calendar timeline
  const HOURS = Array.from({ length: 16 }, (_, i) => i + 7)
  const minTime = HOURS[0] * 60
  const maxTime = (HOURS[HOURS.length - 1] + 1) * 60

  const toMinutes = (iso: string) => {
    const d = new Date(iso)
    return d.getHours() * 60 + d.getMinutes()
  }

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">📅 Rezervacije</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="date" className="input" value={selDate} onChange={e => setSelDate(e.target.value)}
            style={{ width: 150, fontSize: 13 }} />
          <select className="input" value={viewMode} onChange={e => setViewMode(e.target.value as any)} style={{ width: 100 }}>
            <option value="calendar">📅 Koledar</option>
            <option value="list">📋 Seznam</option>
          </select>
          <button onClick={() => { setShowForm(true); setEditing(null); resetForm() }} className="btn btn-primary btn-sm">+ Rezervacija</button>
          <button onClick={async () => {
            try {
              const r = await fetch('/api/v1/reservations/send-pending-reminders', { method: 'POST', headers: api.h() }).then(r => r.json())
              if (r.skipped) onNotify('⏰ Samodejni opomniki niso omogočeni (vklopi v Nastavitvah)')
              else onNotify(`📧 Opomniki poslani: ${r.sent}/${r.total}`)
            } catch { onNotify('❌ Napaka pri pošiljanju opomnikov') }
          }} className="btn btn-sm btn-ghost" title="Pošlji čakajoče opomnike">📨</button>
        </div>
      </div>

      {showForm && (
        <div className="overlay" onClick={() => { setShowForm(false); setEditing(null) }}>
          <div className="modal modal-card" onClick={e => e.stopPropagation()}>
            <h3>{editing ? 'Uredi rezervacijo' : 'Nova rezervacija'}</h3>
            <input className="input" placeholder="Ime *" value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input className="input" placeholder="Telefon" value={form.customer_phone} onChange={e => setForm({ ...form, customer_phone: e.target.value })} style={{ flex: 1 }} />
              <input className="input" placeholder="Email" value={form.customer_email} onChange={e => setForm({ ...form, customer_email: e.target.value })} style={{ flex: 1 }} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input className="input" type="number" placeholder="Oseb *" value={form.guests} onChange={e => setForm({ ...form, guests: e.target.value })} style={{ width: 80 }} />
              <input className="input" type="datetime-local" value={form.reservation_time} onChange={e => setForm({ ...form, reservation_time: e.target.value })} style={{ flex: 1 }} />
              <select className="input" value={form.table_id} onChange={e => setForm({ ...form, table_id: e.target.value })} style={{ flex: 1 }}>
                <option value="">Brez mize</option>
                {tables.map(t => <option key={t.id} value={t.id}>{t.name} ({t.capacity})</option>)}
              </select>
            </div>
            <textarea className="input" placeholder="Opombe" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ marginTop: 8, minHeight: 50, resize: 'vertical' }} />
            <div className="modal-btns">
              <button onClick={save} className="btn btn-primary" disabled={!form.customer_name || !form.reservation_time}>Shrani</button>
              <button onClick={() => { setShowForm(false); setEditing(null) }} className="btn btn-ghost">Prekliči</button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Timeline View */}
      {viewMode === 'calendar' ? (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <div style={{ position: 'relative', minHeight: (HOURS.length * 60 + 30), padding: 0 }}>
            {/* Hour labels */}
            {HOURS.map(h => (
              <div key={h} style={{
                position: 'absolute', top: (h - HOURS[0]) * 60, left: 0, right: 0,
                borderTop: '1px solid var(--border)', height: 60, paddingLeft: 8,
                fontSize: 11, color: 'var(--text2)', display: 'flex', alignItems: 'flex-start', paddingTop: 2
              }}>
                {h.toString().padStart(2, '0')}:00
              </div>
            ))}
            {/* Reservation blocks */}
            {reservations.filter(r => r.status !== 'cancelled').map(r => {
              const mins = toMinutes(r.reservation_time)
              const top = ((mins - HOURS[0] * 60) / (maxTime - HOURS[0] * 60)) * (HOURS.length * 60)
              const dur = Math.max(45, r.guests * 15) // estimate duration
              const height = Math.max(24, (dur / 60) * 60)
              if (mins < HOURS[0] * 60 || mins > maxTime) return null
              return (
                <div key={r.id} style={{
                  position: 'absolute', top, left: 70, right: 8, height,
                  background: statusColor[r.status] || '#3b82f6', borderRadius: 6,
                  padding: '3px 8px', cursor: 'pointer', opacity: r.status === 'no_show' ? 0.5 : 0.9,
                  display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)', zIndex: 10,
                  transition: 'transform 0.1s'
                }}
                  onClick={() => editRes(r)}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                  title={`${r.customer_name} (${r.guests} oseb) — ${r.table_name || 'Brez mize'}${r.reminder_sent > 0 ? ' [Opomnik poslan]' : ''}`}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#fff', whiteSpace: 'nowrap' }}>
                    {new Date(r.reservation_time).toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span style={{ fontSize: 13, color: '#fff', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.customer_name} ({r.guests})
                  </span>
                  {r.status === 'confirmed' && (
                    <span style={{ display: 'flex', gap: 3, marginLeft: 'auto' }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => actionRes(r.id, 'seat')} className="btn btn-xs" style={{ background: 'rgba(255,255,255,0.3)', color: '#fff', border: 'none' }}>✅</button>
                      <button onClick={() => actionRes(r.id, 'cancel')} className="btn btn-xs" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none' }}>✕</button>
                    </span>
                  )}
                </div>
              )
            })}
            {reservations.filter(r => r.status !== 'cancelled').length === 0 && (
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'var(--text2)', fontSize: 14 }}>
                Ni rezervacij za ta dan
              </div>
            )}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="card">
          {reservations.length === 0 ? (
            <p style={{ color: 'var(--text2)', padding: 16, textAlign: 'center' }}>Ni rezervacij</p>
          ) : (
            <div style={{ fontSize: 14 }}>
              {reservations.map(r => {
                const time = new Date(r.reservation_time)
                const timeStr = time.toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' })
                const past = time < new Date() && r.status === 'confirmed'
                return (
                  <div key={r.id} className="item-row" style={{
                    padding: '10px 12px', borderLeft: `3px solid ${statusColor[r.status] || 'var(--border)'}`,
                    borderBottom: '1px solid var(--border)', opacity: r.status === 'cancelled' ? 0.5 : 1
                  }}>
                    <div className="item-info">
                      <span className="item-name">
                        <span style={{ fontWeight: 700, marginRight: 8, fontSize: 15 }}>{timeStr}</span>
                        {r.customer_name}
                        <span style={{ marginLeft: 8, color: 'var(--text2)', fontWeight: 400 }}>({r.guests} oseb)</span>
                      </span>
                      <span className="item-desc">
                        {r.table_name || 'Brez mize'}
                        {r.customer_phone ? ` • ${r.customer_phone}` : ''}
                        {r.notes ? ` • ${r.notes}` : ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span className={`badge ${r.status === 'confirmed' ? 'badge-blue' : r.status === 'seated' ? 'badge-green' : r.status === 'cancelled' ? 'badge-red' : 'badge-amber'}`}>
                        {statusLabel[r.status] || r.status}
                      </span>
                      {past && <span style={{ fontSize: 10, color: 'var(--red)' }}>⚠️</span>}
                      {r.status === 'confirmed' && (
                        <>
                          <button onClick={() => actionRes(r.id, 'seat')} className="btn btn-xs btn-green" title="Sedeči">✅</button>
                          <button onClick={() => actionRes(r.id, 'cancel')} className="btn btn-xs btn-ghost" title="Prekliči">✕</button>
                          <button onClick={() => actionRes(r.id, 'no-show')} className="btn btn-xs btn-ghost" title="Ni prišel">🚫</button>
                        </>
                      )}
                      <button onClick={() => editRes(r)} className="btn btn-xs btn-ghost">✏️</button>
                      <button onClick={() => deleteRes(r.id)} className="btn btn-xs btn-ghost">🗑️</button>
                      {r.customer_email && (
                        <>
                          <button onClick={async () => {
                            try {
                              const res = await fetch(`/api/v1/reservations/${r.id}/send-reminder`, { method: 'POST', headers: api.h() }).then(r => r.json())
                              onNotify(`✅ Opomnik poslan ${r.customer_email}`); load()
                            } catch { onNotify('❌ Napaka pri pošiljanju') }
                          }} className="btn btn-xs btn-blue" title="Pošlji opomnik">📧</button>
                          {r.reminder_sent > 0 && <span style={{ fontSize: 10, color: '#22c55e' }}>✉️{r.reminder_sent}</span>}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
