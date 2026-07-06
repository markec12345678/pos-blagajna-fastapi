import { useState, useEffect } from 'react'

export default function TablePayPage() {
  const [bill, setBill] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [tip, setTip] = useState(0)
  const [method, setMethod] = useState('card')
  const [sendingReq, setSendingReq] = useState(false)
  const [reqSent, setReqSent] = useState<string | null>(null)

  const tableId = new URLSearchParams(window.location.search).get('table')

  useEffect(() => {
    if (!tableId) { setLoading(false); return }
    fetch(`/api/v1/public/table-bill/${tableId}`)
      .then(r => r.json()).then(d => { setBill(d); setLoading(false) })
      .catch(() => { setError('Napaka pri nalaganju računa'); setLoading(false) })
  }, [tableId])

  const pay = async () => {
    setPaying(true); setError('')
    try {
      const r = await fetch(`/api/v1/public/table-pay/${tableId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tip, method })
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.detail || 'Napaka')
      setDone(true)
    } catch (e: any) {
      setError(e.message || 'Napaka pri plačilu')
    }
    setPaying(false)
  }

  const sendRequest = async (type: string) => {
    setSendingReq(true)
    try {
      const r = await fetch(`/api/v1/public/table-service/${tableId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      })
      if (r.ok) setReqSent(type)
    } catch {}
    setSendingReq(false)
    setTimeout(() => setReqSent(null), 3000)
  }

  if (!tableId) return (
    <div className="page-container" style={{ textAlign: 'center', padding: 40 }}>
      <h2>❌ Ni številke mize</h2>
      <p>Skeniraj QR kodo na mizi.</p>
    </div>
  )

  if (loading) return (
    <div className="page-container" style={{ textAlign: 'center', padding: 40 }}>
      <p>Nalaganje računa...</p>
    </div>
  )

  if (!bill || bill.error || !bill.order_exists) return (
    <div className="page-container" style={{ textAlign: 'center', padding: 40 }}>
      <h2>✅</h2>
      <p style={{ fontSize: 18 }}>Miza <strong>{bill?.table || tableId}</strong> je prosta.</p>
      <p style={{ color: 'var(--text2)' }}>Ni odprtega računa.</p>
    </div>
  )

  if (done) return (
    <div className="page-container" style={{ textAlign: 'center', padding: 40 }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
      <h2>Plačilo uspešno!</h2>
      <p style={{ fontSize: 18 }}>Hvala za obisk. Lep dan še naprej! 🎉</p>
    </div>
  )

  return (
    <div className="page-container" style={{ maxWidth: 500, margin: '0 auto', padding: 20 }}>
      <div className="card" style={{ padding: 20 }}>
        <h2 style={{ margin: '0 0 4px 0' }}>🧾 Račun — Miza {bill.table}</h2>
        <p style={{ fontSize: 12, color: 'var(--text2)', margin: '0 0 16px 0' }}>
          {bill.order_type === 'dine-in' ? 'Jedilnica' : bill.order_type} • {new Date(bill.created_at).toLocaleString('sl-SI')}
        </p>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          {bill.items.map((it: any) => (
            <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14 }}>
              <div>
                <span>{it.quantity}× {it.name}</span>
                {it.modifiers && <span style={{ fontSize: 11, color: 'var(--text2)', marginLeft: 6 }}>({it.modifiers})</span>}
              </div>
              <span style={{ fontWeight: 600 }}>{it.total_price.toFixed(2)} €</span>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid var(--border)', marginTop: 12, paddingTop: 12, textAlign: 'right', fontSize: 22, fontWeight: 700 }}>
          Skupaj: {bill.total.toFixed(2)} €
        </div>

        {/* Tip */}
        <div style={{ marginTop: 16 }}>
          <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Napitnina</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {[0, 1, 2, 5].map(t => (
              <button key={t} onClick={() => setTip(t)} className="btn btn-sm" style={{
                flex: 1, background: tip === t ? 'var(--primary)' : 'var(--bg)',
                color: tip === t ? '#fff' : 'var(--text)'
              }}>{t} €</button>
            ))}
          </div>
        </div>

        {/* Method */}
        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Način plačila</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { k: 'card', l: '💳 Kartica' },
              { k: 'cash', l: '💵 Gotovina' }
            ].map(m => (
              <button key={m.k} onClick={() => setMethod(m.k)} className="btn btn-sm" style={{
                flex: 1, background: method === m.k ? 'var(--primary)' : 'var(--bg)',
                color: method === m.k ? '#fff' : 'var(--text)'
              }}>{m.l}</button>
            ))}
          </div>
        </div>

        {/* Service requests */}
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          {[
            { type: 'waiter', label: '🔔 Pokliči natakarja' },
            { type: 'help', label: '🆘 Pomoč' },
          ].map(sr => (
            <button key={sr.type} onClick={() => sendRequest(sr.type)} disabled={sendingReq || reqSent !== null}
              className="btn btn-sm" style={{
                flex: 1, textAlign: 'center', fontSize: 13, padding: 10,
                background: reqSent === sr.type ? '#059669' : 'var(--bg)',
                color: reqSent === sr.type ? '#fff' : 'var(--text)'
              }}>
              {reqSent === sr.type ? '✅ Poslano!' : sr.label}
            </button>
          ))}
        </div>

        {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}

        <button onClick={pay} disabled={paying} className="btn btn-primary" style={{
          width: '100%', marginTop: 16, padding: 14, fontSize: 18
        }}>
          {paying ? 'Obdelava...' : `Plačaj ${(bill.total + tip).toFixed(2)} €`}
        </button>
      </div>
    </div>
  )
}
