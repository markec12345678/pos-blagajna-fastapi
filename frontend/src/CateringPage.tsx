import { useState, useEffect } from 'react'

interface CateringOrder {
  id: number; customer_name: string; customer_phone: string; customer_email: string;
  event_type: string; event_date: string; event_time: string; guests: number;
  location: string; menu_details: string; total: number; deposit: number;
  deposit_paid: number; status: string; notes: string; branch_id: number | null;
}

const STATUSES = ['inquiry', 'confirmed', 'deposit_paid', 'preparing', 'completed', 'cancelled']
const STATUS_COLORS: Record<string, string> = {
  inquiry: '#6b7280', confirmed: '#3b82f6', deposit_paid: '#f59e0b',
  preparing: '#8b5cf6', completed: '#059669', cancelled: '#ef4444',
}
const STATUS_LABELS: Record<string, string> = {
  inquiry: 'Povpraševanje', confirmed: 'Potrjeno', deposit_paid: 'Depozit plačan',
  preparing: 'V pripravi', completed: 'Zaključeno', cancelled: 'Preklicano',
}
const EVENT_TYPES = ['Rojstni dan', 'Poroka', 'Podjetniški dogodek', 'Maturalna', 'Družinsko srečanje', 'Drugo']

const API = '/api/v1/catering'
const auth = () => ({ 'Authorization': 'Bearer ' + localStorage.getItem('pos_token'), 'Content-Type': 'application/json' })

function empty(): CateringOrder {
  return { id: 0, customer_name: '', customer_phone: '', customer_email: '', event_type: 'Rojstni dan',
    event_date: new Date().toISOString().slice(0, 10), event_time: '18:00', guests: 20,
    location: '', menu_details: '', total: 0, deposit: 0, deposit_paid: 0, status: 'inquiry', notes: '', branch_id: null }
}

export default function CateringPage({ onNotify }: { onNotify: (m: string, isError?: boolean) => void }) {
  const [orders, setOrders] = useState<CateringOrder[]>([])
  const [filterStatus, setFilterStatus] = useState('')
  const [edit, setEdit] = useState<CateringOrder | null>(null)
  const [stats, setStats] = useState<any>(null)

  const load = () => {
    fetch(`${API}?status=${filterStatus}`, { headers: auth() })
      .then(r => r.json()).then(setOrders).catch(() => {})
    fetch(`${API}/stats`, { headers: auth() }).then(r => r.json()).then(setStats).catch(() => {})
  }
  useEffect(load, [filterStatus])

  const save = async () => {
    if (!edit) return
    const body = { ...edit, event_date: edit.event_date.slice(0, 10) + 'T' + (edit.event_time || '18:00') + ':00' }
    try {
      const r = await fetch(edit.id ? `${API}/${edit.id}` : API, {
        method: edit.id ? 'PUT' : 'POST', headers: auth(), body: JSON.stringify(body)
      })
      if (!r.ok) throw new Error()
      onNotify(edit.id ? 'Posodobljeno' : 'Ustvarjeno')
      setEdit(null); load()
    } catch { onNotify('Napaka pri shranjevanju', true) }
  }

  const remove = async (id: number) => {
    if (!confirm('Izbrišete catering naročilo?')) return
    await fetch(`${API}/${id}`, { method: 'DELETE', headers: auth() })
    onNotify('Izbrisano'); load()
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>🎉 Catering</h2>
        <button onClick={() => setEdit(empty())} className="btn btn-primary">+ Novo naročilo</button>
      </div>

      {stats && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {[
            { label: 'Skupaj', value: stats.total, color: '#3b82f6' },
            { label: 'Prihajajoči', value: stats.upcoming, color: '#059669' },
            { label: 'Depoziti', value: `${stats.total_deposits.toFixed(0)} €`, color: '#f59e0b' },
            { label: 'Vrednost', value: `${stats.total_value.toFixed(0)} €`, color: '#8b5cf6' },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ borderLeft: `3px solid ${s.color}` }}>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
        <button onClick={() => setFilterStatus('')} className={`btn btn-sm ${!filterStatus ? 'btn-primary' : 'btn-ghost'}`}>Vsi</button>
        {STATUSES.map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} className={`btn btn-sm ${filterStatus === s ? 'btn-primary' : 'btn-ghost'}`}>
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {orders.map(o => (
          <div key={o.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[o.status] || '#6b7280', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 700 }}>{o.customer_name}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                {o.event_type} • {o.guests} oseb • {o.event_date?.slice(0, 10)} ob {o.event_time}
              </div>
              {o.menu_details && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2, whiteSpace: 'pre-wrap' }}>📋 {o.menu_details}</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700 }}>{o.total.toFixed(2)} €</div>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                <span style={{ color: o.deposit_paid ? 'var(--green)' : 'var(--red)' }}>Depozit: {o.deposit.toFixed(2)} € {o.deposit_paid ? '✅' : '❌'}</span>
              </div>
              <div style={{ fontSize: 11, color: STATUS_COLORS[o.status], fontWeight: 600 }}>{STATUS_LABELS[o.status]}</div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setEdit({ ...o })} className="btn btn-sm btn-ghost">✏️</button>
              <button onClick={() => remove(o.id)} className="btn btn-sm btn-ghost" style={{ color: 'var(--red)' }}>🗑️</button>
            </div>
          </div>
        ))}
        {!orders.length && <p style={{ color: 'var(--text2)', padding: 20, textAlign: 'center' }}>Ni catering naročil.</p>}
      </div>

      {edit && (
        <div className="overlay" onClick={() => setEdit(null)}>
          <div className="modal modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <h3>{edit.id ? 'Uredi' : 'Novo'} catering naročilo</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              <input className="input" placeholder="Ime stranke" value={edit.customer_name} onChange={e => setEdit({ ...edit, customer_name: e.target.value })} />
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" placeholder="Telefon" value={edit.customer_phone} onChange={e => setEdit({ ...edit, customer_phone: e.target.value })} style={{ flex: 1 }} />
                <input className="input" placeholder="Email" value={edit.customer_email} onChange={e => setEdit({ ...edit, customer_email: e.target.value })} style={{ flex: 1 }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <select className="input" value={edit.event_type} onChange={e => setEdit({ ...edit, event_type: e.target.value })} style={{ flex: 1 }}>
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input className="input" type="date" value={edit.event_date} onChange={e => setEdit({ ...edit, event_date: e.target.value })} style={{ flex: 1 }} />
                <input className="input" type="time" value={edit.event_time} onChange={e => setEdit({ ...edit, event_time: e.target.value })} style={{ flex: 1 }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" type="number" placeholder="Št. oseb" value={edit.guests} onChange={e => setEdit({ ...edit, guests: parseInt(e.target.value) || 0 })} style={{ flex: 1 }} />
                <input className="input" placeholder="Lokacija" value={edit.location} onChange={e => setEdit({ ...edit, location: e.target.value })} style={{ flex: 2 }} />
              </div>
              <textarea className="input" placeholder="Jedilnik / meni" value={edit.menu_details} onChange={e => setEdit({ ...edit, menu_details: e.target.value })} style={{ minHeight: 60, resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" type="number" step="0.01" placeholder="Skupaj €" value={edit.total} onChange={e => setEdit({ ...edit, total: parseFloat(e.target.value) || 0 })} style={{ flex: 1 }} />
                <input className="input" type="number" step="0.01" placeholder="Depozit €" value={edit.deposit} onChange={e => setEdit({ ...edit, deposit: parseFloat(e.target.value) || 0 })} style={{ flex: 1 }} />
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                  <input type="checkbox" checked={!!edit.deposit_paid} onChange={e => setEdit({ ...edit, deposit_paid: e.target.checked ? 1 : 0 })} />
                  Depozit plačan
                </label>
              </div>
              <select className="input" value={edit.status} onChange={e => setEdit({ ...edit, status: e.target.value })}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
              <textarea className="input" placeholder="Opombe" value={edit.notes} onChange={e => setEdit({ ...edit, notes: e.target.value })} style={{ minHeight: 50, resize: 'vertical' }} />
            </div>
            <div className="modal-btns" style={{ marginTop: 16 }}>
              <button onClick={save} className="btn btn-primary">💾 Shrani</button>
              <button onClick={() => setEdit(null)} className="btn btn-ghost">Prekliči</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
