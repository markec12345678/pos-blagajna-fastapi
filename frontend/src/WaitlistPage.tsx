import { useState, useEffect } from 'react'
import * as api from './api'

const STATUS_LABELS: Record<string, string> = {
  waiting: 'Čaka', notified: 'Obveščen', seated: 'Useden', cancelled: 'Preklican'
}
const STATUS_COLORS: Record<string, string> = {
  waiting: '#f59e0b', notified: '#3b82f6', seated: '#059669', cancelled: '#94a3b8'
}

export default function WaitlistPage({ onNotify }: { onNotify: (m: string) => void }) {
  const [entries, setEntries] = useState<any[]>([])
  const [filter, setFilter] = useState('waiting')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', party_size: 2, notes: '' })

  const load = () => {
    fetch('/api/v1/waitlist', { headers: api.authHeader() })
      .then(r => r.json()).then(setEntries)
  }
  useEffect(() => { load() }, [])

  const addEntry = async () => {
    if (!form.name.trim()) return
    await fetch('/api/v1/waitlist', {
      method: 'POST',
      headers: { ...api.authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    onNotify('Dodano na čakalnico')
    setShowAdd(false)
    setForm({ name: '', phone: '', party_size: 2, notes: '' })
    load()
  }

  const updateStatus = async (id: number, action: string, msg: string) => {
    await fetch(`/api/v1/waitlist/${id}/${action}`, {
      method: 'POST', headers: api.authHeader()
    })
    onNotify(msg)
    load()
  }

  const del = async (id: number) => {
    if (!confirm('Izbriši?')) return
    await fetch(`/api/v1/waitlist/${id}`, {
      method: 'DELETE', headers: api.authHeader()
    })
    onNotify('Izbrisano')
    load()
  }

  const filtered = filter === 'all' ? entries : entries.filter(e => e.status === filter)
  const waitingCount = entries.filter(e => e.status === 'waiting').length

  return (
    <div className="page-container" style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
      <div className="page-header-sm">
        <h2 className="page-title">📋 Čakalnica</h2>
        <button onClick={() => setShowAdd(true)} className="btn btn-primary btn-sm">+ Dodaj</button>
      </div>

      {/* Status bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        {['waiting', 'notified', 'seated', 'cancelled', 'all'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-ghost'}`}>
            {STATUS_LABELS[s] || 'Vsi'}
            {s !== 'all' && ` (${entries.filter(e => e.status === s).length})`}
          </button>
        ))}
        <span style={{ fontSize: 13, color: 'var(--text2)' }}>
          ⏳ Čaka: <strong style={{ color: '#f59e0b' }}>{waitingCount}</strong>
        </span>
      </div>

      {/* List */}
      <div className="card" style={{ padding: 0 }}>
        {filtered.length === 0 ? (
          <p style={{ padding: 20, color: 'var(--text2)', textAlign: 'center' }}>Ni vnosov</p>
        ) : (
          filtered.map(e => (
            <div key={e.id} className="item-row" style={{
              padding: '10px 14px', borderBottom: '1px solid var(--border)',
              borderLeft: `3px solid ${STATUS_COLORS[e.status] || '#94a3b8'}`,
              opacity: e.status === 'cancelled' ? 0.6 : 1
            }}>
              <div className="item-info" style={{ flex: 1 }}>
                <div className="item-name">{e.name}
                  <span style={{
                    fontSize: 11, marginLeft: 8, padding: '1px 6px', borderRadius: 4,
                    background: STATUS_COLORS[e.status] + '22', color: STATUS_COLORS[e.status],
                    fontWeight: 600
                  }}>{STATUS_LABELS[e.status] || e.status}</span>
                </div>
                <div className="item-desc">
                  🔢 {e.party_size} oseb
                  {e.phone && ` • 📞 ${e.phone}`}
                  {e.notes && ` • 📝 ${e.notes}`}
                  {' • ' + new Date(e.created_at).toLocaleString('sl-SI')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {e.status === 'waiting' && (
                  <>
                    <button onClick={() => updateStatus(e.id, 'notify', 'Obveščen')} className="btn btn-xs btn-ghost" title="Obvesti">🔔</button>
                    <button onClick={() => updateStatus(e.id, 'seat', 'Useden')} className="btn btn-xs btn-ghost" title="Usedi">🪑</button>
                    <button onClick={() => updateStatus(e.id, 'cancel', 'Preklican')} className="btn btn-xs btn-ghost" title="Prekliči">✕</button>
                  </>
                )}
                {e.status === 'notified' && (
                  <button onClick={() => updateStatus(e.id, 'seat', 'Useden')} className="btn btn-xs btn-ghost" title="Usedi">🪑</button>
                )}
                <button onClick={() => del(e.id)} className="btn btn-xs btn-ghost" title="Izbriši">🗑️</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="overlay" onClick={() => setShowAdd(false)}>
          <div className="modal modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 340 }}>
            <h3 style={{ marginTop: 0 }}>Dodaj na čakalnico</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input className="input" placeholder="Ime *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <input className="input" placeholder="Telefon" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              <input className="input" type="number" min={1} placeholder="Št. oseb" value={form.party_size} onChange={e => setForm({ ...form, party_size: parseInt(e.target.value) || 2 })} />
              <input className="input" placeholder="Opombe" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="modal-btns" style={{ marginTop: 16 }}>
              <button onClick={addEntry} className="btn btn-primary" disabled={!form.name.trim()}>Dodaj</button>
              <button onClick={() => setShowAdd(false)} className="btn btn-ghost">Prekliči</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
