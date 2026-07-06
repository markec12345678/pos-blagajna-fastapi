import { useState, useEffect } from 'react'
import * as api from './api'

interface Promotion {
  id: number; name: string; type: string; value: number; min_order: number;
  category_id: number | null; buy_qty: number; free_qty: number; free_discount_pct: number;
  time_start: string; time_end: string; days_of_week: string;
  start_date: string | null; end_date: string | null;
  is_active: boolean; branch_id: number | null; description: string;
}

const TYPE_OPTIONS = [
  { value: 'percentage', label: '% na celotno naročilo' },
  { value: 'fixed', label: 'Fiksni znesek' },
  { value: 'bogo', label: 'BOGO (kupi X, dobi Y brezplačno)' },
  { value: 'category_percentage', label: '% na kategorijo' },
  { value: 'happy_hour', label: 'Happy hour (časovni %)' },
]

const WEEKDAYS = ['Pon', 'Tor', 'Sre', 'Čet', 'Pet', 'Sob', 'Ned']

function emptyForm(): any {
  return { name: '', type: 'percentage', value: 0, min_order: 0, category_id: null,
    buy_qty: 0, free_qty: 0, free_discount_pct: 100,
    time_start: '', time_end: '', days_of_week: '',
    start_date: '', end_date: '', description: '' }
}

export default function PromotionsPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [promos, setPromos] = useState<Promotion[]>([])
  const [cats, setCats] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<any>(emptyForm())

  const load = () => {
    fetch('/api/v1/promotions', { headers: api.authHeader() }).then(r => r.json()).then(setPromos).catch(() => {})
    fetch('/api/v1/menu/categories', { headers: api.authHeader() }).then(r => r.json()).then(setCats).catch(() => {})
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    const body = { ...form, value: parseFloat(form.value), min_order: parseFloat(form.min_order || 0) }
    if (body.type === 'bogo') {
      body.buy_qty = parseInt(body.buy_qty) || 0
      body.free_qty = parseInt(body.free_qty) || 0
      body.free_discount_pct = parseFloat(body.free_discount_pct) || 100
    }
    const url = editId ? `/api/v1/promotions/${editId}` : '/api/v1/promotions'
    const r = await fetch(url, { method: editId ? 'PUT' : 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!r.ok) { const e = await r.json(); alert(e.detail || 'Napaka'); return }
    onNotify(editId ? 'Posodobljeno' : 'Ustvarjeno')
    setShowForm(false); setEditId(null); setForm(emptyForm()); load()
  }

  const edit = (p: Promotion) => {
    setEditId(p.id)
    setForm({
      ...emptyForm(),
      name: p.name, type: p.type, value: p.value, min_order: p.min_order,
      category_id: p.category_id, buy_qty: p.buy_qty, free_qty: p.free_qty,
      free_discount_pct: p.free_discount_pct, time_start: p.time_start,
      time_end: p.time_end,
      days_of_week: typeof p.days_of_week === 'string' ? p.days_of_week : JSON.stringify(p.days_of_week),
      start_date: p.start_date ? p.start_date.slice(0, 16) : '',
      end_date: p.end_date ? p.end_date.slice(0, 16) : '',
      description: p.description || ''
    })
    setShowForm(true)
  }

  const toggle = async (p: Promotion) => {
    await fetch(`/api/v1/promotions/${p.id}`, { method: 'PUT', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !p.is_active }) })
    onNotify(p.is_active ? 'Deaktivirana' : 'Aktivirana'); load()
  }

  const del = async (id: number) => {
    if (!confirm('Izbriši promocijo?')) return
    await fetch(`/api/v1/promotions/${id}`, { method: 'DELETE', headers: api.authHeader() })
    onNotify('Izbrisana'); load()
  }

  const toggleDay = (d: string) => {
    const days = form.days_of_week ? form.days_of_week.split(',').filter(Boolean) : []
    const idx = days.indexOf(d)
    if (idx >= 0) days.splice(idx, 1)
    else days.push(d)
    setForm({ ...form, days_of_week: days.join(',') })
  }

  const label = (p: Promotion) => {
    if (p.type === 'percentage') return `${p.value}% popusta${p.min_order > 0 ? ` (min. ${p.min_order.toFixed(2)} €)` : ''}`
    if (p.type === 'fixed') return `${p.value.toFixed(2)} € popusta`
    if (p.type === 'bogo') return `Kupi ${p.buy_qty} × dobi ${p.free_qty} ${p.free_discount_pct < 100 ? `-${p.free_discount_pct}%` : 'gratis'}`
    if (p.type === 'category_percentage') return `${p.value}% na kategorijo`
    if (p.type === 'happy_hour') return `${p.value}% (${p.time_start}-${p.time_end})`
    return ''
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>🏷️ Promocije</h2>
        <button onClick={() => { setEditId(null); setForm(emptyForm()); setShowForm(true) }} className="btn btn-primary">+ Nova promocija</button>
      </div>

      <div className="card-grid">
        {promos.map(p => (
          <div key={p.id} className={`card ${!p.is_active ? 'card-dim' : ''}`}
            style={{ border: `2px solid ${p.is_active ? '#22c55e' : '#666'}`, padding: 16, borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>{p.name}</strong>
              <span className={`badge ${p.is_active ? 'badge-green' : 'badge-gray'}`}>{p.is_active ? 'Aktivna' : 'Neaktivna'}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>{label(p)}</div>
            {p.start_date && <div style={{ fontSize: 12, color: 'var(--text2)' }}>Od {new Date(p.start_date).toLocaleString('sl-SI')}</div>}
            {p.end_date && <div style={{ fontSize: 12, color: 'var(--text2)' }}>Do {new Date(p.end_date).toLocaleString('sl-SI')}</div>}
            {p.description && <div style={{ fontSize: 12, color: 'var(--text2)' }}>{p.description}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button onClick={() => toggle(p)} className="btn btn-sm btn-ghost">{p.is_active ? 'Deaktiviraj' : 'Aktiviraj'}</button>
              <button onClick={() => edit(p)} className="btn btn-sm btn-blue">Uredi</button>
              <button onClick={() => del(p.id)} className="btn btn-sm btn-danger">Izbriši</button>
            </div>
          </div>
        ))}
        {promos.length === 0 && <p style={{ color: 'var(--text2)', padding: 20 }}>Ni promocij.</p>}
      </div>

      {showForm && (
        <div className="overlay" onClick={() => setShowForm(false)}>
          <div className="modal modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3>{editId ? 'Uredi' : 'Nova'} promocija</h3>

            <div className="field"><label>Ime</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="field">
              <label>Tip</label>
              <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {(form.type === 'percentage' || form.type === 'category_percentage' || form.type === 'happy_hour') && (
              <div className="field"><label>Odstotek (%)</label><input className="input" type="number" step="0.1" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} /></div>
            )}
            {form.type === 'fixed' && (
              <div className="field"><label>Znesek (€)</label><input className="input" type="number" step="0.01" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} /></div>
            )}
            <div className="field"><label>Min. naročilo (€)</label><input className="input" type="number" step="0.01" value={form.min_order} onChange={e => setForm({ ...form, min_order: e.target.value })} /></div>

            {form.type === 'bogo' && (
              <>
                <div className="field"><label>Kupi (količina)</label><input className="input" type="number" value={form.buy_qty} onChange={e => setForm({ ...form, buy_qty: e.target.value })} /></div>
                <div className="field"><label>Dobi (količina gratis)</label><input className="input" type="number" value={form.free_qty} onChange={e => setForm({ ...form, free_qty: e.target.value })} /></div>
                <div className="field"><label>Popust na gratis artikel (%)</label><input className="input" type="number" step="1" value={form.free_discount_pct} onChange={e => setForm({ ...form, free_discount_pct: e.target.value })} /></div>
              </>
            )}

            {(form.type === 'category_percentage' || form.type === 'happy_hour') && (
              <div className="field">
                <label>Kategorija</label>
                <select className="input" value={form.category_id || ''} onChange={e => setForm({ ...form, category_id: e.target.value ? parseInt(e.target.value) : null })}>
                  <option value="">Vse kategorije</option>
                  {cats.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

            {form.type === 'happy_hour' && (
              <>
                <div className="field"><label>Začetek (HH:MM)</label><input className="input" type="time" value={form.time_start} onChange={e => setForm({ ...form, time_start: e.target.value })} /></div>
                <div className="field"><label>Konec (HH:MM)</label><input className="input" type="time" value={form.time_end} onChange={e => setForm({ ...form, time_end: e.target.value })} /></div>
                <div className="field">
                  <label>Dnevi v tednu</label>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {WEEKDAYS.map((d, i) => {
                      const active = form.days_of_week?.split(',').includes(String(i))
                      return <button key={i} type="button" onClick={() => toggleDay(String(i))}
                        className={`btn btn-sm ${active ? 'btn-primary' : 'btn-ghost'}`}>{d}</button>
                    })}
                  </div>
                </div>
              </>
            )}

            <div className="field"><label>Začetek</label><input className="input" type="datetime-local" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
            <div className="field"><label>Konec</label><input className="input" type="datetime-local" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
            <div className="field"><label>Opis</label><textarea className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></div>

            <div className="modal-btns"><button onClick={save} className="btn btn-primary">Shrani</button><button onClick={() => setShowForm(false)} className="btn btn-ghost">Prekliči</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
