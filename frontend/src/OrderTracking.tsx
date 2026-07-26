import { useState, useEffect, useRef } from 'react'

const API = '/api/v1/public'

interface OrderItem {
  id: number; item_name: string; quantity: number; unit_price: number;
  total_price: number; status: string; notes: string; modifiers: any[]
}

interface OrderData {
  order_id: number; status: string; total: number; order_type: string;
  created_at: string; customer_name: string; items: OrderItem[];
  table_name?: string; estimated_ready?: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: string; progress: number }> = {
  'open': { label: 'V pripravi', color: '#f59e0b', icon: '👨‍🍳', progress: 30 },
  'preparing': { label: 'Se pripravlja', color: '#f59e0b', icon: '🔥', progress: 50 },
  'ready': { label: 'Pripravljeno', color: '#22c55e', icon: '✅', progress: 80 },
  'served': { label: 'Postreženo', color: '#22c55e', icon: '🍽️', progress: 100 },
  'closed': { label: 'Zaključeno', color: '#22c55e', icon: '✅', progress: 100 },
  'paid': { label: 'Plačano', color: '#22c55e', icon: '💰', progress: 100 },
  'cancelled': { label: 'Preklicano', color: '#ef4444', icon: '❌', progress: 0 },
  'held': { label: 'Zadržano', color: '#94a3b8', icon: '⏸️', progress: 20 },
  'scheduled': { label: 'Načrtovano', color: '#3b82f6', icon: '📅', progress: 10 },
}

const ITEM_STATUS: Record<string, { label: string; color: string; icon: string }> = {
  'ordered': { label: 'Naročeno', color: '#94a3b8', icon: '📋' },
  'preparing': { label: 'Se pripravlja', color: '#f59e0b', icon: '🔥' },
  'ready': { label: 'Pripravljeno', color: '#22c55e', icon: '✅' },
  'served': { label: 'Postreženo', color: '#22c55e', icon: '🍽️' },
  'cancelled': { label: 'Preklicano', color: '#ef4444', icon: '❌' },
}

export default function OrderTracking() {
  const [orderId, setOrderId] = useState('')
  const [phone, setPhone] = useState('')
  const [data, setData] = useState<OrderData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const pollRef = useRef<any>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const oid = params.get('order') || ''
    const p = params.get('phone') || ''
    if (oid) {
      setOrderId(oid)
      setPhone(p)
      searchOrder(oid, p)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  useEffect(() => {
    if (data && autoRefresh && data.status !== 'closed' && data.status !== 'paid' && data.status !== 'cancelled') {
      pollRef.current = setInterval(() => {
        fetchOrder(data.order_id.toString())
      }, 5000)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [data?.status, autoRefresh])

  const searchOrder = async (oid?: string, ph?: string) => {
    const id = oid || orderId
    if (!id) return
    setLoading(true); setError(''); setSearched(true)
    await fetchOrder(id, ph || phone)
    setLoading(false)
  }

  const fetchOrder = async (id?: string, ph?: string) => {
    try {
      const url = `${API}/order-status/${id || orderId}${(ph || phone) ? '?phone=' + encodeURIComponent(ph || phone) : ''}`
      const r = await fetch(url)
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.detail || 'Naročilo ni najdeno') }
      setData(await r.json())
    } catch (e: any) { setError(e.message); setData(null) }
  }

  const getShareUrl = () => {
    const base = window.location.origin
    return `${base}/order-tracking?order=${data?.order_id || orderId}`
  }

  const copyShareUrl = () => {
    navigator.clipboard.writeText(getShareUrl())
  }

  const statusInfo = (s: string) => STATUS_MAP[s] || { label: s, color: '#64748b', icon: '❓', progress: 50 }
  const itemStatus = (s: string) => ITEM_STATUS[s] || ITEM_STATUS['ordered']

  const completedItems = data?.items.filter(i => i.status === 'ready' || i.status === 'served').length || 0
  const totalItems = data?.items.length || 0
  const progressPct = totalItems > 0 ? (completedItems / totalItems) * 100 : 0

  const elapsed = data?.created_at ? Math.floor((Date.now() - new Date(data.created_at).getTime()) / 60000) : 0

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: 20, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', padding: '40px 0 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🍽️</div>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: 0 }}>Spremljanje naročila</h1>
        </div>

        {!data && (
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
        )}

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: 16, textAlign: 'center', color: '#fca5a5', fontSize: 14 }}>
            {error}
          </div>
        )}

        {data && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 24, marginBottom: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>{statusInfo(data.status).icon}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Naročilo #{data.order_id}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: statusInfo(data.status).color, marginBottom: 8 }}>
                {statusInfo(data.status).label}
              </div>

              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 99, height: 8, marginTop: 12, marginBottom: 8 }}>
                <div style={{
                  background: statusInfo(data.status).color,
                  borderRadius: 99, height: '100%', transition: 'width 0.5s ease',
                  width: `${Math.max(progressPct, statusInfo(data.status).progress)}%`
                }} />
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>
                {completedItems}/{totalItems} artiklov pripravljenih
                {elapsed > 0 && ` • ${elapsed} min od naročila`}
              </div>

              {data.customer_name && <div style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>{data.customer_name}</div>}
              {data.table_name && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>📍 {data.table_name}</div>}
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                {data.order_type === 'delivery' ? '🛵 Dostava' : data.order_type === 'takeaway' ? '🥡 Za sabo' : '🍽️ V restavraciji'}
                {data.created_at && ` • ${new Date(data.created_at).toLocaleString('sl-SI', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Artikli</div>
              {data.items.map(item => {
                const ist = itemStatus(item.status)
                return (
                  <div key={item.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
                    opacity: item.status === 'cancelled' ? 0.4 : 1
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16 }}>{ist.icon}</span>
                        <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{item.item_name}</span>
                      </div>
                      {item.notes && <div style={{ color: '#f59e0b', fontSize: 11, marginTop: 2, marginLeft: 24 }}>📝 {item.notes}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{item.total_price.toFixed(2)}€</div>
                      <div style={{ color: ist.color, fontSize: 11 }}>{ist.label}</div>
                    </div>
                  </div>
                )
              })}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 0', marginTop: 4, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ color: '#94a3b8', fontSize: 16, fontWeight: 600 }}>Skupaj</span>
                <span style={{ color: '#22c55e', fontSize: 22, fontWeight: 700 }}>{data.total.toFixed(2)}€</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button onClick={() => setAutoRefresh(a => !a)} style={{
                flex: 1, padding: '10px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 600,
                background: autoRefresh ? 'rgba(5,150,105,0.2)' : 'rgba(255,255,255,0.08)',
                color: autoRefresh ? '#22c55e' : '#94a3b8', cursor: 'pointer'
              }}>
                {autoRefresh ? '🔄 Samodejno osvežuje' : '⏸️ Osveževanje ustavljeno'}
              </button>
              <button onClick={() => setShowQR(q => !q)} style={{
                flex: 1, padding: '10px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 600,
                background: 'rgba(255,255,255,0.08)', color: '#94a3b8', cursor: 'pointer'
              }}>
                📱 QR koda
              </button>
              <button onClick={copyShareUrl} style={{
                flex: 1, padding: '10px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 600,
                background: 'rgba(255,255,255,0.08)', color: '#94a3b8', cursor: 'pointer'
              }}>
                📋 Kopiraj povezavo
              </button>
            </div>

            {showQR && (
              <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 20, textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>Skeniraj za sledenje</div>
                <div style={{ background: '#fff', display: 'inline-block', padding: 12, borderRadius: 12 }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(getShareUrl())}`}
                    alt="QR koda za sledenje"
                    width={180} height={180}
                    style={{ display: 'block' }}
                  />
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 8, wordBreak: 'break-all' }}>{getShareUrl()}</div>
              </div>
            )}

            {data.status !== 'closed' && data.status !== 'paid' && data.status !== 'cancelled' && (
              <div style={{ textAlign: 'center', padding: '8px 0', color: '#64748b', fontSize: 12 }}>
                🔄 Samodejna osvežitev vsakih 5 sekund
              </div>
            )}
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
