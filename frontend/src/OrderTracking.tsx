import { useState, useEffect } from 'react'

const API = '/api/v1/public'

interface OrderItem {
  id: number; item_name: string; quantity: number; unit_price: number;
  total_price: number; status: string; notes: string; modifiers: any[]
}

interface OrderData {
  order_id: number; status: string; total: number; order_type: string;
  created_at: string; customer_name: string; items: OrderItem[]
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: string }> = {
  'open': { label: 'V pripravi', color: '#f59e0b', icon: '👨‍🍳' },
  'closed': { label: 'Zaključeno', color: '#22c55e', icon: '✅' },
  'cancelled': { label: 'Preklicano', color: '#ef4444', icon: '❌' },
  'held': { label: 'Zadržano', color: '#94a3b8', icon: '⏸️' },
  'scheduled': { label: 'Načrtovano', color: '#3b82f6', icon: '📅' },
}

export default function OrderTracking() {
  const [orderId, setOrderId] = useState('')
  const [phone, setPhone] = useState('')
  const [data, setData] = useState<OrderData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const oid = params.get('order') || ''
    const p = params.get('phone') || ''
    if (oid) {
      setOrderId(oid)
      setPhone(p)
      searchOrder(oid, p)
    }
  }, [])

  const searchOrder = async (oid?: string, ph?: string) => {
    const id = oid || orderId
    if (!id) return
    setLoading(true)
    setError('')
    setSearched(true)
    try {
      const url = `${API}/order-status/${id}${(ph || phone) ? '?phone=' + encodeURIComponent(ph || phone) : ''}`
      const r = await fetch(url)
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.detail || 'Naročilo ni najdeno') }
      setData(await r.json())
    } catch (e: any) { setError(e.message); setData(null) }
    setLoading(false)
  }

  const statusInfo = (s: string) => STATUS_MAP[s] || { label: s, color: '#64748b', icon: '❓' }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: 20, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', padding: '40px 0 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🍽️</div>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: 0 }}>Spremljanje naročila</h1>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input placeholder="Številka naročila" value={orderId} onChange={e => setOrderId(e.target.value)}
              style={{ padding: '12px 14px', borderRadius: 10, border: 'none', fontSize: 16, background: 'rgba(255,255,255,0.1)', color: '#fff', outline: 'none', textAlign: 'center', letterSpacing: 2 }}
              onKeyDown={e => e.key === 'Enter' && searchOrder()} />
            <input placeholder="Telefon (neobvezno)" value={phone} onChange={e => setPhone(e.target.value)}
              style={{ padding: '12px 14px', borderRadius: 10, border: 'none', fontSize: 14, background: 'rgba(255,255,255,0.1)', color: '#fff', outline: 'none', textAlign: 'center' }}
              onKeyDown={e => e.key === 'Enter' && searchOrder()} />
            <button onClick={() => searchOrder()} disabled={loading || !orderId}
              style={{ padding: '12px', borderRadius: 10, border: 'none', fontSize: 15, fontWeight: 600, cursor: loading || !orderId ? 'not-allowed' : 'pointer', background: loading ? '#64748b' : '#059669', color: '#fff' }}>
              {loading ? 'Iščem...' : '🔍 Poišči naročilo'}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: 16, textAlign: 'center', color: '#fca5a5', fontSize: 14 }}>
            {error}
          </div>
        )}

        {data && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 20, marginBottom: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>{statusInfo(data.status).icon}</div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>Naročilo #{data.order_id}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: statusInfo(data.status).color }}>
                {statusInfo(data.status).label}
              </div>
              {data.customer_name && <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{data.customer_name}</div>}
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                {data.order_type === 'delivery' ? '🛵 Dostava' : '🥡 Za sabo'}
                {data.created_at && ` • ${new Date(data.created_at).toLocaleString('sl-SI', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Artikel</div>
              {data.items.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>{item.item_name}</div>
                    {item.notes && <div style={{ color: '#f59e0b', fontSize: 12, marginTop: 2 }}>📝 {item.notes}</div>}
                    {item.modifiers?.length > 0 && <div style={{ color: '#a78bfa', fontSize: 12, marginTop: 1 }}>+ {item.modifiers.map((m: any) => m.option_name).join(', ')}</div>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                    <div style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{item.total_price.toFixed(2)} €</div>
                    <div style={{ color: '#64748b', fontSize: 12 }}>{item.quantity}x {item.unit_price.toFixed(2)} €</div>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 0', marginTop: 4, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ color: '#94a3b8', fontSize: 16, fontWeight: 600 }}>Skupaj</span>
                <span style={{ color: '#22c55e', fontSize: 22, fontWeight: 700 }}>{data.total.toFixed(2)} €</span>
              </div>
            </div>
          </div>
        )}

        {searched && !data && !loading && !error && (
          <div style={{ textAlign: 'center', color: '#64748b', padding: 20, fontSize: 14 }}>
            Vnesite številko naročila za iskanje.
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <a href="/online-order" style={{ color: '#64748b', fontSize: 13, textDecoration: 'underline' }}>← Novo naročilo</a>
        </div>
      </div>
    </div>
  )
}
