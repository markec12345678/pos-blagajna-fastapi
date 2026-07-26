import { useState, useEffect } from 'react'
import * as api from './api'

interface Option {
  id: number; name: string; price_impact: number; sort_order: number
}
interface Group {
  id: number; name: string; min_select: number; max_select: number; is_required: boolean; sort_order: number;
  options: Option[]
}

export default function ModifiersPage({ onNotify }: { onNotify: (m: string) => void }) {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null)
  const [editGroup, setEditGroup] = useState<{ id?: number; name: string; min_select: number; max_select: number; is_required: boolean } | null>(null)
  const [editOption, setEditOption] = useState<{ id?: number; group_id: number; name: string; price_impact: string } | null>(null)
  const [items, setItems] = useState<any[]>([])
  const [links, setLinks] = useState<Record<number, number[]>>({})
  const [linkGroup, setLinkGroup] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/v1/modifiers/groups', { headers: api.authHeader() })
      setGroups(await r.json())
    } catch { onNotify('Napaka pri nalaganju modifikatorjev') }
    try {
      const r = await fetch('/api/v1/menu', { headers: api.authHeader() })
      setItems(await r.json())
    } catch {}
    try {
      const r = await fetch('/api/v1/modifiers/links', { headers: api.authHeader() })
      setLinks(await r.json())
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const saveGroup = async () => {
    if (!editGroup || !editGroup.name) return
    try {
      if (editGroup.id) {
        await fetch(`/api/v1/modifiers/groups/${editGroup.id}`, { method: 'PUT', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify(editGroup) })
        onNotify('Skupina posodobljena')
      } else {
        await fetch('/api/v1/modifiers/groups', { method: 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify(editGroup) })
        onNotify('Skupina ustvarjena')
      }
      setEditGroup(null); load()
    } catch (e: any) { onNotify(e.message) }
  }

  const deleteGroup = async (id: number) => {
    if (!confirm('Izbrišem skupino z vsemi opcijami?')) return
    try {
      await fetch(`/api/v1/modifiers/groups/${id}`, { method: 'DELETE', headers: api.authHeader() })
      onNotify('Skupina izbrisana'); load()
    } catch (e: any) { onNotify(e.message) }
  }

  const saveOption = async () => {
    if (!editOption || !editOption.name) return
    try {
      if (editOption.id) {
        await fetch(`/api/v1/modifiers/options/${editOption.id}`, { method: 'PUT', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ name: editOption.name, price_impact: parseFloat(editOption.price_impact) || 0 }) })
        onNotify('Opcija posodobljena')
      } else {
        await fetch('/api/v1/modifiers/options', { method: 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ group_id: editOption.group_id, name: editOption.name, price_impact: parseFloat(editOption.price_impact) || 0 }) })
        onNotify('Opcija ustvarjena')
      }
      setEditOption(null); load()
    } catch (e: any) { onNotify(e.message) }
  }

  const deleteOption = async (id: number) => {
    if (!confirm('Izbrišem opcijo?')) return
    try {
      await fetch(`/api/v1/modifiers/options/${id}`, { method: 'DELETE', headers: api.authHeader() })
      onNotify('Opcija izbrisana'); load()
    } catch (e: any) { onNotify(e.message) }
  }

  const toggleLink = async (itemId: number, groupId: number, linked: boolean) => {
    try {
      if (linked) {
        await fetch('/api/v1/modifiers/link', { method: 'DELETE', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ menu_item_id: itemId, group_id: groupId }) })
      } else {
        await fetch('/api/v1/modifiers/link', { method: 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ menu_item_id: itemId, group_id: groupId }) })
      }
      onNotify(linked ? 'Odstranjeno' : 'Povezano'); load()
    } catch (e: any) { onNotify(e.message) }
  }

  if (loading) return <div style={{ padding: 40 }}>Nalaganje...</div>

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>⚙️ Dodatki (modifierji)</h2>
        <button onClick={() => setEditGroup({ name: '', min_select: 0, max_select: 1, is_required: false })} className="btn btn-primary">+ Skupina</button>
      </div>

      {groups.length === 0 && <p style={{ color: '#666' }}>Ni skupin dodatkov. Ustvarite prvo.</p>}

      <div style={{ display: 'grid', gap: 12 }}>
        {groups.map(g => (
          <div key={g.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 16px', cursor: 'pointer',
              background: expandedGroup === g.id ? 'var(--bg2)' : undefined
            }} onClick={() => setExpandedGroup(expandedGroup === g.id ? null : g.id)}>
              <div>
                <strong>{g.name}</strong>
                <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>
                  {g.options.length} opcij • {g.is_required ? 'Obvezno' : 'Neobvezno'} • min {g.min_select} / max {g.max_select}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={e => { e.stopPropagation(); setEditGroup({ id: g.id, name: g.name, min_select: g.min_select, max_select: g.max_select, is_required: g.is_required }) }} className="btn btn-xs btn-ghost">✏️</button>
                <button onClick={e => { e.stopPropagation(); setLinkGroup(linkGroup === g.id ? null : g.id) }} className="btn btn-xs btn-ghost">🔗</button>
                <button onClick={e => { e.stopPropagation(); deleteGroup(g.id) }} className="btn btn-xs btn-ghost">🗑️</button>
                <span style={{ fontSize: 11, color: '#64748b' }}>{expandedGroup === g.id ? '▲' : '▼'}</span>
              </div>
            </div>

            {expandedGroup === g.id && (
              <div style={{ padding: '8px 16px 16px', borderTop: '1px solid var(--border)' }}>
                {g.options.length === 0 && <p style={{ fontSize: 13, color: '#64748b' }}>Ni opcij.</p>}
                {g.options.map(o => (
                  <div key={o.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: 14
                  }}>
                    <span>{o.name}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ color: o.price_impact > 0 ? '#059669' : '#64748b', fontSize: 13 }}>
                        {o.price_impact > 0 ? `+${o.price_impact.toFixed(2)} €` : 'Brez doplačila'}
                      </span>
                      <button onClick={() => setEditOption({ id: o.id, group_id: g.id, name: o.name, price_impact: String(o.price_impact) })} className="btn btn-xs btn-ghost">✏️</button>
                      <button onClick={() => deleteOption(o.id)} className="btn btn-xs btn-ghost">🗑️</button>
                    </div>
                  </div>
                ))}
                <button onClick={() => setEditOption({ group_id: g.id, name: '', price_impact: '0' })} className="btn btn-sm btn-blue" style={{ marginTop: 8 }}>+ Opcija</button>
              </div>
            )}

            {linkGroup === g.id && (
              <div style={{ padding: '8px 16px 16px', borderTop: '1px solid var(--border)', background: '#f8fafc' }}>
                <h4 style={{ fontSize: 13, marginBottom: 8 }}>Poveži s skupino "{g.name}" z artikli:</h4>
                <div style={{ maxHeight: 200, overflow: 'auto' }}>
                  {items.flatMap((cat: any) => cat.items || []).map((item: any) => {
                    const linked = (links[item.id] || []).includes(g.id)
                    return (
                      <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', fontSize: 13, cursor: 'pointer' }}>
                        <input type="checkbox" checked={linked} onChange={() => toggleLink(item.id, g.id, linked)} />
                        {item.name}
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {editGroup && (
        <div className="overlay" onClick={() => setEditGroup(null)}>
          <div className="modal modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
            <h3>{editGroup.id ? 'Uredi skupino' : 'Nova skupina'}</h3>
            <input className="input" placeholder="Ime skupine" value={editGroup.name} onChange={e => setEditGroup({ ...editGroup, name: e.target.value })} />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: '#64748b' }}>Min izbor</label>
                <input className="input" type="number" value={editGroup.min_select} onChange={e => setEditGroup({ ...editGroup, min_select: parseInt(e.target.value) || 0 })} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: '#64748b' }}>Max izbor</label>
                <input className="input" type="number" value={editGroup.max_select} onChange={e => setEditGroup({ ...editGroup, max_select: parseInt(e.target.value) || 1 })} />
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginTop: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={editGroup.is_required} onChange={e => setEditGroup({ ...editGroup, is_required: e.target.checked })} />
              Obvezno
            </label>
            <div className="modal-btns" style={{ marginTop: 16 }}>
              <button onClick={saveGroup} className="btn btn-primary" disabled={!editGroup.name.trim()}>Shrani</button>
              <button onClick={() => setEditGroup(null)} className="btn btn-ghost">Prekliči</button>
            </div>
          </div>
        </div>
      )}

      {editOption && (
        <div className="overlay" onClick={() => setEditOption(null)}>
          <div className="modal modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 320 }}>
            <h3>{editOption.id ? 'Uredi opcijo' : 'Nova opcija'}</h3>
            <input className="input" placeholder="Ime opcije" value={editOption.name} onChange={e => setEditOption({ ...editOption, name: e.target.value })} />
            <input className="input" type="number" placeholder="Doplačilo (€)" value={editOption.price_impact} onChange={e => setEditOption({ ...editOption, price_impact: e.target.value })} style={{ marginTop: 8 }} />
            <div className="modal-btns" style={{ marginTop: 16 }}>
              <button onClick={saveOption} className="btn btn-primary" disabled={!editOption.name.trim()}>Shrani</button>
              <button onClick={() => setEditOption(null)} className="btn btn-ghost">Prekliči</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}