import { useState, useEffect } from 'react'
import * as api from './api'

export default function ComboPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [combos, setCombos] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [expanded, setExpanded] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ item_id: 0, combo_price: 0 })
  const [editCombo, setEditCombo] = useState<any>(null)
  const [editItems, setEditItems] = useState<any[]>([])

  const load = async () => {
    const [c, allItems] = await Promise.all([
      fetch('/api/v1/menu/combos', { headers: api.authHeader() }).then(r => r.json()),
      fetch('/api/v1/menu/all', { headers: api.authHeader() }).then(r => r.json())
    ])
    setCombos(c)
    const flat: any[] = []
    allItems.forEach((cat: any) => cat.items.forEach((i: any) => flat.push({ ...i, cat_name: cat.name })))
    setItems(flat)
  }
  useEffect(() => { load() }, [])

  const createCombo = async () => {
    if (!addForm.item_id || addForm.combo_price <= 0) return
    await fetch(`/api/v1/menu/items/${addForm.item_id}`, {
      method: 'PUT', headers: { ...api.authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ combo_price: addForm.combo_price, is_combo: true })
    })
    onNotify('Combo ustvarjen')
    setShowAdd(false)
    load()
  }

  const openEdit = async (combo: any) => {
    const r = await fetch(`/api/v1/menu/combos`, { headers: api.authHeader() }).then(r => r.json())
    const full = r.find((c: any) => c.id === combo.id) || combo
    setEditCombo(full)
    setEditItems([...full.items])
  }

  const addChildItem = async () => {
    const sel = document.getElementById('combo-add-item') as HTMLSelectElement
    const qty = document.getElementById('combo-add-qty') as HTMLInputElement
    if (!sel?.value || !parseInt(qty?.value || '0')) return
    const itemId = parseInt(sel.value)
    editItems.push({ id: itemId, quantity: parseInt(qty.value) })
    setEditItems([...editItems])
    sel.value = ''; qty.value = '1'
  }

  const removeChild = async (itemId: number) => {
    await fetch(`/api/v1/menu/combos/${editCombo.id}/items/${itemId}`, { method: 'DELETE', headers: api.authHeader() })
    setEditItems(prev => prev.filter(i => i.id !== itemId))
    onNotify('Artikell odstranjen')
  }

  const saveEdit = async () => {
    for (const child of editItems) {
      if (!child.saved) {
        await fetch(`/api/v1/menu/combos/${editCombo.id}/items`, {
          method: 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ item_id: child.id, quantity: child.quantity })
        })
      }
    }
    await fetch(`/api/v1/menu/items/${editCombo.id}`, {
      method: 'PUT', headers: { ...api.authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ combo_price: parseFloat((document.getElementById('combo-edit-price') as HTMLInputElement)?.value || '0') })
    })
    onNotify('Combo posodobljen')
    setEditCombo(null)
    load()
  }

  const deleteCombo = async (combo: any) => {
    if (!confirm(`Izbriši combo "${combo.name}"?`)) return
    for (const child of combo.items) {
      await fetch(`/api/v1/menu/combos/${combo.id}/items/${child.id}`, { method: 'DELETE', headers: api.authHeader() })
    }
    await fetch(`/api/v1/menu/items/${combo.id}`, {
      method: 'PUT', headers: { ...api.authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ combo_price: null, is_combo: false })
    })
    onNotify('Combo izbrisan')
    load()
  }

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>📦 Combo meniji</h2>
        <button onClick={() => setShowAdd(true)} className="btn btn-primary btn-sm">+ Nov combo</button>
      </div>

      {combos.length === 0 && <p style={{ color: 'var(--text2)' }}>Ni combo menijev. Ustvari ga z izbiro obstoječega artikla in nastavitvijo combo cene.</p>}

      {combos.map(combo => (
        <div key={combo.id} className="card" style={{ marginBottom: 12, padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', cursor: 'pointer', gap: 12 }}
            onClick={() => setExpanded(expanded === combo.id ? null : combo.id)}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{combo.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                {combo.items?.length || 0} artiklov • redna cena: {combo.price?.toFixed(2)} € → <strong style={{ color: 'var(--green)' }}>{combo.combo_price?.toFixed(2)} €</strong>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={e => { e.stopPropagation(); openEdit(combo) }} className="btn btn-xs btn-ghost">✏️</button>
              <button onClick={e => { e.stopPropagation(); deleteCombo(combo) }} className="btn btn-xs btn-ghost">🗑️</button>
              <span style={{ color: 'var(--text2)' }}>{expanded === combo.id ? '▲' : '▼'}</span>
            </div>
          </div>
          {expanded === combo.id && (
            <div style={{ padding: '0 16px 12px', borderTop: '1px solid var(--border)' }}>
              {combo.items?.length > 0 ? (
                <div style={{ marginTop: 8 }}>
                  {combo.items.map((ci: any) => {
                    const item = items.find(i => i.id === ci.id)
                    return (
                      <div key={ci.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 13 }}>
                        <span style={{ color: 'var(--green)', fontWeight: 600 }}>{ci.quantity}x</span>
                        <span>{item?.name || '?'} <span style={{ color: 'var(--text2)', fontSize: 11 }}>({item?.cat_name})</span></span>
                        {item && <span style={{ color: 'var(--text2)', marginLeft: 'auto' }}>{item.price?.toFixed(2)} €</span>}
                      </div>
                    )
                  })}
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text2)' }}>
                    Skupaj redna: {combo.items.reduce((sum: number, ci: any) => {
                      const item = items.find(i => i.id === ci.id)
                      return sum + (item?.price || 0) * ci.quantity
                    }, 0).toFixed(2)} € → <strong style={{ color: 'var(--green)' }}>{combo.combo_price?.toFixed(2)} €</strong>
                    {' '}(prihranek: <span style={{ color: 'var(--gold)' }}>
                      {(combo.items.reduce((sum: number, ci: any) => {
                        const item = items.find(i => i.id === ci.id)
                        return sum + (item?.price || 0) * ci.quantity
                      }, 0) - (combo.combo_price || 0)).toFixed(2)} €
                    </span>)
                  </div>
                </div>
              ) : <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 8 }}>Ni artiklov v tem combo meniju</p>}
            </div>
          )}
        </div>
      ))}

      {showAdd && (
        <div className="overlay" onClick={() => setShowAdd(false)}>
          <div className="modal modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
            <h3 style={{ marginTop: 0 }}>Nov combo</h3>
            <div className="field">
              <label>Artikel (osnova za combo):</label>
              <select className="input" value={addForm.item_id} onChange={e => setAddForm({ ...addForm, item_id: parseInt(e.target.value) })}>
                <option value={0}>— Izberi artikel —</option>
                {items.filter(i => !i.is_combo).map(i => (
                  <option key={i.id} value={i.id}>{i.name} ({i.price.toFixed(2)} €) — {i.cat_name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Combo cena (€):</label>
              <input className="input" type="number" step="0.01" value={addForm.combo_price || ''} onChange={(e) => { const v = parseFloat(e.target.value); setAddForm({ ...addForm, combo_price: v || 0 }) }} />
            </div>
            <div className="modal-btns" style={{ marginTop: 16 }}>
              <button onClick={createCombo} className="btn btn-primary" disabled={!addForm.item_id || addForm.combo_price <= 0}>Ustvari</button>
              <button onClick={() => setShowAdd(false)} className="btn btn-ghost">Prekliči</button>
            </div>
          </div>
        </div>
      )}

      {editCombo && (
        <div className="overlay" onClick={() => setEditCombo(null)}>
          <div className="modal" style={{ width: 480, maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>✏️ Uredi combo: {editCombo.name}</h3>
            <div className="field">
              <label>Combo cena (€):</label>
              <input id="combo-edit-price" className="input" type="number" step="0.01" defaultValue={editCombo.combo_price || editCombo.price} />
            </div>
            <div style={{ marginTop: 12, marginBottom: 8, fontWeight: 600, fontSize: 13 }}>Artikli v combo meniju:</div>
            {editItems.map((ci: any) => {
              const item = items.find(i => i.id === ci.id)
              return (
                <div key={ci.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 13 }}>
                  <span style={{ color: 'var(--green)', fontWeight: 600, minWidth: 20 }}>{ci.quantity}x</span>
                  <span style={{ flex: 1 }}>{item?.name || '?'} <span style={{ color: 'var(--text2)', fontSize: 11 }}>({item?.cat_name || ''})</span></span>
                  <span style={{ color: 'var(--text2)', fontSize: 11 }}>{item?.price?.toFixed(2)} €</span>
                  <button onClick={() => removeChild(ci.id)} className="btn btn-xs btn-ghost" style={{ color: '#ef4444' }}>✕</button>
                </div>
              )
            })}
            <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
              <select id="combo-add-item" className="input" style={{ flex: 1 }}>
                <option value="">— Dodaj artikel —</option>
                {items.filter(i => !editItems.find((ei: any) => ei.id === i.id) && i.id !== editCombo.id).map(i => (
                  <option key={i.id} value={i.id}>{i.name} ({i.price.toFixed(2)} €)</option>
                ))}
              </select>
              <input id="combo-add-qty" className="input" type="number" min="1" defaultValue="1" style={{ width: 60 }} />
              <button onClick={addChildItem} className="btn btn-sm btn-primary">+</button>
            </div>
            <div className="modal-btns" style={{ marginTop: 16 }}>
              <button onClick={saveEdit} className="btn btn-primary">Shrani</button>
              <button onClick={() => setEditCombo(null)} className="btn btn-ghost">Prekliči</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
