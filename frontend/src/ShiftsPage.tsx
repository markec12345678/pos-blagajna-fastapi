import { useState, useEffect } from 'react'
import * as api from './api'
import { useBulkSelection } from './useBulkSelection'
import { useListNavigation } from './useListNavigation'

export default function ShiftsPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [users, setUsers] = useState<any[]>([])
  const [active, setActive] = useState<any[]>([])
  const [shifts, setShifts] = useState<any[]>([])
  const [selUser, setSelUser] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [hourlyWage, setHourlyWage] = useState(10)
  const [swapRequests, setSwapRequests] = useState<any[]>([])
  const [showSwapForm, setShowSwapForm] = useState(false)
  const [swapForm, setSwapForm] = useState({ shift_date: '', original_start: '', original_end: '', target_user_id: 0, type: 'swap', notes: '' })
  const bulk = useBulkSelection(shifts)
  const shiftsNav = useListNavigation(shifts.length, (idx) => {
    const s = shifts[idx]
    if (bulk.bulkMode) { bulk.toggle(s.id); return }
  })

  const load = async () => {
    setLoading(true)
    try {
      const u = await api.getUsers()
      setUsers(u)
    } catch { onNotify('Napaka pri nalaganju uporabnikov') }
    try {
      const r = await fetch('/api/v1/shifts/active', { headers: api.h() })
      setActive(await r.json())
    } catch { onNotify('Napaka pri nalaganju aktivnih izmen') }
    try {
      const r = await fetch('/api/v1/shifts?date_from=' + new Date(new Date().setHours(0,0,0,0)).toISOString().slice(0,19), { headers: api.h() })
      setShifts(await r.json())
    } catch { onNotify('Napaka pri nalaganju izmen') }
    try {
      const s = await fetch('/api/v1/settings', { headers: api.h() }).then(r => r.json())
      if (s.hourly_wage) setHourlyWage(parseFloat(s.hourly_wage) || 10)
    } catch {}
    try { setSwapRequests(await api.listSwapRequests('all')) } catch {}
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

  const handleBulkClose = async () => {
    if (!confirm(`Zaprem ${bulk.selectedCount} izmen?`)) return
    try {
      const r = await api.bulkCloseShifts([...bulk.selectedIds])
      onNotify(`Zaprtih ${r.closed} izmen`)
      bulk.clear(); load()
    } catch (e: any) { onNotify(e.message) }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Izbrišem ${bulk.selectedCount} izmen?`)) return
    try {
      const r = await api.bulkDeleteShifts([...bulk.selectedIds])
      onNotify(`Izbrisanih ${r.deleted} izmen`)
      bulk.clear(); load()
    } catch (e: any) { onNotify(e.message) }
  }

  const submitSwapRequest = async () => {
    if (!swapForm.shift_date || !swapForm.original_start || !swapForm.original_end) { onNotify('Izpolni vsa polja'); return }
    try {
      await api.createSwapRequest(swapForm)
      onNotify('Zahteva poslana')
      setShowSwapForm(false); setSwapRequests(await api.listSwapRequests('all'))
    } catch (e: any) { onNotify(e.message) }
  }

  const respondToSwap = async (id: number, status: string) => {
    try {
      await api.respondSwapRequest(id, status)
      onNotify(status === 'approved' ? 'Odobreno' : 'Zavrnjeno')
      setSwapRequests(await api.listSwapRequests('all'))
    } catch (e: any) { onNotify(e.message) }
  }

  const cancelSwap = async (id: number) => {
    try {
      await api.cancelSwapRequest(id)
      onNotify('Zahteva preklicana')
      setSwapRequests(await api.listSwapRequests('all'))
    } catch (e: any) { onNotify(e.message) }
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h4>Današnje izmene</h4>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={bulk.toggleBulkMode} className="btn btn-sm" style={{ background: bulk.bulkMode ? 'var(--amber)' : 'var(--surface2)', border: '1px solid var(--border)' }}>
            {bulk.bulkMode ? '✕ Prekliči' : '☑️ Paketno'}
          </button>
          {bulk.bulkMode && bulk.selectedCount > 0 && (
            <>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>{bulk.selectedCount} izbranih</span>
              <button onClick={handleBulkClose} className="btn btn-sm" style={{ background: 'var(--blue)', color: '#fff' }}>🔒 Zapri ({bulk.selectedCount})</button>
              <button onClick={handleBulkDelete} className="btn btn-sm" style={{ background: 'var(--red)', color: '#fff' }}>🗑️ Izbriši</button>
            </>
          )}
        </div>
      </div>
      <div className="card">
        {shifts.length === 0 ? (
          <p style={{ color: 'var(--text2)', padding: 8, fontSize: 13 }}>Ni izmen</p>
        ) : (
          shifts.map((s, idx) => (
            <div key={s.id} className="item-row" data-list-idx={idx} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, cursor: bulk.bulkMode ? 'pointer' : undefined }}
              onClick={() => bulk.bulkMode && bulk.toggle(s.id)}>
              {bulk.bulkMode && (
                <input type="checkbox" checked={bulk.isSelected(s.id)} onChange={() => bulk.toggle(s.id)}
                  onClick={e => e.stopPropagation()}
                  style={{ width: 18, height: 18, accentColor: 'var(--blue)', flexShrink: 0 }} aria-label={`Izberi izmeno ${s.user_name}`} />
              )}
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

      {/* Swap requests section */}
      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h4>🔄 Zahteve za zamenjave ({swapRequests.filter(r => r.status === 'pending').length} novih)</h4>
          <button onClick={() => { setSwapForm({ shift_date: new Date().toISOString().slice(0,10), original_start: '08:00', original_end: '16:00', target_user_id: 0, type: 'swap', notes: '' }); setShowSwapForm(true) }} className="btn btn-sm btn-primary">+ Nova zahteva</button>
        </div>
        {swapRequests.length === 0 ? (
          <div className="card"><p style={{ color: 'var(--text2)', padding: 8, fontSize: 13 }}>Ni zahtev</p></div>
        ) : (
          <div className="card">
            {swapRequests.map(r => (
              <div key={r.id} className="item-row" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{r.requester_name}</span>
                  <span style={{ fontSize: 12, color: 'var(--text2)', marginLeft: 8 }}>
                    {r.type === 'swap' ? '🔄 Zamenjava' : r.type === 'coverage' ? '🤝 Nadomeščanje' : '❌ Odpoved'}
                    {' • '}{r.shift_date} {r.original_start}–{r.original_end}
                  </span>
                  {r.target_name && <span style={{ fontSize: 12, color: 'var(--blue)', marginLeft: 4 }}>→ {r.target_name}</span>}
                  {r.notes && <div style={{ fontSize: 11, color: 'var(--text2)' }}>📝 {r.notes}</div>}
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span className={`badge ${r.status === 'pending' ? 'badge-amber' : r.status === 'approved' ? 'badge-green' : 'badge-red'}`}>
                    {r.status === 'pending' ? '⏳ V čakanju' : r.status === 'approved' ? '✅ Odobreno' : '❌ Zavrnjeno'}
                  </span>
                  {r.status === 'pending' && (
                    <>
                      <button onClick={() => respondToSwap(r.id, 'approved')} className="btn btn-xs btn-primary">✅</button>
                      <button onClick={() => respondToSwap(r.id, 'rejected')} className="btn btn-xs" style={{ background: 'var(--red)', color: '#fff' }}>❌</button>
                      <button onClick={() => cancelSwap(r.id)} className="btn btn-xs btn-ghost">✕</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New swap request modal */}
      {showSwapForm && (
        <div className="overlay" onClick={() => setShowSwapForm(false)}>
          <div className="modal modal-card" onClick={e => e.stopPropagation()}>
            <h3>🔄 Nova zahteva za zamenjavo</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text2)' }}>Tip zahteve</label>
                <select className="input" value={swapForm.type} onChange={e => setSwapForm(p => ({ ...p, type: e.target.value }))}>
                  <option value="swap">🔄 Zamenjava</option>
                  <option value="coverage">🤝 Nadomeščanje</option>
                  <option value="drop">❌ Odpoved izmene</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text2)' }}>Datum izmene</label>
                <input type="date" className="input" value={swapForm.shift_date} onChange={e => setSwapForm(p => ({ ...p, shift_date: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: 'var(--text2)' }}>Začetek</label>
                  <input type="time" className="input" value={swapForm.original_start} onChange={e => setSwapForm(p => ({ ...p, original_start: e.target.value }))} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: 'var(--text2)' }}>Konec</label>
                  <input type="time" className="input" value={swapForm.original_end} onChange={e => setSwapForm(p => ({ ...p, original_end: e.target.value }))} />
                </div>
              </div>
              {swapForm.type !== 'drop' && (
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text2)' }}>Ciljna oseba (opcijsko)</label>
                  <select className="input" value={swapForm.target_user_id} onChange={e => setSwapForm(p => ({ ...p, target_user_id: parseInt(e.target.value) }))}>
                    <option value={0}>— Kdorkoli —</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={{ fontSize: 12, color: 'var(--text2)' }}>Opombe</label>
                <input className="input" value={swapForm.notes} placeholder="Npr. osebni razlog" onChange={e => setSwapForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div className="modal-btns">
              <button onClick={submitSwapRequest} className="btn btn-primary">Pošlji zahtevo</button>
              <button onClick={() => setShowSwapForm(false)} className="btn btn-ghost">Prekliči</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
