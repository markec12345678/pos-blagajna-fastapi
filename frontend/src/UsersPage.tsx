import { useState, useEffect } from 'react'
import * as api from './api'

export default function UsersPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [users, setUsers] = useState<any[]>([])
  const [editing, setEditing] = useState<any>(null)

  const load = () => fetch('/api/v1/users', { headers: api.authHeader() }).then(r => r.json()).then(setUsers)
  useEffect(() => { load() }, [])

  const add = async () => {
    const username = prompt('Uporabniško ime:')
    if (!username) return
    if (username.length < 2) { onNotify('Uporabniško ime mora imeti vsaj 2 znaka'); return }
    const password = prompt('Geslo:')
    if (!password) return
    if (password.length < 4) { onNotify('Geslo mora imeti vsaj 4 znake'); return }
    const name = prompt('Polno ime:', username) || username
    const role = confirm('Admin? (OK=admin, Cancel=cashier)') ? 'admin' : 'cashier'
    const pin = prompt('PIN koda (3-8 številk, prazno = brez PIN-a):')
    if (pin && !/^\d{3,8}$/.test(pin)) { onNotify('PIN mora imeti 3-8 številk'); return }
    await fetch('/api/v1/users', { method: 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password, full_name: name, role, pin_code: pin || null }) })
    onNotify(`Uporabnik "${username}" dodan`); load()
  }

  const editUser = async (user: any) => {
    const name = prompt('Polno ime:', user.full_name)
    if (!name) return
    if (name.length < 2) { onNotify('Ime mora imeti vsaj 2 znaka'); return }
    const role = prompt('Vloga (admin/cashier):', user.role)
    if (!role || (role !== 'admin' && role !== 'cashier')) return
    const pw = prompt('Novo geslo (prazno = brez spremembe):')
    if (pw && pw.length < 4) { onNotify('Geslo mora imeti vsaj 4 znake'); return }
    const pin = prompt('PIN koda (3-8 številk, prazno = brez spremembe):')
    if (pin && !/^\d{3,8}$/.test(pin)) { onNotify('PIN mora imeti 3-8 številk'); return }
    const body: any = { full_name: name, role }
    if (pw) body.password = pw
    if (pin) body.pin_code = pin
    await fetch(`/api/v1/users/${user.id}`, { method: 'PUT', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    onNotify(`Uporabnik "${user.username}" posodobljen`); load()
  }

  const delUser = async (user: any) => {
    if (!confirm(`Izbriši uporabnika "${user.username}"?`)) return
    const r = await fetch(`/api/v1/users/${user.id}`, { method: 'DELETE', headers: api.authHeader() })
    if (!r.ok) return onNotify((await r.json()).detail || 'Napaka')
    onNotify(`Uporabnik "${user.username}" izbrisan`); load()
  }

  return (
    <div className="page-container">
      <div className="page-header-sm">
        <h2 className="page-title">👥 Uporabniki</h2>
        <button onClick={add} className="btn btn-primary btn-sm">+ Uporabnik</button>
      </div>

      <div className="users-list">
        {users.map(u => (
          <div key={u.id} className="user-card">
            <div className={`user-avatar ${u.role === 'admin' ? 'admin' : 'staff'}`}>
              {u.full_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="user-info">
              <div className="user-name">{u.full_name}</div>
              <div className="user-role">@{u.username} • {u.role === 'admin' ? 'Administrator' : 'Blagajnik'}</div>
            </div>
            <span className={`badge ${u.role === 'admin' ? 'badge-blue' : 'badge-green'}`}>{u.role}</span>
            <button onClick={() => editUser(u)} className="btn btn-sm btn-ghost" title="Uredi">✏️</button>
            {u.username !== 'admin' && (
              <button onClick={() => delUser(u)} className="btn btn-sm btn-ghost" title="Izbriši">🗑️</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
