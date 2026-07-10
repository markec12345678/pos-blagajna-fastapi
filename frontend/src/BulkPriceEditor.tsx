import { useState, useEffect } from 'react'

export default function BulkPriceEditor({ onNotify }: { onNotify: (msg: string) => void }) {
  const [items, setItems] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [catFilter, setCatFilter] = useState('')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('name')
  const [sortAsc, setSortAsc] = useState(true)
  const [dirty, setDirty] = useState<Set<number>>(new Set())
  const [showBulk, setShowBulk] = useState(false)
  const [bulkVal, setBulkVal] = useState('')
  const [bulkAction, setBulkAction] = useState('price')
  const [bulkCat, setBulkCat] = useState('')
  const [saving, setSaving] = useState(false)

  const h = { 'Authorization': 'Bearer ' + localStorage.getItem('token') }

  const load = async () => {
    setLoading(true)
    try {
      const [catR, costR] = await Promise.all([
        fetch('/api/v1/menu/categories', { headers: h }).then(r => r.json()),
        fetch('/api/v1/menu/costs', { headers: h }).then(r => r.json())
      ])
      setCategories(catR)
      setItems(costR.map((i: any) => ({
        ...i,
        _origPrice: i.price,
        _editing: false,
        _editVal: String(i.price)
      })))
    } catch { onNotify('Napaka pri nalaganju') }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const toggleSort = (k: string) => {
    if (sortKey === k) setSortAsc(!sortAsc)
    else { setSortKey(k); setSortAsc(true) }
  }

  const updatePrice = async (id: number) => {
    const item = items.find(i => i.id === id)
    if (!item) return
    const val = parseFloat(item._editVal)
    if (isNaN(val) || val <= 0) return
    await fetch(`/api/v1/menu/items/${id}`, {
      method: 'PUT', headers: { ...h, 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: val })
    })
    const newDirty = new Set(dirty)
    newDirty.delete(id)
    setDirty(newDirty)
    setItems((prev: any[]) => prev.map(i => i.id === id ? { ...i, price: val, _origPrice: val, _editing: false } : i))
    onNotify('Cena posodobljena')
  }

  const startEdit = (id: number) => {
    setItems((prev: any[]) => prev.map(i => i.id === id ? { ...i, _editing: true, _editVal: String(i.price) } : i))
  }

  const handleEditChange = (id: number, val: string) => {
    setItems((prev: any[]) => prev.map(i => {
      if (i.id !== id) return i
      const newDirty = new Set(dirty)
      if (parseFloat(val) !== i._origPrice) newDirty.add(id)
      else newDirty.delete(id)
      setDirty(newDirty)
      return { ...i, _editVal: val }
    }))
  }

  const applyBulk = async () => {
    if (!bulkVal) return
    setSaving(true)
    try {
      const r = await fetch('/api/v1/menu/bulk', {
        method: 'POST', headers: { ...h, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: bulkAction,
          value: bulkVal,
          category_id: bulkCat ? parseInt(bulkCat) : undefined
        })
      })
      const d = await r.json()
      onNotify(`Posodobljeno ${d.updated} artiklov`)
      load()
      setShowBulk(false)
    } catch { onNotify('Napaka pri masovnem posodabljanju') }
    setSaving(false)
  }

  const sQuery = search.toLowerCase()
  const filtered = items
    .filter(i => !catFilter || i.category === catFilter)
    .filter(i => !sQuery || i.name.toLowerCase().includes(sQuery))
    .sort((a: any, b: any) => {
      let va: any, vb: any
      switch (sortKey) {
        case 'name': va = a.name; vb = b.name; break
        case 'price': va = a.price; vb = b.price; break
        case 'cost': va = a.cost ?? 0; vb = b.cost ?? 0; break
        case 'margin': va = a.margin ?? -999; vb = b.margin ?? -999; break
        default: va = a.name; vb = b.name
      }
      return sortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
    })

  const cats = [...new Set(items.map((i: any) => i.category || 'N/A'))].sort()
  const mColor = (pct: number) => {
    if (pct < 0) return '#ef4444'
    if (pct < 20) return '#f59e0b'
    if (pct < 40) return '#22c55e'
    if (pct < 60) return '#059669'
    return '#10b981'
  }

  if (loading) return <div className="page-container"><p style={{ textAlign: 'center', padding: 40 }}>Nalaganje...</p></div>

  return (
    <div className="page-container" style={{ maxWidth: 1000, margin: '0 auto', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 className="page-title" style={{ margin: 0 }}>💰 Množično urejanje cen</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowBulk(true)} className="btn btn-primary">
            ⚡ Množična akcija
          </button>
          <button onClick={load} className="btn btn-ghost">🔄 Osveži</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <select className="input" value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ width: 180, fontSize: 12, padding: '4px 8px' }}>
          <option value="">— Vse kategorije —</option>
          {cats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input className="input" placeholder="🔍 Išči artikel..." value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 200, fontSize: 12, padding: '4px 8px' }} />
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>
          {filtered.length} / {items.length} artiklov
        </span>
        <span style={{ fontSize: 12, color: 'var(--text2)', marginLeft: 'auto' }}>
          {dirty.size > 0 && <span style={{ color: '#f59e0b' }}>{dirty.size} neshranjenih</span>}
        </span>
      </div>

      <div style={{
        overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border)',
        background: 'var(--surface)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--surface2)', borderBottom: '2px solid var(--border)' }}>
              <th className="sort-th" onClick={() => toggleSort('name')} style={{ padding: '10px 12px', textAlign: 'left', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Ime {sortKey === 'name' ? (sortAsc ? '▲' : '▼') : ''}
              </th>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>Kategorija</th>
              <th className="sort-th" onClick={() => toggleSort('price')} style={{ padding: '10px 12px', textAlign: 'right', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Cena {sortKey === 'price' ? (sortAsc ? '▲' : '▼') : ''}
              </th>
              <th className="sort-th" onClick={() => toggleSort('cost')} style={{ padding: '10px 12px', textAlign: 'right', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Strošek {sortKey === 'cost' ? (sortAsc ? '▲' : '▼') : ''}
              </th>
              <th className="sort-th" onClick={() => toggleSort('margin')} style={{ padding: '10px 12px', textAlign: 'right', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Marža {sortKey === 'margin' ? (sortAsc ? '▲' : '▼') : ''}
              </th>
              <th style={{ padding: '10px 12px', textAlign: 'center' }}>Akcija</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item: any) => (
              <tr key={item.id} style={{
                borderBottom: '1px solid var(--border)',
                background: dirty.has(item.id) ? 'rgba(245, 158, 11, 0.08)' : undefined,
                transition: 'background 0.2s'
              }}>
                <td style={{ padding: '8px 12px', fontWeight: 500 }}>{item.name}</td>
                <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text2)' }}>{item.category || '—'}</td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                  {item._editing ? (
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <input className="input" type="number" step="0.01" min="0"
                        value={item._editVal}
                        onChange={e => handleEditChange(item.id, e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && updatePrice(item.id)}
                        style={{ width: 80, fontSize: 12, padding: '2px 6px', textAlign: 'right' }}
                        autoFocus />
                      <button onClick={() => updatePrice(item.id)} className="btn btn-xs btn-primary" style={{ padding: '2px 6px' }}>✓</button>
                      <button onClick={() => setItems((prev: any[]) => prev.map((i: any) => i.id === item.id ? { ...i, _editing: false, _editVal: String(i.price) } : i))}
                        className="btn btn-xs btn-ghost" style={{ padding: '2px 6px' }}>✕</button>
                    </div>
                  ) : (
                    <span style={{ cursor: 'pointer', borderBottom: dirty.has(item.id) ? '2px dashed #f59e0b' : '2px dashed transparent' }}
                      onClick={() => startEdit(item.id)}
                      title="Klikni za urejanje">
                      {item.price.toFixed(2)} €
                    </span>
                  )}
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'right', color: item.cost !== null ? 'var(--red)' : 'var(--text2)' }}>
                  {item.cost !== null ? `${item.cost.toFixed(2)} €` : '—'}
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                  {item.margin !== null ? (
                    <span style={{
                      color: mColor(item.margin), fontWeight: 600,
                      background: `${mColor(item.margin)}15`, padding: '2px 8px', borderRadius: 4
                    }}>
                      {item.margin.toFixed(1)}%
                    </span>
                  ) : '—'}
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                  <button onClick={() => {
                    if (item.cost !== null && item.cost > 0)
                      handleEditChange(item.id, String(parseFloat((item.cost * 3).toFixed(2))))
                    startEdit(item.id)
                  }} className="btn btn-xs btn-ghost" title="Cena = strošek × 3" style={{ fontSize: 11 }}>
                    🧮×3
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showBulk && (
        <div className="overlay" onClick={() => setShowBulk(false)}>
          <div className="modal modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <h3 style={{ marginTop: 0 }}>⚡ Množična akcija</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}>Akcija</label>
                <select className="input" value={bulkAction} onChange={e => setBulkAction(e.target.value)} style={{ width: '100%' }}>
                  <option value="price">Spremeni ceno</option>
                  <option value="activate">Aktiviraj/Deaktiviraj</option>
                  <option value="category">Spremeni kategorijo</option>
                  <option value="course">Spremeni tečaj</option>
                </select>
              </div>
              {bulkAction === 'price' && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}>
                    Vrednost (npr: +10%, -5%, +2.50, 12.99)
                  </label>
                  <input className="input" placeholder="+10%, -5%, +2.50, 12.99" value={bulkVal}
                    onChange={e => setBulkVal(e.target.value)} style={{ width: '100%' }} />
                </div>
              )}
              {bulkAction === 'activate' && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}>Stanje</label>
                  <select className="input" value={bulkVal} onChange={e => setBulkVal(e.target.value)} style={{ width: '100%' }}>
                    <option value="activate">Aktiviraj</option>
                    <option value="deactivate">Deaktiviraj</option>
                  </select>
                </div>
              )}
              {bulkAction === 'category' && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}>Nova kategorija</label>
                  <select className="input" value={bulkVal} onChange={e => setBulkVal(e.target.value)} style={{ width: '100%' }}>
                    <option value="">— Izberi —</option>
                    {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}>Filtriraj po kategoriji (neobvezno)</label>
                <select className="input" value={bulkCat} onChange={e => setBulkCat(e.target.value)} style={{ width: '100%' }}>
                  <option value="">— Vse kategorije —</option>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-btns" style={{ marginTop: 16 }}>
              <button onClick={applyBulk} className="btn btn-primary" disabled={saving}>
                {saving ? '⏳' : '⚡ Izvedi'}
              </button>
              <button onClick={() => setShowBulk(false)} className="btn btn-ghost">Prekliči</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
