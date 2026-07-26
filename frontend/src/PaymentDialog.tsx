import { useState } from 'react'
import * as api from './api'

export default function PaymentDialog({ total, onPay, onClose, customer }: { total: number; onPay: (m: string, tip: number, payAmount?: number) => void; onClose: () => void; customer?: { id: number; name: string; loyalty_points?: number; is_member?: boolean } | null }) {
  const [tipPct, setTipPct] = useState(0)
  const [customTip, setCustomTip] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [gcCode, setGcCode] = useState('')
  const [gcBalance, setGcBalance] = useState<number | null>(null)
  const [gcLoading, setGcLoading] = useState(false)
  const [useLoyalty, setUseLoyalty] = useState(false)
  const [loyaltyPts, setLoyaltyPts] = useState(0)
  const [loading, setLoading] = useState(false)
  const tipAmount = useCustom ? (parseFloat(customTip) || 0) : (total * tipPct / 100)
  const maxLoyaltyPts = Math.min(customer?.loyalty_points || 0, Math.floor(total * 100))
  const loyaltyDiscount = Math.floor((loyaltyPts || 0) / 100)
  const grandTotal = Math.max(0, (total || 0) + (tipAmount || 0) - loyaltyDiscount)
  const gcMax = gcBalance !== null ? Math.min(gcBalance, grandTotal) : 0

  const lookupGC = async () => {
    if (gcCode.trim().length < 4) { setGcBalance(null); return }
    setGcLoading(true)
    try {
      const r = await fetch(`/api/v1/gift-cards/code/${gcCode.trim()}`, { headers: api.authHeader() }).then(r => r.json())
      setGcBalance(r.active ? r.balance : 0)
    } catch { setGcBalance(null) }
    setGcLoading(false)
  }

  const doPay = async (method: string) => {
    setLoading(true)
    try {
      let remaining = total
      // Apply loyalty
      if (useLoyalty && loyaltyPts > 0 && customer) {
        const r = await fetch(`/api/v1/customers/${customer.id}/redeem-points`, { method: 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ points: loyaltyPts }) }).then(r => r.json())
        if (r.discount && typeof r.discount === 'number' && !isNaN(r.discount)) {
          remaining = Math.max(0, remaining - r.discount)
        }
      }
      // Apply gift card
      let usedGC = 0
      if (gcBalance && gcBalance > 0 && remaining > 0.01) {
        const gcAmount = Math.min(gcBalance, remaining)
        await fetch('/api/v1/gift-cards/redeem', { method: 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ code: gcCode, amount: gcAmount, reference: `Order via ${method}` }) }).then(r => r.json())
        remaining = Math.max(0, remaining - gcAmount)
        usedGC = gcAmount
      }
      // Pay remaining
      if (remaining > 0.01) {
        onPay(method, tipAmount, Math.round(remaining * 100) / 100)
      } else {
        onPay(method, tipAmount, 0)
      }
    } catch (e: any) { alert(e.message || 'Napaka pri plačilu'); setLoading(false) }
  }

  return (
    <div className="overlay">
      <div className="modal" style={{ width: 420, maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 className="pay-title">Plačilo</h2>
        <p className="pay-amount">{grandTotal.toFixed(2)} €</p>
        <p className="pay-subtotal" style={{ textAlign: 'center', fontSize: 13, color: 'var(--text2)' }}>
          {total.toFixed(2)} €
          {loyaltyDiscount > 0 && <> - zvestoba {loyaltyDiscount.toFixed(2)} €</>}
          {tipAmount > 0 && <> + napitnina {tipAmount.toFixed(2)} €</>}
        </p>

        <div style={{ padding: '12px 0' }}>
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Napitnina:</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[0, 5, 10, 15, 20].map(pct => (
              <button key={pct} onClick={() => { setTipPct(pct); setUseCustom(false) }}
                className={`btn btn-sm ${tipPct === pct && !useCustom ? 'btn-primary' : 'btn-ghost'}`}>
                {pct === 0 ? 'Brez' : `${pct}% (${(total * pct / 100).toFixed(2)}€)`}
              </button>
            ))}
            <button onClick={() => { setUseCustom(true); setTipPct(0) }}
              className={`btn btn-sm ${useCustom ? 'btn-primary' : 'btn-ghost'}`}>Drugo</button>
          </div>
          {useCustom && (
            <input className="input" type="number" step="0.50" placeholder="Znesek napitnine..." value={customTip}
              onChange={e => setCustomTip(e.target.value)} style={{ marginTop: 8, width: 150 }} />
          )}
        </div>

        {(customer?.is_member && customer.loyalty_points !== undefined && customer.loyalty_points >= 100) && (
          <div style={{ padding: '8px 0', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 13 }}>🔐 Zvestoba: {customer.loyalty_points} točk</div>
            <label style={{ fontSize: 13 }}>
              <input type="checkbox" checked={useLoyalty} onChange={e => setUseLoyalty(e.target.checked)} />{' '}
              Unovči točke (100 točk = 1 €)
            </label>
            {useLoyalty && (
              <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
                <input className="input" type="number" placeholder="Točke" style={{ width: 100 }}
                  value={loyaltyPts || ''}
                  onChange={e => setLoyaltyPts(Math.min(parseInt(e.target.value) || 0, maxLoyaltyPts))} />
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                  max {maxLoyaltyPts} točk ({maxLoyaltyPts > 0 ? `=${(maxLoyaltyPts/100).toFixed(2)}€` : '—'})
                </span>
              </div>
            )}
          </div>
        )}

        <div style={{ padding: '8px 0', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 13 }}>🎁 Darilna kartica</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input className="input" placeholder="Koda kartice..." value={gcCode}
              onChange={e => { setGcCode(e.target.value.toUpperCase()); if (gcCode.length < 4) setGcBalance(null) }} style={{ flex: 1, fontSize: 13 }} />
            <button onClick={lookupGC} className="btn btn-sm" disabled={gcLoading}>Preveri</button>
          </div>
          {gcBalance !== null && (
            <p style={{ fontSize: 12, marginTop: 4, color: gcBalance > 0 ? 'var(--green)' : 'var(--red)' }}>
              {gcBalance > 0 ? `Stanje: ${gcBalance.toFixed(2)} €` : 'Kartica neaktivna ali prazna'}
            </p>
          )}
        </div>

        <div className="pay-btns">
          <button onClick={() => doPay('cash')} disabled={loading} className="btn btn-primary pay-btn">
            💵 Gotovina ({grandTotal.toFixed(2)} €)
          </button>
          <button onClick={() => doPay('card')} disabled={loading} className="btn btn-blue pay-btn">
            💳 Kartica ({grandTotal.toFixed(2)} €)
          </button>
          <button onClick={() => doPay('terminal')} disabled={loading} className="btn btn-ghost pay-btn" style={{ flex: 1 }}>
            💳 Terminal ({grandTotal.toFixed(2)} €)
          </button>
          <button onClick={() => doPay('mobile')} disabled={loading} className="btn btn-purple pay-btn">
            📱 Mobilno ({grandTotal.toFixed(2)} €)
          </button>
          <button onClick={onClose} disabled={loading} className="btn btn-ghost pay-btn-back">Nazaj</button>
        </div>
      </div>
    </div>
  )
}
