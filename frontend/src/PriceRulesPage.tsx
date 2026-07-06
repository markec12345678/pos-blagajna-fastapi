import { useState, useEffect } from 'react'

const DOW = ['Pon', 'Tor', 'Sre', 'Čet', 'Pet', 'Sob', 'Ned']
const DOW_FULL = ['Ponedeljek', 'Torek', 'Sreda', 'Četrtek', 'Petek', 'Sobota', 'Nedelja']
const ORDER_TYPES = ['', 'dine-in', 'takeaway', 'delivery']
const OT_LABELS: Record<string, string> = { '': 'Vsi tipi', 'dine-in': 'Jedilnica', 'takeaway': 'Za s seboj', 'delivery': 'Dostava' }

export default function PriceRulesPage({ onNotify }: { onNotify: (m: string) => void }) {
  const [rules, setRules] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [edit, setEdit] = useState<any>(null)

  const load = () => {
    Promise.all([
      fetch('/api/v1/price-rules', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } }).then(r => r.json()),
      fetch('/api/v1/menu/items?all=true', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } }).then(r => r.json())
    ]).then(([r, i]) => { setRules(r); setItems(i) }).catch(() => onNotify('Napaka'))
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    if (!edit || !edit.price) return
    const body = {
      menu_item_id: edit.menu_item_id || null,
      day_of_week: edit.day_of_week !== '' ? parseInt(edit.day_of_week) : null,
      time_from: edit.time_from || null,
      time_to: edit.time_to || null,
      price: parseFloat(edit.price),
      order_type: edit.order_type || null,
      label: edit.label,
      is_active: true,
    }
    try {
      if (edit.id) {
        await fetch(`/api/v1/price-rules/${edit.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') }, body: JSON.stringify(body) })
      } else {
        await fetch('/api/v1/price-rules', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') }, body: JSON.stringify(body) })
      }
      onNotify(edit.id ? 'Posodobljeno' : 'Dodano')
      setEdit(null); load()
    } catch { onNotify('Napaka') }
  }

  const remove = async (id: number) => {
    if (!confirm('Izbrišem pravilo?')) return
    await fetch(`/api/v1/price-rules/${id}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } })
    onNotify('Izbrisano'); load()
  }

  return (
    <div className="page-container" style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
      <div className="page-header-sm">
        <h2 className="page-title">💰 Dinamične cene</h2>
        <button onClick={() => setEdit({ menu_item_id: '', day_of_week: '', time_from: '', time_to: '', price: '', order_type: '', label: '' })} className="btn btn-primary btn-sm">+ Dodaj pravilo</button>
      </div>

      <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>
        Določi posebne cene za določene dneve, ure ali tipe naročil. Pravilo z višjo prioriteto (specifičen artikel &gt; vsi artikli, določen dan &gt; vsi dnevi) ima prednost.
      </p>

      {/* Active rules */}
      <div className="card" style={{ padding: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 10px 0' }}>Aktivna pravila ({rules.length})</h3>
        {rules.length === 0 ? <p style={{ color: 'var(--text2)', fontSize: 13 }}>Ni pravil. Dodaj pravilo za dinamično ceno.</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {rules.map(r => (
              <div key={r.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 12px', borderRadius: 6, background: 'var(--bg)',
                borderLeft: '3px solid #8b5cf6', fontSize: 13
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{r.label || (r.item_name === 'Vsi artikli' ? 'Vsi artikli' : r.item_name)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>
                    {r.day_of_week != null ? DOW[r.day_of_week] + ' ' : 'Vsak dan '}
                    {r.time_from && r.time_to ? `${r.time_from}–${r.time_to} ` : 'ves dan '}
                    {r.order_type ? `• ${OT_LABELS[r.order_type] || r.order_type} ` : ''}
                    <span style={{ fontWeight: 700, color: '#059669' }}>{r.price.toFixed(2)} €</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setEdit({
                    id: r.id, menu_item_id: r.menu_item_id || '',
                    day_of_week: r.day_of_week != null ? String(r.day_of_week) : '',
                    time_from: r.time_from || '', time_to: r.time_to || '',
                    price: String(r.price), order_type: r.order_type || '', label: r.label
                  })} className="btn btn-sm btn-ghost">✎</button>
                  <button onClick={() => remove(r.id)} className="btn btn-sm btn-ghost" style={{ color: '#ef4444' }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit form */}
      {edit && (
        <div className="overlay" onClick={() => setEdit(null)}>
          <div className="modal modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h3 style={{ marginTop: 0 }}>{edit.id ? 'Uredi pravilo' : 'Novo pravilo'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 12, color: 'var(--text2)' }}>Artikel</label>
              <select className="input" value={edit.menu_item_id} onChange={e => setEdit({ ...edit, menu_item_id: e.target.value })}>
                <option value="">— Vsi artikli —</option>
                {items.map((i: any) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>

              <label style={{ fontSize: 12, color: 'var(--text2)' }}>Dan v tednu</label>
              <select className="input" value={edit.day_of_week} onChange={e => setEdit({ ...edit, day_of_week: e.target.value })}>
                <option value="">— Vsak dan —</option>
                {DOW_FULL.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>

              <label style={{ fontSize: 12, color: 'var(--text2)' }}>Časovni okvir</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" type="time" value={edit.time_from} onChange={e => setEdit({ ...edit, time_from: e.target.value })} style={{ flex: 1 }} />
                <input className="input" type="time" value={edit.time_to} onChange={e => setEdit({ ...edit, time_to: e.target.value })} style={{ flex: 1 }} />
              </div>

              <label style={{ fontSize: 12, color: 'var(--text2)' }}>Tip naročila</label>
              <select className="input" value={edit.order_type} onChange={e => setEdit({ ...edit, order_type: e.target.value })}>
                {ORDER_TYPES.map(ot => <option key={ot} value={ot}>{OT_LABELS[ot]}</option>)}
              </select>

              <label style={{ fontSize: 12, color: 'var(--text2)' }}>Cena (€)</label>
              <input className="input" type="number" step="0.01" placeholder="Cena" value={edit.price} onChange={e => setEdit({ ...edit, price: e.target.value })} />

              <input className="input" placeholder="Naziv (npr. Kosilo 12-15h)" value={edit.label} onChange={e => setEdit({ ...edit, label: e.target.value })} />
            </div>
            <div className="modal-btns" style={{ marginTop: 16 }}>
              <button onClick={save} className="btn btn-primary" disabled={!edit.price}>Shrani</button>
              <button onClick={() => setEdit(null)} className="btn btn-ghost">Prekliči</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
