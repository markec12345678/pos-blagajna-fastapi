import { useState, useEffect } from 'react'
import * as api from './api'

export default function BranchesPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [branches, setBranches] = useState<any[]>([])
  const load = () => {
    fetch('/api/v1/branches', { headers: api.authHeader() }).then(r => r.json()).then(setBranches)
  }
  useEffect(() => { load() }, [])

  const addBranch = async () => {
    const name = prompt('Ime podružnice:')
    if (!name) return
    await fetch('/api/v1/branches', { method: 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
    onNotify(`Podružnica "${name}" dodana`); load()
  }

  const editBranch = async (b: any) => {
    const name = prompt('Ime:', b.name)
    if (!name) return
    const address = prompt('Naslov:', b.address || '') || ''
    const phone = prompt('Telefon:', b.phone || '') || ''
    await fetch(`/api/v1/branches/${b.id}`, { method: 'PUT', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ name, address, phone }) })
    onNotify('Podružnica posodobljena'); load()
  }

  const toggleBranch = async (b: any) => {
    await fetch(`/api/v1/branches/${b.id}`, { method: 'PUT', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !b.is_active }) })
    load()
  }

  const delBranch = async (b: any) => {
    if (!confirm(`Izbriši podružnico "${b.name}"?`)) return
    await fetch(`/api/v1/branches/${b.id}`, { method: 'DELETE', headers: api.authHeader() })
    onNotify('Podružnica izbrisana'); load()
  }

  return (
    <div>
      <div className="page-header">
        <h2>🏢 Podružnice</h2>
        <button onClick={addBranch} className="btn btn-primary btn-sm">+ Podružnica</button>
      </div>
      <table className="table" style={{ width: '100%' }}>
        <thead><tr><th>Ime</th><th>Naslov</th><th>Telefon</th><th>Aktivna</th><th></th></tr></thead>
        <tbody>
          {branches.map(b => (
            <tr key={b.id}>
              <td><strong>{b.name}</strong></td>
              <td>{b.address || '—'}</td>
              <td>{b.phone || '—'}</td>
              <td>{b.is_active ? '✅' : '🚫'}</td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <button onClick={() => editBranch(b)} className="btn btn-sm btn-ghost">✏️</button>
                <button onClick={() => toggleBranch(b)} className="btn btn-sm btn-ghost">{b.is_active ? '🚫' : '✅'}</button>
                <button onClick={() => delBranch(b)} className="btn btn-sm btn-ghost">🗑️</button>
              </td>
            </tr>
          ))}
          {branches.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text2)' }}>Ni podružnic</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
