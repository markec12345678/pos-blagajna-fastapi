import { useState, useEffect } from 'react'

export default function PurchaseOrderPage({ onNotify }: { onNotify?: (msg: string, err?: boolean) => void }) {
  const [orders, setOrders] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [ingredients, setIngredients] = useState<any[]>([])
  const [filter, setFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createData, setCreateData] = useState({ supplier_id: 0, notes: '', items: [] as any[] })
  const [newItem, setNewItem] = useState({ ingredient_id: 0, quantity: 0, unit_price: 0 })
  const [expanded, setExpanded] = useState<number | null>(null)

  const load = async () => {
    const url = filter ? `/api/v1/suppliers/orders?status=${filter}` : '/api/v1/suppliers/orders'
    const [r, s, i] = await Promise.all([
      fetch(url), fetch('/api/v1/suppliers?branch_id=0'),
      fetch('/api/v1/inventory?branch_id=0')
    ])
    if (r.ok) setOrders(await r.json())
    if (s.ok) setSuppliers(await s.json())
    if (i.ok) setIngredients(await i.json())
  }

  useEffect(() => { load() }, [filter])

  const createOrder = async () => {
    const body = {
      supplier_id: createData.supplier_id || undefined,
      notes: createData.notes, items: createData.items
    }
    const r = await fetch('/api/v1/suppliers/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    })
    if (r.ok) {
      onNotify?.('PO ustvarjen')
      setShowCreate(false)
      setCreateData({ supplier_id: 0, notes: '', items: [] })
      load()
    } else {
      const err = await r.json()
      onNotify?.(err.detail || 'Napaka', true)
    }
  }

  const addItemToCreate = () => {
    if (!newItem.ingredient_id || !newItem.quantity) return
    const ing = ingredients.find(i => i.id === newItem.ingredient_id)
    setCreateData(p => ({
      ...p, items: [...p.items, {
        ingredient_id: newItem.ingredient_id,
        ingredient_name: ing?.name || '?',
        quantity: newItem.quantity,
        unit_price: newItem.unit_price || ing?.cost_per_unit || 0
      }]
    }))
    setNewItem({ ingredient_id: 0, quantity: 0, unit_price: 0 })
  }

  const removeItem = (idx: number) => {
    setCreateData(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))
  }

  const approvePO = async (id: number) => {
    const r = await fetch(`/api/v1/suppliers/orders/${id}/approve`, { method: 'POST' })
    if (r.ok) { onNotify?.('PO odobren'); load() }
    else onNotify?.('Napaka pri odobritvi', true)
  }

  const cancelPO = async (id: number) => {
    if (!confirm('Prekličem naročilo?')) return
    const r = await fetch(`/api/v1/suppliers/orders/${id}/cancel`, { method: 'POST' })
    if (r.ok) { onNotify?.('PO preklican'); load() }
    else onNotify?.('Napaka', true)
  }

  const receivePO = async (id: number) => {
    const r = await fetch(`/api/v1/suppliers/orders/${id}/receive`, { method: 'POST' })
    if (r.ok) { onNotify?.('PO prejet'); load() }
    else onNotify?.('Napaka', true)
  }

  const autoGenerate = async () => {
    const r = await fetch('/api/v1/suppliers/orders/auto-generate', { method: 'POST' })
    if (r.ok) {
      const d = await r.json()
      onNotify?.(d.message || 'POji ustvarjeni')
      load()
    } else onNotify?.('Napaka pri avto-generaciji', true)
  }

  const statusColor: Record<string, string> = {
    pending: '#f59e0b', approved: '#3b82f6',
    received: '#059669', cancelled: '#ef4444'
  }
  const totalCost = (items: any[]) => items.reduce((s, i) => s + i.quantity * i.unit_price, 0)

  return (
    <div>
      <div className="page-header">
        <h2>📦 Nabavna naročila</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={autoGenerate}>⚡ Avto-generacija</button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Novo naročilo</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['', 'pending', 'approved', 'received', 'cancelled'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{
              padding: '6px 14px', borderRadius: 8, border: `1px solid ${filter === s ? statusColor[s] || '#059669' : '#e2e8f0'}`,
              background: filter === s ? (statusColor[s] || '#059669') + '18' : '#fff',
              fontSize: 12, cursor: 'pointer', color: '#0f172a', fontWeight: filter === s ? 600 : 400
            }}>
            {s ? { pending: 'Čakajoča', approved: 'Odobrena', received: 'Prejeta', cancelled: 'Preklicana' }[s] : 'Vsa'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {orders.map(po => (
          <div key={po.id} className="card" style={{ padding: 16 }}>
            <div onClick={() => setExpanded(expanded === po.id ? null : po.id)} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: 15 }}>PO #{po.id}</strong>
                  <span style={{ marginLeft: 8, fontSize: 12, color: '#64748b' }}>{po.supplier_name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                    background: (statusColor[po.status] || '#94a3b8') + '20',
                    color: statusColor[po.status] || '#64748b'
                  }}>{po.status}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>€{po.total?.toFixed(2)}</span>
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                {new Date(po.created_at).toLocaleDateString('sl-SI', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                {' • '}{po.items?.length || 0} artiklov
              </div>
            </div>

            {expanded === po.id && (
              <div style={{ marginTop: 12, borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
                {po.notes && <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>📝 {po.notes}</div>}
                <table className="table" style={{ fontSize: 12 }}>
                  <thead><tr><th>Artikel</th><th>Količina</th><th>Cena</th><th>Skupaj</th><th>Prejeto</th></tr></thead>
                  <tbody>
                    {po.items?.map((it: any) => (
                      <tr key={it.id}>
                        <td>{it.ingredient_name}</td>
                        <td>{it.quantity} {it.unit}</td>
                        <td>€{it.unit_price?.toFixed(2)}</td>
                        <td>€{(it.quantity * it.unit_price)?.toFixed(2)}</td>
                        <td>{it.received_quantity || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  {po.status === 'pending' && (
                    <>
                      <button className="btn btn-sm" style={{ background: '#3b82f6', color: '#fff' }} onClick={() => approvePO(po.id)}>✅ Odobri</button>
                      <button className="btn btn-sm" style={{ background: '#ef4444', color: '#fff' }} onClick={() => cancelPO(po.id)}>❌ Prekliči</button>
                    </>
                  )}
                  {(po.status === 'pending' || po.status === 'approved') && (
                    <button className="btn btn-sm" style={{ background: '#059669', color: '#fff' }} onClick={() => receivePO(po.id)}>📥 Prejemi</button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {orders.length === 0 && <div className="card" style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Ni naročil</div>}
      </div>

      {showCreate && (
        <div className="overlay" onClick={() => setShowCreate(false)}>
          <div className="modal modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <h3 style={{ marginBottom: 16 }}>Novo nabavno naročilo</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Dobavitelj</label>
              <select className="input" value={createData.supplier_id}
                onChange={e => setCreateData(p => ({ ...p, supplier_id: parseInt(e.target.value) }))}
                style={{ width: '100%' }}>
                <option value={0}>— Brez dobavitelja —</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Opomba</label>
              <input className="input" value={createData.notes}
                onChange={e => setCreateData(p => ({ ...p, notes: e.target.value }))}
                style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 600 }}>Artikli</div>
            {createData.items.map((it, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: 12 }}>
                <span style={{ flex: 1 }}>{it.ingredient_name}</span>
                <span>{it.quantity} × €{it.unit_price.toFixed(2)} = €{(it.quantity * it.unit_price).toFixed(2)}</span>
                <button onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
              <select className="input" value={newItem.ingredient_id}
                onChange={e => {
                  const ing = ingredients.find(i => i.id === parseInt(e.target.value))
                  setNewItem({ ingredient_id: parseInt(e.target.value), quantity: 0, unit_price: ing?.cost_per_unit || 0 })
                }}
                style={{ flex: 1 }}>
                <option value={0}>Izberi artikel</option>
                {ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
              </select>
              <input type="number" className="input" placeholder="Količina" value={newItem.quantity || ''}
                onChange={e => setNewItem(p => ({ ...p, quantity: parseFloat(e.target.value) || 0 }))}
                style={{ width: 80 }} />
              <input type="number" className="input" placeholder="Cena" value={newItem.unit_price || ''}
                onChange={e => setNewItem(p => ({ ...p, unit_price: parseFloat(e.target.value) || 0 }))}
                style={{ width: 80 }} />
              <button className="btn btn-sm" onClick={addItemToCreate} disabled={!newItem.ingredient_id || !newItem.quantity}>+</button>
            </div>

            <div style={{ marginTop: 12, fontSize: 14, fontWeight: 600 }}>
              Skupaj: €{createData.items.reduce((s, i) => s + i.quantity * i.unit_price, 0).toFixed(2)}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn btn-primary" onClick={createOrder}
                disabled={createData.items.length === 0}>Ustvari naročilo</button>
              <button className="btn" onClick={() => setShowCreate(false)}>Prekliči</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
