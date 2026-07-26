import { useState, useEffect } from 'react'

interface PaymentMethod {
  id: string; name: string; icon: string; requires_reference: boolean
}

interface Payment {
  id: number; amount: number; method: string; tip: number; reference: string; created_at: string
}

interface OrderData {
  order_id: number; order_total: number; total_paid: number; remaining: number; total_tip: number; status: string; payments: Payment[]
}

const METHOD_ICONS: Record<string, string> = {
  gotovina: '💰', kartica: '💳', bon: '🎟️', vaučer: '🎫', mobile_pay: '📱', račun: '📄'
}

export default function MultiPaymentPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [orderId, setOrderId] = useState<number | null>(null)
  const [orderData, setOrderData] = useState<OrderData | null>(null)
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [payments, setPayments] = useState<{ amount: number; method: string; reference: string; tip: number }[]>([])
  const [activeMethod, setActiveMethod] = useState('gotovina')
  const [inputAmount, setInputAmount] = useState('')
  const [inputTip, setInputTip] = useState('')
  const [inputRef, setInputRef] = useState('')
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'pay' | 'history'>('pay')

  const headers = { ...JSON.parse(localStorage.getItem('auth') || '{}').headers }

  useEffect(() => { loadMethods() }, [])

  const loadMethods = async () => {
    try {
      const r = await fetch('/api/v1/multi-payment/methods', { headers }).then(r => r.json())
      setMethods(r.methods || [])
    } catch {}
  }

  const loadOrder = async () => {
    if (!orderId) return
    setLoading(true)
    try {
      const r = await fetch(`/api/v1/multi-payment/order/${orderId}`, { headers }).then(r => r.json())
      if (!r.error) setOrderData(r)
      else onNotify(r.error)
    } catch { onNotify('Napaka') }
    setLoading(false)
  }

  const addPayment = () => {
    const amount = parseFloat(inputAmount)
    if (!amount || amount <= 0) { onNotify('Vnesite znesek'); return }

    const tip = parseFloat(inputTip) || 0
    setPayments(prev => [...prev, { amount, method: activeMethod, reference: inputRef, tip }])
    setInputAmount('')
    setInputTip('')
    setInputRef('')
  }

  const removePayment = (idx: number) => {
    setPayments(prev => prev.filter((_, i) => i !== idx))
  }

  const totalPayments = payments.reduce((s, p) => s + p.amount, 0)
  const totalTips = payments.reduce((s, p) => s + p.tip, 0)
  const remaining = orderData ? orderData.order_total - orderData.total_paid - totalPayments : 0

  const processPayment = async () => {
    if (!orderId || payments.length === 0) return
    setLoading(true)
    try {
      const r = await fetch('/api/v1/multi-payment/pay', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, payments })
      }).then(r => r.json())
      if (r.message) {
        onNotify(r.message)
        setPayments([])
        loadOrder()
      } else onNotify(r.error || 'Napaka')
    } catch { onNotify('Napaka') }
    setLoading(false)
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ margin: '0 0 16px' }}>💳 Večkratno plačilo</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setTab('pay')} className={`btn btn-sm ${tab === 'pay' ? 'btn-primary' : 'btn-ghost'}`}>
          💳 Plačaj
        </button>
      </div>

      {/* Order lookup */}
      <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <label style={{ fontSize: 12, color: '#888' }}>ID naročila</label>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <input type="number" className="input" value={orderId || ''} onChange={e => setOrderId(parseInt(e.target.value) || null)}
            placeholder="Vnesite ID naročila..." style={{ flex: 1 }} />
          <button onClick={loadOrder} className="btn btn-primary" disabled={loading}>
            {loading ? '⏳' : '🔍'} Naloži
          </button>
        </div>
      </div>

      {orderData && (
        <div>
          {/* Order summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
            <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#888' }}>Skupaj</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>€{orderData.order_total.toFixed(2)}</div>
            </div>
            <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#888' }}>Plačano</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#22c55e' }}>€{orderData.total_paid.toFixed(2)}</div>
            </div>
            <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#888' }}>Preostalo</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: remaining > 0 ? '#ef4444' : '#22c55e' }}>
                €{Math.max(0, remaining).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Previous payments */}
          {orderData.payments.length > 0 && (
            <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <h3 style={{ marginTop: 0, fontSize: 14 }}>📋 Prejšnja plačila</h3>
              {orderData.payments.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eee' }}>
                  <span>{METHOD_ICONS[p.method] || '💳'} {p.method}</span>
                  <span style={{ fontWeight: 600 }}>€{p.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {/* New payment form */}
          {orderData.status !== 'paid' && remaining > 0 && (
            <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <h3 style={{ marginTop: 0, fontSize: 14 }}>➕ Dodaj plačilo</h3>

              {/* Method selector */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                {methods.map(m => (
                  <button key={m.id} onClick={() => setActiveMethod(m.id)}
                    style={{
                      padding: '8px 14px', borderRadius: 99, border: `2px solid ${activeMethod === m.id ? '#3b82f6' : '#ddd'}`,
                      background: activeMethod === m.id ? '#e0f2fe' : '#fff', cursor: 'pointer', fontSize: 13,
                      fontWeight: activeMethod === m.id ? 600 : 400
                    }}>
                    {m.icon} {m.name.split(' ').slice(1).join(' ')}
                  </button>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#888' }}>Znesek</label>
                  <input type="number" className="input" value={inputAmount} onChange={e => setInputAmount(e.target.value)}
                    placeholder="0.00" style={{ fontSize: 18, textAlign: 'center' }}
                    onKeyDown={e => e.key === 'Enter' && addPayment()} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#888' }}>Napitnina</label>
                  <input type="number" className="input" value={inputTip} onChange={e => setInputTip(e.target.value)}
                    placeholder="0.00" style={{ fontSize: 18, textAlign: 'center' }} />
                </div>
              </div>

              {methods.find(m => m.id === activeMethod)?.requires_reference && (
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 12, color: '#888' }}>Referenca</label>
                  <input className="input" value={inputRef} onChange={e => setInputRef(e.target.value)}
                    placeholder="Številka računa, reference..." />
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={() => setInputAmount(String(remaining.toFixed(2)))} className="btn btn-sm btn-ghost">
                  Celoten znesek (€{remaining.toFixed(2)})
                </button>
                <button onClick={addPayment} className="btn btn-sm btn-primary" style={{ marginLeft: 'auto' }}>
                  ➕ Dodaj plačilo
                </button>
              </div>
            </div>
          )}

          {/* Pending payments */}
          {payments.length > 0 && (
            <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <h3 style={{ marginTop: 0, fontSize: 14 }}>📝 Čakajoča plačila</h3>
              {payments.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                  <div>
                    <span>{METHOD_ICONS[p.method] || '💳'} {p.method}</span>
                    {p.tip > 0 && <span style={{ fontSize: 12, color: '#888' }}> + €{p.tip.toFixed(2)} napitnina</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700 }}>€{p.amount.toFixed(2)}</span>
                    <button onClick={() => removePayment(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>×</button>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', borderTop: '2px solid #333', marginTop: 8 }}>
                <span style={{ fontWeight: 700 }}>Skupaj</span>
                <span style={{ fontWeight: 700, fontSize: 18 }}>€{totalPayments.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Process button */}
          {payments.length > 0 && remaining - totalPayments <= 0.01 && (
            <button onClick={processPayment} className="btn btn-primary" disabled={loading}
              style={{ width: '100%', padding: 16, fontSize: 18 }}>
              {loading ? '⏳ Obdelava...' : `✅ Plačaj €${totalPayments.toFixed(2)}${totalTips > 0 ? ` + €${totalTips.toFixed(2)} napitnina` : ''}`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
