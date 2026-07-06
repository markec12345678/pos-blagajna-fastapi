import { useState, useEffect } from 'react'

export default function CrossSellManagerPage({ onNotify }: { onNotify?: (msg: string, err?: boolean) => void }) {
  const [items, setItems] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [newSugId, setNewSugId] = useState(0)
  const [newType, setNewType] = useState('cross-sell')
  const [search, setSearch] = useState('')

  const loadItems = async () => {
    const r = await fetch('/api/v1/menu?branch_id=0')
    if (r.ok) {
      const cats = await r.json()
      setItems(cats.flatMap((c: any) => c.items || []))
    }
  }

  const loadSuggestions = async (id: number) => {
    setSelectedId(id)
    const r = await fetch(`/api/v1/menu/cross-sell/${id}`)
    if (r.ok) setSuggestions(await r.json())
  }

  useEffect(() => { loadItems() }, [])

  const addSuggestion = async () => {
    if (!selectedId || !newSugId) return
    const r = await fetch('/api/v1/menu/cross-sell', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: selectedId, suggested_id: newSugId, type: newType })
    })
    if (r.ok) { onNotify?.('Dodano'); setNewSugId(0); loadSuggestions(selectedId) }
    else { const d = await r.json(); onNotify?.(d.detail || 'Napaka', true) }
  }

  const removeSuggestion = async (csId: number) => {
    const r = await fetch(`/api/v1/menu/cross-sell/${csId}`, { method: 'DELETE' })
    if (r.ok) { onNotify?.('Odstranjeno'); selectedId && loadSuggestions(selectedId) }
  }

  const filtered = items.filter((i: any) =>
    !search || i.name.toLowerCase().includes(search.toLowerCase())
  )
  const selectedItem = items.find((i: any) => i.id === selectedId)

  return (
    <div>
      <div className="page-header">
        <h2>🔗 Priporočila (Cross-Sell)</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Izberi jed</h3>
          <input className="input" placeholder="🔍 Išči jed..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', marginBottom: 8 }} />
          <div style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filtered.map((i: any) => (
              <button key={i.id} onClick={() => loadSuggestions(i.id)}
                style={{
                  textAlign: 'left', padding: '8px 10px', border: 'none', borderRadius: 6,
                  background: selectedId === i.id ? '#05966920' : 'transparent',
                  color: '#0f172a', cursor: 'pointer', fontSize: 13,
                  borderLeft: selectedId === i.id ? '3px solid #059669' : '3px solid transparent'
                }}>
                {i.name}
                <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>€{i.price.toFixed(2)}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          {selectedItem && (
            <div className="card" style={{ padding: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>🎯 {selectedItem.name}</h3>
              <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                Priporočila, ko stranka izbere to jed
              </p>

              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select className="input" value={newSugId} onChange={e => setNewSugId(parseInt(e.target.value))}
                    style={{ flex: 1 }}>
                    <option value={0}>Izberi priporočilo...</option>
                    {items.filter(i => i.id !== selectedId).map(i => (
                      <option key={i.id} value={i.id}>{i.name} (€{i.price.toFixed(2)})</option>
                    ))}
                  </select>
                  <select className="input" value={newType} onChange={e => setNewType(e.target.value)}
                    style={{ width: 120 }}>
                    <option value="cross-sell">Cross-sell</option>
                    <option value="upsell">Upsell</option>
                    <option value="substitute">Nadomestek</option>
                  </select>
                  <button className="btn btn-sm btn-primary" onClick={addSuggestion}
                    disabled={!newSugId}>+</button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {suggestions.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 20 }}>
                    Ni priporočil. Dodaj prvo.
                  </div>
                ) : suggestions.map(s => (
                  <div key={s.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 10px', background: '#f8fafc', borderRadius: 8, fontSize: 13
                  }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>{s.name}</span>
                      <span style={{ marginLeft: 8, color: '#059669' }}>€{s.price?.toFixed(2)}</span>
                      <span style={{
                        marginLeft: 8, fontSize: 11, padding: '1px 6px', borderRadius: 4,
                        background: s.type === 'upsell' ? '#f59e0b20' : s.type === 'substitute' ? '#3b82f620' : '#f0fdf4',
                        color: s.type === 'upsell' ? '#f59e0b' : s.type === 'substitute' ? '#3b82f6' : '#059669'
                      }}>{s.type}</span>
                    </div>
                    <button onClick={() => removeSuggestion(s.id)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
