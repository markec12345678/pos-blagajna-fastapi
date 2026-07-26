import { useState, useEffect } from 'react'
import * as api from './api'

export default function MenuVersionsPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [menu, setMenu] = useState<any[]>([])
  const [versions, setVersions] = useState<any[]>([])
  const [selItem, setSelItem] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ price: '', valid_from: '', valid_to: '' })

  const load = async () => {
    try {
      const m = await (await fetch('/api/v1/menu/all')).json()
      setMenu(m)
    } catch {}
  }

  const loadVersions = async (itemId: number) => {
    try {
      const v = await (await fetch(`/api/v1/menu/versions?item_id=${itemId}`)).json()
      setVersions(v)
    } catch {}
  }

  useEffect(() => { load() }, [])

  const saveVersion = async () => {
    if (!selItem || !form.price) return
    await fetch('/api/v1/menu/versions', {
      method: 'POST',
      headers: { ...api.authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: selItem, price: form.price, valid_from: form.valid_from || null, valid_to: form.valid_to || null })
    })
    setShowForm(false)
    onNotify('Različica menija dodana')
    loadVersions(selItem)
  }

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">📅 Različice menija</h2>
      </div>

      <div className="card mb-16">
        <h4>Izberi artikel za različico</h4>
        <select className="input" onChange={e => { const id = parseInt(e.target.value); setSelItem(id); if (id) loadVersions(id) }} style={{ width: 200 }}>
          <option value="">Izberi artikel...</option>
          {menu.flatMap(c => c.items).map(i => (
            <option key={i.id} value={i.id}>{i.name}</option>
          ))}
        </select>
        {selItem && <button onClick={() => setShowForm(true)} className="btn btn-sm btn-primary" style={{ marginLeft: 8 }}>+ Dodaj različico</button>}
      </div>

      {selItem && (
        <div className="card">
          <h4>Različice za {menu.flatMap(c => c.items).find(i => i.id === selItem)?.name}</h4>
          {versions.length === 0 ? (
            <p style={{ color: 'var(--text2)' }}>Ni različic</p>
          ) : (
            <table className="zreport-table">
              <thead><tr><th>Cena</th><th>Od</th><th>Do</th><th>Akcija</th></tr></thead>
              <tbody>
                {versions.map(v => (
                  <tr key={v.id}>
                    <td>{v.price.toFixed(2)} €</td>
                    <td>{v.valid_from ? new Date(v.valid_from).toLocaleDateString() : '—'}</td>
                    <td>{v.valid_to ? new Date(v.valid_to).toLocaleDateString() : '—'}</td>
                    <td><button onClick={async () => {
                      await fetch(`/api/v1/menu/versions/${v.id}`, { method: 'DELETE', headers: api.authHeader() })
                      loadVersions(selItem!)
                    }} className="btn btn-xs btn-ghost">🗑️</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showForm && (
        <div className="overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Nova različica</h3>
            <input className="input" type="number" step="0.01" placeholder="Cena" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
            <input className="input" type="date" placeholder="Od" value={form.valid_from} onChange={e => setForm({ ...form, valid_from: e.target.value })} style={{ marginTop: 8 }} />
            <input className="input" type="date" placeholder="Do" value={form.valid_to} onChange={e => setForm({ ...form, valid_to: e.target.value })} style={{ marginTop: 8 }} />
            <div className="modal-btns">
              <button onClick={saveVersion} className="btn btn-primary">Shrani</button>
              <button onClick={() => setShowForm(false)} className="btn btn-ghost">Prekliči</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}