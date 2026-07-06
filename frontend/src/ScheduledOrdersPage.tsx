import { useState, useEffect } from 'react'
import * as api from './api'

export default function ScheduledOrdersPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [orders, setOrders] = useState<any[]>([])
  const [menu, setMenu] = useState<any[]>([])
  const [tables, setTables] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [selTable, setSelTable] = useState<number | null>(null)
  const [selItem, setSelItem] = useState<number | null>(null)
  const [scheduledAt, setScheduledAt] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/v1/orders/scheduled', { headers: api.h() })
      setOrders(await r.json())
    } catch {}
    try {
      const m = await api.getMenu()
      setMenu(m)
    } catch {}
    try {
      const t = await api.getTables()
      setTables(t)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const createScheduled = async () => {
    if (!selTable || !scheduledAt) return
    const items = menu.flatMap(c => c.items).filter((i: any) => i.id === selItem)
    if (!items.length) return
    const item = items[0]
    await fetch('/api/v1/orders', {
      method: 'POST',
      headers: { ...api.h(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ table_id: selTable, order_type: 'takeaway', scheduled_at: scheduledAt, items: [{ menu_item_id: item.id, quantity: 1 }] })
    })
    setShowForm(false)
    onNotify('Naročilo načrtovano')
    load()
  }

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">📅 Načrtovana naročila</h2>
        <button onClick={() => setShowForm(true)} className="btn btn-primary btn-sm" disabled={loading}>+ Novo</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>⏳ Nalaganje...</div>
      ) : orders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>📅</div>
          <p>Ni načrtovanih naročil</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {orders.map(o => (
            <div key={o.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                <span>#{o.id} — {o.table_name || 'Miza ' + o.table_id}</span>
                <span style={{ color: 'var(--blue)' }}>{o.scheduled_at && new Date(o.scheduled_at).toLocaleString('sl-SI')}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>
                {o.items?.length || 0} artiklov • {o.total?.toFixed(2)} €
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 12 }}>Novo načrtovano naročilo</h3>
            <select className="input" onChange={e => setSelTable(parseInt(e.target.value))} style={{ marginBottom: 8 }}>
              <option value="">Izberi mizo...</option>
              {tables.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <select className="input" onChange={e => setSelItem(parseInt(e.target.value))} style={{ marginBottom: 8 }}>
              <option value="">Izberi artikel...</option>
              {menu.flatMap((c: any) => c.items).map((i: any) => (
                <option key={i.id} value={i.id}>{i.name} — {i.price.toFixed(2)} €</option>
              ))}
            </select>
            <input className="input" type="datetime-local" value={scheduledAt} 
              onChange={e => setScheduledAt(e.target.value)} style={{ marginBottom: 8 }} />
            <div className="modal-btns">
              <button onClick={() => setShowForm(false)} className="btn btn-ghost">Prekliči</button>
              <button onClick={createScheduled} className="btn btn-primary" disabled={!selTable || !selItem || !scheduledAt}>Shrani</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}