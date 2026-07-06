import { useState, useEffect } from 'react'
import * as api from './api'

export default function SuppliersPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'suppliers' | 'orders'>('orders')
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [ingredients, setIngredients] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ name: '', contact: '', phone: '', email: '', address: '', notes: '' })
  const [statusFilter, setStatusFilter] = useState('')
  const [poDetail, setPoDetail] = useState<number | null>(null)
  const [receiveMode, setReceiveMode] = useState(false)
  const [receiveQtys, setReceiveQtys] = useState<Record<number, number>>({})
  const [supplierDetail, setSupplierDetail] = useState<any>(null)
  const [linkIngredient, setLinkIngredient] = useState({ ingredient_id: 0, supplier_id: 0 })

  const label: Record<string, string> = { pending: 'Čaka', approved: 'Odobreno', received: 'Sprejeto', cancelled: 'Preklicano' }
  const color: Record<string, string> = { pending: '#f59e0b', approved: '#3b82f6', received: '#22c55e', cancelled: '#ef4444' }

  const load = async () => {
    try { setSuppliers(await api.getSuppliers()) } catch {}
    const q = statusFilter ? `?status=${statusFilter}` : ''
    try { setOrders(await (await fetch(`/api/v1/suppliers/orders${q}`, { headers: api.h() })).json()) } catch {}
    try { setIngredients(await api.getIngredients()) } catch {}
  }
  useEffect(() => { load() }, [statusFilter])

  const resetForm = () => setForm({ name: '', contact: '', phone: '', email: '', address: '', notes: '' })

  const saveSupplier = async () => {
    if (!form.name) return
    if (editing) {
      await fetch(`/api/v1/suppliers/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...api.h() }, body: JSON.stringify(form) })
      onNotify(`"${form.name}" posodobljen`)
    } else {
      await api.createSupplier(form)
      onNotify(`Dobavitelj "${form.name}" dodan`)
    }
    setShowForm(false); setEditing(null); resetForm(); load()
  }

  const editSupplier = (s: any) => {
    setEditing(s); setForm({ name: s.name, contact: s.contact || '', phone: s.phone || '', email: s.email || '', address: s.address || '', notes: s.notes || '' }); setShowForm(true)
  }

  const deleteSupplier = async (id: number) => {
    if (!confirm('Izbriši dobavitelja?')) return
    await fetch(`/api/v1/suppliers/${id}`, { method: 'DELETE', headers: api.h() })
    onNotify('Dobavitelj izbrisan'); load()
  }

  const actionPO = async (id: number, action: string) => {
    try {
      const r = await fetch(`/api/v1/suppliers/orders/${id}/${action}`, { method: 'POST', headers: api.h() }).then(r => r.json())
      onNotify(`PO #${id} — ${label[r.status] || r.status}`); load()
    } catch { onNotify('❌ Napaka') }
  }

  const startReceive = (po: any) => {
    setPoDetail(po.id)
    setReceiveMode(true)
    const q: Record<number, number> = {}
    po.items.forEach((it: any) => { q[it.id] = it.quantity - it.received_quantity })
    setReceiveQtys(q)
  }

  const submitReceive = async () => {
    const items = Object.entries(receiveQtys).filter(([_, q]) => q > 0).map(([id, q]) => ({ item_id: parseInt(id), received_quantity: q }))
    if (items.length === 0) { onNotify('Vnesi količine'); return }
    try {
      const r = await fetch(`/api/v1/suppliers/orders/${poDetail}/receive`, {
        method: 'POST', headers: { ...api.h(), 'Content-Type': 'application/json' }, body: JSON.stringify({ items })
      }).then(r => r.json())
      onNotify(`📦 PO #${poDetail} — ${label[r.status] || r.status}`)
      setReceiveMode(false); setPoDetail(null); load()
    } catch { onNotify('❌ Napaka pri prevzemu') }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>🏭 Dobavitelji</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setTab('suppliers')} className={`btn btn-sm ${tab === 'suppliers' ? 'btn-primary' : 'btn-ghost'}`}>Dobavitelji</button>
          <button onClick={() => setTab('orders')} className={`btn btn-sm ${tab === 'orders' ? 'btn-primary' : 'btn-ghost'}`}>Naročila</button>
        </div>
      </div>

      {tab === 'suppliers' ? (
        <>
          <button onClick={() => { setShowForm(!showForm); if (!showForm) { setEditing(null); resetForm() } }} className="btn btn-primary btn-sm" style={{ marginBottom: 12 }}>
            {showForm ? 'Zapri' : '+ Dobavitelj'}
          </button>
          {showForm && (
            <div className="card mb-16" style={{ padding: 16 }}>
              <h4 style={{ margin: '0 0 8px' }}>{editing ? 'Uredi dobavitelja' : 'Nov dobavitelj'}</h4>
              <input className="input" placeholder="Ime *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <input className="input" placeholder="Kontakt" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} style={{ marginTop: 6 }} />
              <input className="input" placeholder="Telefon" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={{ marginTop: 6 }} />
              <input className="input" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={{ marginTop: 6 }} />
              <input className="input" placeholder="Naslov" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} style={{ marginTop: 6 }} />
              <textarea className="input" placeholder="Opombe" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ marginTop: 6, minHeight: 50, resize: 'vertical' }} />
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <button onClick={saveSupplier} className="btn btn-primary btn-sm" disabled={!form.name}>Shrani</button>
                {editing && <button onClick={() => { setShowForm(false); setEditing(null); resetForm() }} className="btn btn-sm btn-ghost">Prekliči</button>}
              </div>
            </div>
          )}
          <div className="card">
            {suppliers.map(s => (
              <div key={s.id}>
                <div className="item-row" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                  onClick={() => {
                    if (supplierDetail?.id === s.id) { setSupplierDetail(null); return }
                    fetch(`/api/v1/suppliers/${s.id}`, { headers: api.h() }).then(r => r.json()).then(setSupplierDetail)
                  }}>
                  <div className="item-info">
                    <span className="item-name">{s.name}</span>
                    <span className="item-desc">
                      {s.contact}{s.phone ? ` • ${s.phone}` : ''}{s.email ? ` • ${s.email}` : ''}
                      {s.notes ? ` • ${s.notes}` : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text2)' }}>{s.address}</span>
                    <button onClick={e => { e.stopPropagation(); editSupplier(s) }} className="btn btn-xs btn-ghost">✏️</button>
                    <button onClick={e => { e.stopPropagation(); deleteSupplier(s.id) }} className="btn btn-xs btn-ghost">🗑️</button>
                    <span style={{ fontSize: 11, color: 'var(--text2)' }}>{supplierDetail?.id === s.id ? '▲' : '▼'}</span>
                  </div>
                </div>
                {supplierDetail?.id === s.id && (
                  <div style={{ padding: '8px 12px 12px 24px', background: 'var(--bg2)', fontSize: 13 }}>
                    <h4 style={{ margin: '0 0 8px', fontSize: 13 }}>🧂 Sestavine ({supplierDetail.ingredients?.length || 0})</h4>
                    {supplierDetail.ingredients?.length > 0 ? (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <th style={{ textAlign: 'left', padding: '3px 6px' }}>Sestavina</th>
                          <th style={{ textAlign: 'right', padding: '3px 6px' }}>Zaloga</th>
                          <th style={{ textAlign: 'right', padding: '3px 6px' }}>Min</th>
                          <th style={{ textAlign: 'right', padding: '3px 6px' }}>Cena</th>
                        </tr></thead>
                        <tbody>
                          {supplierDetail.ingredients.map((ing: any) => (
                            <tr key={ing.id} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '3px 6px' }}>{ing.name}</td>
                              <td style={{ padding: '3px 6px', textAlign: 'right' }}>{ing.stock} {ing.unit}</td>
                              <td style={{ padding: '3px 6px', textAlign: 'right', color: ing.stock <= ing.min_stock ? '#ef4444' : 'var(--text2)' }}>{ing.min_stock}</td>
                              <td style={{ padding: '3px 6px', textAlign: 'right' }}>{ing.cost_per_unit?.toFixed(2)} €</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : <p style={{ color: 'var(--text2)', fontSize: 12 }}>Ni povezanih sestavin.</p>}
                    <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                      <select className="input" value={linkIngredient.ingredient_id}
                        onChange={e => setLinkIngredient({ ...linkIngredient, ingredient_id: parseInt(e.target.value) })}
                        style={{ width: 200, fontSize: 12 }}>
                        <option value={0}>— Poveži sestavino —</option>
                        {ingredients.filter(i => i.supplier_id !== s.id).map(i => (
                          <option key={i.id} value={i.id}>{i.name} ({i.category})</option>
                        ))}
                      </select>
                      <button onClick={async () => {
                        if (!linkIngredient.ingredient_id) return
                        await fetch(`/api/v1/inventory/ingredients/${linkIngredient.ingredient_id}`, {
                          method: 'PUT', headers: { ...api.h(), 'Content-Type': 'application/json' },
                          body: JSON.stringify({ supplier_id: s.id })
                        })
                        onNotify('Sestavina povezana')
                        setLinkIngredient({ ingredient_id: 0, supplier_id: 0 })
                        fetch(`/api/v1/suppliers/${s.id}`, { headers: api.h() }).then(r => r.json()).then(setSupplierDetail)
                        load()
                      }} className="btn btn-sm btn-primary" style={{ fontSize: 11 }}>Poveži</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {suppliers.length === 0 && <p style={{ color: 'var(--text2)', padding: 8 }}>Ni dobaviteljev</p>}
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 140 }}>
              <option value="">Vsa naročila</option>
              <option value="pending">Čakajoča</option>
              <option value="approved">Odobrena</option>
              <option value="received">Sprejeta</option>
              <option value="cancelled">Preklicana</option>
            </select>
            <select className="input" id="autoSupplierSelect" style={{ width: 180, fontSize: 12 }}>
              <option value={0}>— Vsi dobavitelji —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button onClick={async () => {
              const sid = (document.getElementById('autoSupplierSelect') as HTMLSelectElement)?.value || '0'
              try {
                const r = await fetch(`/api/v1/suppliers/orders/auto-generate?supplier_id=${sid}`, { method: 'POST', headers: api.h() }).then(r => r.json())
                onNotify(`⚡ ${r.message}`); load()
              } catch { onNotify('❌ Napaka') }
            }} className="btn btn-sm btn-purple">⚡ Samodejno</button>
          </div>
          <div className="card">
            {orders.map(po => (
              <div key={po.id}>
                <div className="item-row" style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                  onClick={() => setPoDetail(poDetail === po.id ? null : po.id)}>
                  <div className="item-info">
                    <span className="item-name">PO #{po.id} — {po.supplier_name}</span>
                    <span className="item-desc">{po.items?.length || 0} artiklov • {po.total?.toFixed(2)} €</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="badge" style={{ background: color[po.status] || '#888', color: '#fff' }}>{label[po.status] || po.status}</span>
                    {po.status === 'pending' && <button onClick={e => { e.stopPropagation(); actionPO(po.id, 'approve') }} className="btn btn-xs btn-blue">Odobri</button>}
                    {(po.status === 'pending' || po.status === 'approved') && (
                      <button onClick={e => { e.stopPropagation(); startReceive(po) }} className="btn btn-xs btn-green" title="Prevzemi">📥</button>
                    )}
                    {(po.status === 'pending' || po.status === 'approved') && (
                      <button onClick={e => { e.stopPropagation(); actionPO(po.id, 'cancel') }} className="btn btn-xs btn-ghost">✕</button>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--text2)' }}>{poDetail === po.id ? '▲' : '▼'}</span>
                  </div>
                </div>
                {poDetail === po.id && (
                  <div style={{ padding: '4px 12px 12px 24px', background: 'var(--bg2)', fontSize: 13 }}>
                    {po.notes && <div style={{ color: 'var(--text2)', marginBottom: 4 }}>📝 {po.notes}</div>}
                    {receiveMode ? (
                      <>
                        {po.items.map((it: any) => {
                          const remaining = it.quantity - it.received_quantity
                          return (
                            <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0' }}>
                              <span>{it.ingredient_name} — naročeno {it.quantity}, prejeto {it.received_quantity}, ostalo {remaining}</span>
                              <input className="input" type="number" step="0.1" min="0" max={remaining}
                                value={receiveQtys[it.id] ?? 0} onChange={e => setReceiveQtys(q => ({ ...q, [it.id]: parseFloat(e.target.value) || 0 }))}
                                style={{ width: 70, fontSize: 12, padding: '2px 4px' }} />
                            </div>
                          )
                        })}
                        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                          <button onClick={submitReceive} className="btn btn-sm btn-primary">✅ Potrdi prevzem</button>
                          <button onClick={() => { setReceiveMode(false); setPoDetail(null) }} className="btn btn-sm btn-ghost">Prekliči</button>
                        </div>
                      </>
                    ) : (
                      po.items.map((it: any, i: number) => {
                        const received = it.received_quantity || 0
                        const pct = it.quantity > 0 ? Math.round((received / it.quantity) * 100) : 0
                        return (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0' }}>
                            <span>{it.ingredient_name}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span>{it.quantity} × {it.unit_price?.toFixed(2)} € = {(it.quantity * it.unit_price).toFixed(2)} €</span>
                              {received > 0 && <span style={{ fontSize: 11, color: '#22c55e' }}>📦 {received}/{it.quantity} ({pct}%)</span>}
                            </span>
                          </div>
                        )
                      })
                    )}
                    {po.created_at && <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 4 }}>Ustvarjeno: {new Date(po.created_at).toLocaleString('sl-SI')}</div>}
                  </div>
                )}
              </div>
            ))}
            {orders.length === 0 && <p style={{ color: 'var(--text2)', padding: 8 }}>Ni naročil</p>}
          </div>
        </>
      )}
    </div>
  )
}
