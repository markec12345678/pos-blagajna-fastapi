import { useState, useEffect, useRef, useContext } from 'react'
import { LangContext, useTranslation } from './i18n'

const ORDER_POLL_MS = 3000
const THANK_YOU_MS = 8000

type Stage = 'loading' | 'order' | 'payment' | 'thankyou'

export default function CustomerOrderDisplay() {
  const { t, lang } = useTranslation()
  const [stage, setStage] = useState<Stage>('loading')
  const [order, setOrder] = useState<any>(null)
  const [tableId, setTableId] = useState<number | null>(null)
  const [orderId, setOrderId] = useState<number | null>(null)
  const [phone, setPhone] = useState('')
  const [loyaltyMsg, setLoyaltyMsg] = useState('')
  const [loyaltyDone, setLoyaltyDone] = useState(false)
  const thankyouTimer = useRef<any>(null)

  const orderMatch = window.location.pathname.match(/^\/order\/(\d+)/)
  const displayMatch = window.location.pathname.match(/^\/display\/(\d+)/)
  const initialId = orderMatch ? parseInt(orderMatch[1]) : (displayMatch ? parseInt(displayMatch[1]) : null)

  const fetchOrder = async () => {
    try {
      let o: any
      if (orderId) {
        const r = await fetch(`/api/v1/orders/${orderId}`)
        if (!r.ok) throw new Error('Not found')
        o = await r.json()
      } else if (tableId) {
        try {
          const r = await fetch(`/api/v1/orders/by-table/${tableId}`)
          if (!r.ok) throw new Error('No open order')
          o = await r.json()
        } catch {
          setStage('loading')
          return
        }
      } else {
        return
      }
      setOrder(o)
      if (o.id && !orderId) setOrderId(o.id)

      if (o.status === 'closed' || o.status === 'paid') {
        setStage('thankyou')
        if (!thankyouTimer.current) {
          thankyouTimer.current = setTimeout(() => {
            setStage('loading')
            setOrder(null)
            setOrderId(null)
            setPhone('')
            setLoyaltyMsg('')
            setLoyaltyDone(false)
            thankyouTimer.current = null
          }, THANK_YOU_MS)
        }
      } else if (stage === 'loading') {
        setStage('order')
      }
    } catch {
      if (stage === 'loading') setStage('loading')
    }
  }

  useEffect(() => {
    if (!initialId && !orderId) { setStage('loading'); return }
    if (displayMatch && !orderId) setTableId(initialId)
    if (orderMatch) setOrderId(initialId)
  }, [])

  useEffect(() => {
    if (!initialId) return
    fetchOrder()
    const iv = setInterval(fetchOrder, ORDER_POLL_MS)
    return () => { clearInterval(iv); if (thankyouTimer.current) clearTimeout(thankyouTimer.current) }
  }, [orderId, tableId])

  const submitLoyalty = async () => {
    if (!phone || phone.length < 5) return
    try {
      const r = await fetch('/api/v1/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `Guest ${phone.slice(-4)}`, phone })
      })
      if (r.ok) {
        setLoyaltyMsg(t('display.loyalty_earned').replace('{points}', '10'))
        setLoyaltyDone(true)
      }
    } catch {
      setLoyaltyMsg(t('err.network'))
    }
  }

  if (!initialId) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 64 }}>🍽️</div>
        <p style={{ fontSize: 20, color: '#94a3b8' }}>{t('display.no_order')}</p>
      </div>
    )
  }

  if (stage === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 48, animation: 'pulse 1.5s infinite' }}>🍽️</div>
        <p style={{ fontSize: 24, color: '#94a3b8' }}>{t('display.please_wait')}</p>
        <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.3 } }`}</style>
      </div>
    )
  }

  if (stage === 'thankyou') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, animation: 'fadeIn 0.5s' }}>
        <style>{`@keyframes fadeIn { from { opacity: 0; transform: scale(0.8) } to { opacity: 1; transform: scale(1) } }`}</style>
        <div style={{ fontSize: 96, animation: 'bounceIn 0.6s' }}>✅</div>
        <style>{`@keyframes bounceIn { 0% { transform: scale(0) } 50% { transform: scale(1.3) } 100% { transform: scale(1) } }`}</style>
        <h1 style={{ fontSize: 48, margin: '8px 0', textAlign: 'center' }}>{t('display.thank_you')}</h1>
        {order && (
          <p style={{ fontSize: 24, opacity: 0.9 }}>
            {t('display.order')} #{order.id}
          </p>
        )}
        {loyaltyDone && loyaltyMsg && (
          <p style={{ fontSize: 18, marginTop: 12, background: '#ffffff20', padding: '8px 24px', borderRadius: 24 }}>{loyaltyMsg}</p>
        )}
      </div>
    )
  }

  if (!order) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <p style={{ fontSize: 24, color: '#94a3b8' }}>{t('display.no_order')}</p>
      </div>
    )
  }

  const itemCount = order.items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0
  const subtotal = order.items?.reduce((s: number, i: any) => s + (i.total_price || 0), 0) || 0
  const hasDiscount = order.discount_amount && order.discount_amount > 0

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#fff', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 700, margin: '0 auto', width: '100%', padding: '24px 16px' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 14, color: '#64748b', letterSpacing: 2, textTransform: 'uppercase' }}>
            {order.table_name && `${t('display.table')} ${order.table_name}`} {order.order_type === 'takeaway' ? '🥡' : order.order_type === 'delivery' ? '🛵' : ''}
          </div>
          <h1 style={{ fontSize: 32, margin: '8px 0', fontWeight: 300 }}>{t('display.order')} #{order.id}</h1>
          <div style={{ fontSize: 14, color: '#64748b' }}>{itemCount} {t('display.items')}</div>
        </div>

        <div style={{ flex: 1 }}>
          {order.items?.map((item: any, idx: number) => {
            const statusIcon = item.status === 'served' ? '✅' : item.status === 'ready' ? '🍳' : item.status === 'cancelled' ? '❌' : '⏳'
            return (
              <div key={idx} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 0', borderBottom: '1px solid #1e293b',
                opacity: item.status === 'cancelled' ? 0.4 : 1
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 20 }}>{statusIcon}</span>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>{item.item_name}</div>
                    <div style={{ fontSize: 14, color: '#94a3b8' }}>
                      {item.quantity} × €{item.unit_price?.toFixed(2)}
                      {item.notes && <span style={{ marginLeft: 8, fontStyle: 'italic' }}>📝 {item.notes}</span>}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#fbbf24' }}>€{item.total_price?.toFixed(2)}</div>
              </div>
            )
          })}
        </div>

        <div style={{ borderTop: '2px solid #334155', marginTop: 16, paddingTop: 16 }}>
          {hasDiscount && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, color: '#ef4444', marginBottom: 4 }}>
              <span>{t('display.discount')}</span>
              <span>-€{order.discount_amount?.toFixed(2)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, color: '#94a3b8' }}>
            <span>{t('display.subtotal')}</span>
            <span>€{subtotal.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24, fontWeight: 700, marginTop: 8, color: '#fff' }}>
            <span>{t('display.total')}</span>
            <span style={{ color: '#22c55e' }}>€{(order.total || subtotal).toFixed(2)}</span>
          </div>
        </div>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>
            {order.status === 'open' ? '⏳ ' + t('display.preparing') + '...' : ''}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 11, color: '#475569', textAlign: 'center', padding: '12px 0', borderTop: '1px solid #1e293b' }}>
        {lang === 'sl' ? 'Hvala za obisk!' : 'Thank you for visiting!'}
      </div>
    </div>
  )
}
