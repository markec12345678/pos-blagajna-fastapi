import { useState, useEffect } from 'react'

interface Batch { id: number; name: string; orders: number; items: number; avg_prep_time: number; status: string; started: string; finished: string | null }
interface PriorityOrder { id: number; table: string | null; priority: string; items: number; time_waiting: number; type: string; vip: boolean; special_notes: string | null }
interface CourseTable { table: string; courses: Array<{ course: number; items: string[]; status: string; served_at?: string; started_at?: string; estimated?: string }>; guests: number; started: string }
interface Station { name: string; orders_in_queue: number; avg_time: number; utilization: number; current_item: string }
interface SpecialRequest { id: number; order_id: number; type: string; detail: string; severity: string; table: string; handled: boolean; handled_by: string | null }
interface TableRotation { table: string; seatings: number; avg_duration: number; revenue: number; turnover_rate: number }

export default function OrdersV4Page({ onNotify }: { onNotify?: (msg: string, err?: boolean) => void }) {
  const [tab, setTab] = useState<string>('batch')
  const [batches, setBatches] = useState<Batch[]>([])
  const [priorities, setPriorities] = useState<PriorityOrder[]>([])
  const [courses, setCourses] = useState<CourseTable[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [requests, setRequests] = useState<SpecialRequest[]>([])
  const [rotations, setRotations] = useState<TableRotation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [bRes, pRes, cRes, sRes, rRes, tRes] = await Promise.all([
        fetch('/api/v1/orders-v4/batch-processing').then(r => r.json()),
        fetch('/api/v1/orders-v4/order-prioritization').then(r => r.json()),
        fetch('/api/v1/orders-v4/course-management').then(r => r.json()),
        fetch('/api/v1/orders-v4/kitchen-flow').then(r => r.json()),
        fetch('/api/v1/orders-v4/special-requests').then(r => r.json()),
        fetch('/api/v1/orders-v4/table-rotation').then(r => r.json()),
      ])
      setBatches(bRes.batches || [])
      setPriorities(pRes.orders || [])
      setCourses(cRes.courses || [])
      setStations(sRes.flow?.stations || [])
      setRequests(rRes.requests || [])
      setRotations(tRes.rotation || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const priorityColor = (p: string) => p === 'critical' ? '#ef4444' : p === 'high' ? '#f59e0b' : p === 'medium' ? '#3b82f6' : '#10b981'

  if (loading) return <div className="loading">Nalagam...</div>

  return (
    <div style={{ padding: '2rem' }}>
      <h1>📦 Naročila V4</h1>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {[
          { key: 'batch', label: '🔄 Serijska obdelava' },
          { key: 'priority', label: '🚨 Prioritete' },
          { key: 'courses', label: '🍽️ Hodi' },
          { key: 'flow', label: '👨‍🍳 Tok kuhinje' },
          { key: 'requests', label: '⭐ Posebne zahteve' },
          { key: 'rotation', label: '🔄 Rotacija miz' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: tab === t.key ? '2px solid #2563eb' : '1px solid #d1d5db', background: tab === t.key ? '#dbeafe' : 'white', cursor: 'pointer', fontSize: '0.85rem' }}>{t.label}</button>
        ))}
      </div>

      {tab === 'batch' && (
        <div>
          <h2>Serijska obdelava</h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {batches.map(b => (
              <div key={b.id} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <strong>{b.name}</strong>
                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.8rem', background: b.status === 'completed' ? '#d1fae5' : '#fef3c7', color: b.status === 'completed' ? '#065f46' : '#92400e' }}>{b.status === 'completed' ? 'Končano' : 'V teku'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <div>Naročila: {b.orders}</div>
                  <div>Artikli: {b.items}</div>
                  <div>Povprečje: {b.avg_prep_time} min</div>
                  <div>{b.started} — {b.finished || '...'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'priority' && (
        <div>
          <h2>Prioritetna vrsta</h2>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {priorities.sort((a, b) => b.time_waiting - a.time_waiting).map(o => (
              <div key={o.id} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `4px solid ${priorityColor(o.priority)}` }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <strong>#{o.id}</strong>
                    {o.vip && <span style={{ fontSize: '0.7rem', background: '#fef3c7', padding: '0.15rem 0.5rem', borderRadius: '8px' }}>VIP</span>}
                    {o.table && <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>{o.table}</span>}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{o.items} artiklov · {o.type} · Čakanje: {o.time_waiting} min</div>
                  {o.special_notes && <div style={{ fontSize: '0.8rem', color: '#f59e0b', marginTop: '0.25rem' }}>⚠️ {o.special_notes}</div>}
                </div>
                <span style={{ padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.8rem', background: priorityColor(o.priority) + '20', color: priorityColor(o.priority), fontWeight: 600 }}>{o.priority}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'courses' && (
        <div>
          <h2>Upravljanje hodov</h2>
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {courses.map(c => (
              <div key={c.table} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <strong>Miza {c.table} ({c.guests} oseb)</strong>
                  <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>Začetek: {c.started}</span>
                </div>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {c.courses.map(co => (
                    <div key={co.course} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', borderRadius: '8px', background: co.status === 'served' ? '#d1fae5' : co.status === 'preparing' ? '#fef3c7' : '#f3f4f6', alignItems: 'center' }}>
                      <div>
                        <strong>Hod {co.course}</strong>
                        <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{co.items.join(', ')}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: '8px', fontSize: '0.75rem', background: co.status === 'served' ? '#059669' : co.status === 'preparing' ? '#d97706' : '#6b7280', color: 'white' }}>{co.status === 'served' ? 'Postreženo' : co.status === 'preparing' ? 'Priprava' : 'Čaka'}</span>
                        {co.served_at && <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>{co.served_at}</div>}
                        {co.estimated && <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>Est: {co.estimated}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'flow' && (
        <div>
          <h2>Tok kuhinje</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            {stations.map(s => (
              <div key={s.name} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <strong>{s.name}</strong>
                  <span style={{ fontWeight: 600, color: s.utilization > 80 ? '#ef4444' : s.utilization > 50 ? '#f59e0b' : '#10b981' }}>{s.utilization}%</span>
                </div>
                <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Trenutno: {s.current_item}</div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>V vrsti: {s.orders_in_queue} · Povprečje: {s.avg_time} min</div>
                <div style={{ height: '8px', borderRadius: '4px', background: '#e5e7eb', marginTop: '0.5rem', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${s.utilization}%`, background: s.utilization > 80 ? '#ef4444' : s.utilization > 50 ? '#f59e0b' : '#10b981', borderRadius: '4px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'requests' && (
        <div>
          <h2>Posebne zahteve</h2>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {requests.map(r => (
              <div key={r.id} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `4px solid ${r.severity === 'high' ? '#ef4444' : r.severity === 'medium' ? '#f59e0b' : '#3b82f6'}` }}>
                <div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <strong>#{r.order_id} {r.table}</strong>
                    <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '8px', background: r.type === 'alergija' ? '#fef2f2' : r.type === 'diet' ? '#f0fdf4' : '#eff6ff', color: r.type === 'alergija' ? '#991b1b' : r.type === 'diet' ? '#166534' : '#1e40af' }}>{r.type}</span>
                  </div>
                  <div style={{ fontSize: '0.9rem' }}>{r.detail}</div>
                  {r.handled_by && <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>Obravnaval: {r.handled_by}</div>}
                </div>
                <span style={{ padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.8rem', background: r.handled ? '#d1fae5' : '#fef3c7', color: r.handled ? '#065f46' : '#92400e' }}>{r.handled ? 'Obravnavano' : 'Čaka'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'rotation' && (
        <div>
          <h2>Rotacija miz</h2>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {rotations.map(r => (
              <div key={r.table} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'grid', gridTemplateColumns: '80px 1fr 80px', alignItems: 'center', gap: '1rem' }}>
                <strong>{r.table}</strong>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <div>Sedeži: {r.seatings}</div>
                  <div>Čas: {r.avg_duration} min</div>
                  <div>Turnover: {r.turnover_rate}x</div>
                </div>
                <div style={{ fontWeight: 700, color: '#10b981' }}>€{r.revenue}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
