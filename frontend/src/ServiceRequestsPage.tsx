import { useState, useEffect, useRef } from 'react'

export default function ServiceRequestsPage({ onNotify }: { onNotify?: (msg: string, err?: boolean) => void }) {
  const [requests, setRequests] = useState<any[]>([])
  const [filter, setFilter] = useState('pending')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const prevCount = useRef(0)

  const load = async () => {
    const url = filter ? `/api/v1/service-requests?status=${filter}` : '/api/v1/service-requests'
    const r = await fetch(url)
    if (r.ok) {
      const data = await r.json()
      if (data.length > prevCount.current && prevCount.current > 0) {
        try { audioRef.current?.play() } catch {}
      }
      prevCount.current = data.length
      setRequests(data)
    }
  }

  useEffect(() => {
    load()
    const iv = setInterval(load, 5000)
    return () => clearInterval(iv)
  }, [filter])

  const ack = async (id: number) => {
    const r = await fetch(`/api/v1/service-requests/${id}/ack`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: parseInt(localStorage.getItem('pos_user_id') || '0') })
    })
    if (r.ok) { onNotify?.('Sprejeto'); load() }
  }

  const complete = async (id: number) => {
    const r = await fetch(`/api/v1/service-requests/${id}/complete`, { method: 'POST' })
    if (r.ok) { onNotify?.('Zaključeno'); load() }
  }

  const icons: Record<string, string> = {
    waiter: '🔔', bill: '🧾', help: '🆘', order: '🍽️', other: '💬'
  }
  const typeLabels: Record<string, string> = {
    waiter: 'Natakar', bill: 'Račun', help: 'Pomoč', order: 'Naročilo', other: 'Drugo'
  }
  const statusColors: Record<string, string> = {
    pending: '#ef4444', acknowledged: '#f59e0b', completed: '#059669'
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length

  return (
    <div>
      <audio ref={audioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAf39/f4B/f3+AgH9/f3+Af39/gIB/f39/gH9/f4CAf39/f4B/f3+AgH9/f3+Af39/gIB/f39/gH9/f4CAf3+AgH9/f4B/f3+AgH9/f3+Af39/gIB/f3+Af39/gH9/f4B/f39/gH9/f4B/f39/gH9/f4B/f3+AgH9/f4B/f3+Af39/gIB/f3+Af39/gH9/f4CAf39/gH9/f4B/f3+AgH9/f4B/f3+Af39/gIB/f3+Af39/gH9/f4B/f3+AgH9/f4B/f3+Af39/gIB/f3+Af39/gH9/gIB/f39/gH9/gIB/f3+AgH9/f4B/f3+AgH9/gIB/f39/gH9/gIB/f3+Af39/gIB/f3+Af39/gH9/gIB/f39/gH9/gIB/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+AgH9/f4B/f3+Af39/gH9/gIB/f39/gH9/gIB/f39/gH9/gH9/f4B/f3+AgH9/f4B/f3+Af39/gH9/gIB/f39/gH9/gIB/f39/gH9/gIB/f39/gH9/gIB/f39/gH9/f4B/f39/gH9/f4B/f39/gH9/f4B/f39/gH9/f4B/f39/gH9/f4B/f39/gH9/f4B/f39/gH9/f4B/f39/gH9/f4B/f39/gH9/f38=" />

      <div className="page-header">
        <h2>🔔 Zahteve strank {pendingCount > 0 ? <span style={{ color: '#ef4444', fontSize: 14 }}>({pendingCount})</span> : null}</h2>
        <button className="btn" onClick={load}>🔄 Osveži</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['pending', 'acknowledged', 'completed', ''].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{
              padding: '6px 14px', borderRadius: 8, border: `1px solid ${filter === s ? '#059669' : '#e2e8f0'}`,
              background: filter === s ? '#f0fdf4' : '#fff',
              fontSize: 12, cursor: 'pointer', fontWeight: filter === s ? 600 : 400
            }}>
            {s ? { pending: 'Čakajoče', acknowledged: 'Sprejete', completed: 'Zaključene' }[s] : 'Vse'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {requests.length === 0 && (
          <div className="card" style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Ni zahtev 🎉</div>
        )}
        {requests.map(r => (
          <div key={r.id} className="card" style={{
            padding: 16,
            borderLeft: `4px solid ${statusColors[r.status] || '#94a3b8'}`,
            animation: r.status === 'pending' ? 'pulse-bg 2s infinite' : 'none'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>{icons[r.request_type] || '💬'}</span>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>Miza {r.table_name}</span>
                  <span style={{
                    padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                    background: (statusColors[r.status] || '#94a3b8') + '20',
                    color: statusColors[r.status] || '#64748b'
                  }}>{r.status}</span>
                </div>
                <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>
                  {typeLabels[r.request_type] || r.request_type}
                  {r.message ? ` • ${r.message}` : ''}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                  {new Date(r.created_at).toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' })}
                  {r.acknowledged_at ? ` • prevzeto: ${new Date(r.acknowledged_at).toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' })}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {r.status === 'pending' && (
                  <button onClick={() => ack(r.id)}
                    style={{ padding: '6px 14px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    ✅ Sprejmi
                  </button>
                )}
                {r.status !== 'completed' && (
                  <button onClick={() => complete(r.id)}
                    style={{ padding: '6px 14px', background: '#059669', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    ✅ Zaključi
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pulse-bg {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  )
}
