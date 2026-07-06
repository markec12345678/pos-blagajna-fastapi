import { useState, useEffect } from 'react'
import * as api from './api'

export default function CustomersPage({ onNotify }: { onNotify: (m: string) => void }) {
  const [customers, setCustomers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [editModal, setEditModal] = useState<{ id?: number; name: string; phone: string; email: string; address: string; notes: string; tags: string; is_member: boolean } | null>(null)
  const [viewId, setViewId] = useState<number | null>(null)
  const [history, setHistory] = useState<any>(null)

  const load = () => {
    setLoading(true)
    let url = `/api/v1/customers?search=${encodeURIComponent(search)}`
    if (tagFilter) url += `&tag=${encodeURIComponent(tagFilter)}`
    fetch(url, { headers: api.authHeader() })
      .then(r => r.json())
      .then(setCustomers)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [search, tagFilter])

  const save = async () => {
    if (!editModal) return
    try {
      if (editModal.id) {
        await fetch(`/api/v1/customers/${editModal.id}`, { method: 'PUT', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify(editModal) })
        onNotify('Stranka posodobljena')
      } else {
        const r = await fetch('/api/v1/customers', { method: 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify(editModal) })
        const d = await r.json()
        if (!r.ok) throw new Error(d.detail || 'Napaka')
        onNotify('Stranka ustvarjena')
      }
      setEditModal(null)
      load()
    } catch (e: any) { onNotify(e.message) }
  }

  const del = async (id: number) => {
    if (!confirm('Izbrišem stranko?')) return
    try {
      await fetch(`/api/v1/customers/${id}`, { method: 'DELETE', headers: api.authHeader() })
      onNotify('Stranka izbrisana')
      if (viewId === id) { setViewId(null); setHistory(null) }
      load()
    } catch (e: any) { onNotify(e.message) }
  }

  const viewCustomer = (id: number) => {
    setViewId(id)
    fetch(`/api/v1/customers/${id}/history`, { headers: api.authHeader() }).then(r => r.json()).then(setHistory)
  }

  const allTags = [...new Set(customers.flatMap(c => (c.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean)))]

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>👥 Stranke</h2>
        <button onClick={() => setEditModal({ name: '', phone: '', email: '', address: '', notes: '', tags: '', is_member: false })} className="btn btn-primary">+ Dodaj stranko</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input className="input" placeholder="🔍 Išči po imenu ali telefonu..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 260 }} />
        <input className="input" placeholder="🏷️ Filter po oznakah..." value={tagFilter} onChange={e => setTagFilter(e.target.value)} style={{ width: 200 }} />
        {allTags.length > 0 && (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
            {allTags.map(t => (
              <span key={t} onClick={() => setTagFilter(t)}
                style={{ cursor: 'pointer', padding: '2px 8px', borderRadius: 99, fontSize: 11, background: tagFilter === t ? '#3b82f6' : 'var(--bg)', color: tagFilter === t ? 'white' : 'var(--text2)', border: '1px solid var(--border)' }}>
                {t}
              </span>
            ))}
            {tagFilter && <span onClick={() => setTagFilter('')} style={{ cursor: 'pointer', fontSize: 11, color: '#ef4444' }}>✕</span>}
          </div>
        )}
      </div>

      {loading ? <p>Nalaganje...</p> : customers.length === 0 ? <p style={{ color: '#666' }}>Ni strank.</p> : (
        <div style={{ display: 'grid', gap: 8 }}>
          {customers.map(c => (
            <div key={c.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, cursor: 'pointer' }}
              onClick={() => viewCustomer(c.id)}
            >
              <div>
                <strong>{c.name}</strong>
                <span style={{ color: '#64748b', fontSize: 13, marginLeft: 8 }}>
                  {c.phone && `${c.phone}`}{c.phone && c.email && ' · '}{c.email && `${c.email}`}
                </span>
                {c.is_member && <span className="badge" style={{ marginLeft: 8, background: '#059669', color: 'white', padding: '2px 8px', borderRadius: 99, fontSize: 11 }}>Član</span>}
                {c.tags && c.tags.split(',').map((t: string) => t.trim()).filter(Boolean).map((t: string) => (
                  <span key={t} className="badge" style={{ marginLeft: 4, background: '#e2e8f0', color: '#333', padding: '2px 8px', borderRadius: 99, fontSize: 10 }}>{t}</span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 14, color: '#64748b' }}>
                <span>⭐ {c.loyalty_points || 0}</span>
                <span>💰 {(c.total_spent || 0).toFixed(2)} €</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {editModal && (
        <div className="overlay" onClick={() => setEditModal(null)}>
          <div className="modal modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h3>{editModal.id ? 'Uredi stranko' : 'Nova stranka'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input className="input" placeholder="Ime *" value={editModal.name} onChange={e => setEditModal({ ...editModal, name: e.target.value })} />
              <input className="input" placeholder="Telefon" value={editModal.phone} onChange={e => setEditModal({ ...editModal, phone: e.target.value })} />
              <input className="input" placeholder="Email" value={editModal.email} onChange={e => setEditModal({ ...editModal, email: e.target.value })} />
              <input className="input" placeholder="Naslov" value={editModal.address} onChange={e => setEditModal({ ...editModal, address: e.target.value })} />
              <input className="input" placeholder="🏷️ Oznake (ločene z vejico)" value={editModal.tags} onChange={e => setEditModal({ ...editModal, tags: e.target.value })} />
              <textarea className="input" placeholder="Opombe" value={editModal.notes} onChange={e => setEditModal({ ...editModal, notes: e.target.value })} style={{ minHeight: 60 }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
                <input type="checkbox" checked={editModal.is_member} onChange={e => setEditModal({ ...editModal, is_member: e.target.checked })} />
                Članski program
              </label>
            </div>
            <div className="modal-btns" style={{ marginTop: 16 }}>
              <button onClick={save} className="btn btn-primary" disabled={!editModal.name.trim()}>Shrani</button>
              <button onClick={() => setEditModal(null)} className="btn btn-ghost">Prekliči</button>
            </div>
          </div>
        </div>
      )}

      {viewId && history && (
        <div className="overlay" onClick={() => { setViewId(null); setHistory(null) }}>
          <div className="modal modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
              <div>
                <h3>{history.customer.name}</h3>
                <p style={{ fontSize: 13, color: '#64748b' }}>
                  {history.customer.phone && `📞 ${history.customer.phone}`}
                  {history.customer.phone && history.customer.email && ' · '}
                  {history.customer.email && `✉️ ${history.customer.email}`}
                </p>
                {history.customer.tags && history.customer.tags.split(',').map((t: string) => t.trim()).filter(Boolean).map((t: string) => (
                  <span key={t} className="badge" style={{ background: '#3b82f6', color: 'white', padding: '2px 10px', borderRadius: 99, fontSize: 11 }}>{t}</span>
                ))}
                {history.customer.notes && <p style={{ fontSize: 12, color: '#64748b', marginTop: 4, fontStyle: 'italic' }}>{history.customer.notes}</p>}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setEditModal(history.customer); setViewId(null); setHistory(null) }} className="btn btn-sm btn-blue">Uredi</button>
                <button onClick={() => del(history.customer.id)} className="btn btn-sm btn-danger">Izbriši</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              <div className="card" style={{ padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{(history.customer.total_spent || 0).toFixed(2)} €</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Skupaj porabljeno</div>
              </div>
              <div className="card" style={{ padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{history.order_count}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Naročil</div>
              </div>
              <div className="card" style={{ padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700 }}>⭐ {history.customer.loyalty_points || 0}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Zvestobne točke</div>
              </div>
              <div className="card" style={{ padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{history.customer.is_member ? '✅ Da' : '❌ Ne'}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Član programa</div>
              </div>
            </div>

            {history.favorite_items?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ marginBottom: 8, fontSize: 14 }}>🔝 Najpogostejši artikli</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {history.favorite_items.map((f: any) => (
                    <span key={f.name} className="badge" style={{ background: '#e2e8f0', color: '#333', padding: '4px 10px', borderRadius: 99, fontSize: 12 }}>
                      {f.name} ×{f.count}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {history.orders?.length > 0 && (
              <div>
                <h4 style={{ marginBottom: 8, fontSize: 14 }}>📋 Zadnja naročila</h4>
                <table className="table" style={{ fontSize: 13 }}>
                  <thead><tr><th>#</th><th>Datum</th><th>Artiklov</th><th>Znesek</th></tr></thead>
                  <tbody>
                    {history.orders.slice(0, 20).map((o: any) => (
                      <tr key={o.id}>
                        <td>#{o.id}</td>
                        <td>{o.closed_at ? new Date(o.closed_at).toLocaleDateString('sl-SI') : (o.created_at ? new Date(o.created_at).toLocaleDateString('sl-SI') : '—')}</td>
                        <td>{o.item_count}</td>
                        <td style={{ fontWeight: 600 }}>{(o.total || 0).toFixed(2)} €</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
