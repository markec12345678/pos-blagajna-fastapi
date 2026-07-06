import { useState, useEffect } from 'react'
import * as api from './api'

export default function CoursesPage({ onNotify }: { onNotify: (m: string) => void }) {
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [edit, setEdit] = useState<{ id?: number; name: string } | null>(null)

  useEffect(() => {
    fetch('/api/v1/courses', { headers: api.authHeader() })
      .then(r => r.json())
      .then(setCourses)
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    if (!edit || !edit.name) return
    try {
      if (edit.id) {
        await fetch(`/api/v1/courses/${edit.id}`, { method: 'PUT', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ name: edit.name }) })
        onNotify('Hod posodobljen')
      } else {
        await fetch('/api/v1/courses', { method: 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ name: edit.name }) })
        onNotify('Hod ustvarjen')
      }
      setEdit(null)
      const r = await fetch('/api/v1/courses', { headers: api.authHeader() })
      setCourses(await r.json())
    } catch (e: any) { onNotify(e.message) }
  }

  const del = async (id: number) => {
    if (!confirm('Izbrišem hod?')) return
    try {
      const r = await fetch(`/api/v1/courses/${id}`, { method: 'DELETE', headers: api.authHeader() })
      if (!r.ok) { const d = await r.json(); throw new Error(d.detail || 'Napaka') }
      onNotify('Hod izbrisan')
      setCourses(courses.filter(c => c.id !== id))
    } catch (e: any) { onNotify(e.message) }
  }

  if (loading) return <div style={{ padding: 40 }}>Nalaganje...</div>

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>📋 Hodi (Courses)</h2>
        <button onClick={() => setEdit({ name: '' })} className="btn btn-primary">+ Hod</button>
      </div>

      <div className="card">
        {courses.length === 0 && <p style={{ color: '#64748b', padding: 12 }}>Ni hodov.</p>}
        {courses.map(c => (
          <div key={c.id} className="item-row" style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
            <span className="item-name">{c.name}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>#{c.sort_order}</span>
              <button onClick={() => setEdit({ id: c.id, name: c.name })} className="btn btn-xs btn-ghost">✏️</button>
              <button onClick={() => del(c.id)} className="btn btn-xs btn-ghost">🗑️</button>
            </div>
          </div>
        ))}
      </div>

      {edit && (
        <div className="overlay" onClick={() => setEdit(null)}>
          <div className="modal modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 320 }}>
            <h3>{edit.id ? 'Uredi hod' : 'Nov hod'}</h3>
            <input className="input" placeholder="Ime hoda" value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} />
            <div className="modal-btns">
              <button onClick={save} className="btn btn-primary" disabled={!edit.name.trim()}>Shrani</button>
              <button onClick={() => setEdit(null)} className="btn btn-ghost">Prekliči</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}