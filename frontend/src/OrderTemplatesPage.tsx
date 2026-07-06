import { useState, useEffect } from 'react'

export default function OrderTemplatesPage({ onNotify }: { onNotify: (m: string) => void }) {
  const [templates, setTemplates] = useState<any[]>([])
  const [menu, setMenu] = useState<any[]>([])
  const [tables, setTables] = useState<any[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({ name: '', category: '', items: [{ menu_item_id: '', quantity: 1, notes: '' }] })
  const [applyId, setApplyId] = useState<number | null>(null)
  const [applyTable, setApplyTable] = useState('')

  const load = () => {
    Promise.all([
      fetch('/api/v1/order-templates', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } }).then(r => r.json()),
      fetch('/api/v1/menu/items?all=true', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } }).then(r => r.json()),
      fetch('/api/v1/tables', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } }).then(r => r.json()),
    ]).then(([t, m, tb]) => { setTemplates(t); setMenu(m); setTables(tb) })
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form.name.trim() || form.items.length === 0) return
    const items = form.items.filter(i => i.menu_item_id).map(i => ({
      menu_item_id: parseInt(i.menu_item_id),
      quantity: parseInt(String(i.quantity)) || 1,
      notes: i.notes || ''
    }))
    const url = editId ? `/api/v1/order-templates/${editId}` : '/api/v1/order-templates'
    const method = editId ? 'PUT' : 'POST'
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') },
      body: JSON.stringify({ name: form.name, category: form.category, items })
    })
    onNotify(editId ? 'Posodobljeno' : 'Ustvarjeno')
    setShowCreate(false); setEditId(null)
    setForm({ name: '', category: '', items: [{ menu_item_id: '', quantity: 1, notes: '' }] })
    load()
  }

  const editTemplate = (t: any) => {
    setEditId(t.id)
    setForm({
      name: t.name, category: t.category || '',
      items: t.items.length > 0 ? t.items.map((i: any) => ({ menu_item_id: String(i.menu_item_id), quantity: i.quantity, notes: i.notes || '' }))
        : [{ menu_item_id: '', quantity: 1, notes: '' }]
    })
    setShowCreate(true)
  }

  const remove = async (id: number) => {
    if (!confirm('Izbrišem predlogo?')) return
    await fetch(`/api/v1/order-templates/${id}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } })
    onNotify('Izbrisano'); load()
  }

  const applyTemplate = async () => {
    if (!applyId || !applyTable) return
    const r = await fetch(`/api/v1/order-templates/${applyId}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') },
      body: JSON.stringify({ table_id: parseInt(applyTable), cashier_id: 1 })
    })
    const d = await r.json()
    if (r.ok) {
      onNotify(`Naročilo #${d.order_id} ustvarjeno (${d.total.toFixed(2)} €)`)
      setApplyId(null); setApplyTable('')
    } else {
      onNotify(d.detail || 'Napaka')
    }
  }

  const addItem = () => setForm({ ...form, items: [...form.items, { menu_item_id: '', quantity: 1, notes: '' }] })
  const removeItem = (i: number) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) })
  const updateItem = (i: number, field: string, val: any) => {
    const copy = [...form.items]
    copy[i] = { ...copy[i], [field]: val }
    setForm({ ...form, items: copy })
  }

  return (
    <div className="page-container" style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
      <div className="page-header-sm">
        <h2 className="page-title">📋 Predloge naročil</h2>
        <button onClick={() => { setEditId(null); setForm({ name: '', category: '', items: [{ menu_item_id: '', quantity: 1, notes: '' }] }); setShowCreate(true) }}
          className="btn btn-primary btn-sm">+ Nova predloga</button>
      </div>

      {/* Template cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {templates.length === 0 && <p style={{ color: 'var(--text2)' }}>Ni predlog. Ustvari prvo predlogo za hitro naročanje.</p>}
        {templates.map(t => (
          <div key={t.id} className="card" style={{
            padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                {t.name}
                {t.category && <span style={{
                  fontSize: 11, marginLeft: 8, padding: '1px 6px', borderRadius: 4,
                  background: '#6366f122', color: '#6366f1', fontWeight: 600
                }}>{t.category}</span>}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{t.item_count} artiklov</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => { setApplyId(t.id); setApplyTable('') }} className="btn btn-sm btn-primary"
                disabled={t.item_count === 0}>Uporabi</button>
              <button onClick={() => editTemplate(t)} className="btn btn-sm btn-ghost">✏️</button>
              <button onClick={() => remove(t.id)} className="btn btn-sm btn-ghost" style={{ color: '#ef4444' }}>🗑️</button>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit modal */}
      {showCreate && (
        <div className="overlay" onClick={() => setShowCreate(false)}>
          <div className="modal modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <h3 style={{ marginTop: 0 }}>{editId ? 'Uredi predlogo' : 'Nova predloga'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input className="input" placeholder="Ime predloge *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <input className="input" placeholder="Kategorija (npr. zajtrk, kosilo)" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>Artikli:</div>
              {form.items.map((it, i) => (
                <div key={i} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <select className="input" value={it.menu_item_id} onChange={e => updateItem(i, 'menu_item_id', e.target.value)} style={{ flex: 1 }}>
                    <option value="">— Izberi artikel —</option>
                    {menu.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <input className="input" type="number" min={1} style={{ width: 50 }} value={it.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
                  {form.items.length > 1 && <button onClick={() => removeItem(i)} className="btn btn-sm btn-ghost" style={{ color: '#ef4444' }}>✕</button>}
                </div>
              ))}
              <button onClick={addItem} className="btn btn-sm btn-ghost">+ Dodaj artikel</button>
            </div>
            <div className="modal-btns" style={{ marginTop: 16 }}>
              <button onClick={save} className="btn btn-primary" disabled={!form.name.trim() || form.items.every(i => !i.menu_item_id)}>Shrani</button>
              <button onClick={() => setShowCreate(false)} className="btn btn-ghost">Prekliči</button>
            </div>
          </div>
        </div>
      )}

      {/* Apply modal */}
      {applyId && (
        <div className="overlay" onClick={() => setApplyId(null)}>
          <div className="modal modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 320 }}>
            <h3 style={{ marginTop: 0 }}>Uporabi predlogo</h3>
            <p style={{ fontSize: 13, color: 'var(--text2)', margin: '0 0 8px 0' }}>
              Izbrana predloga bo uporabljena za novo naročilo na izbrani mizi.
            </p>
            <select className="input" value={applyTable} onChange={e => setApplyTable(e.target.value)}>
              <option value="">— Izberi mizo —</option>
              {tables.filter((tb: any) => tb.status === 'free').map((tb: any) => (
                <option key={tb.id} value={tb.id}>{tb.name} (prosta)</option>
              ))}
            </select>
            <div className="modal-btns" style={{ marginTop: 16 }}>
              <button onClick={applyTemplate} className="btn btn-primary" disabled={!applyTable}>Ustvari naročilo</button>
              <button onClick={() => setApplyId(null)} className="btn btn-ghost">Prekliči</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
