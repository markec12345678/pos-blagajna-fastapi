import { useState, useEffect } from 'react'
import { getItemName, getItemDesc } from './i18n'

interface Cat { id: number; name: string; items: KioskItem[] }
interface KioskItem { id: number; name: string; description: string; price: number; image_url: string | null; tags: string | null; allergens: string | null }

export default function KioskPage() {
  const [cats, setCats] = useState<Cat[]>([])
  const [catIdx, setCatIdx] = useState(0)
  const [cart, setCart] = useState<{ id: number; name: string; price: number; qty: number; notes: string }[]>([])
  const [phase, setPhase] = useState<'menu' | 'cart' | 'done'>('menu')
  const [orderNo, setOrderNo] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [showNotes, setShowNotes] = useState<number | null>(null)
  const [noteText, setNoteText] = useState('')
  const [lang, setLang] = useState('sl')

  const params = new URLSearchParams(window.location.search)
  const branchId = parseInt(params.get('branch') || '1')
  const API = '/api/v1/public'

  useEffect(() => {
    fetch(`${API}/kiosk-menu/${branchId}`)
      .then(r => r.json()).then(d => setCats(d)).catch(() => {})
  }, [branchId])

  const curCat = cats[catIdx]
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const itemCount = cart.reduce((s, i) => s + i.qty, 0)

  const add = (item: KioskItem) => {
    setCart(c => {
      const e = c.find(x => x.id === item.id)
      return e ? c.map(x => x.id === item.id ? { ...x, qty: x.qty + 1 } : x) : [...c, { id: item.id, name: item.name, price: item.price, qty: 1, notes: '' }]
    })
  }
  const qty = (id: number, delta: number) => setCart(c => {
    const e = c.find(x => x.id === id)
    if (!e) return c
    if (e.qty + delta <= 0) return c.filter(x => x.id !== id)
    return c.map(x => x.id === id ? { ...x, qty: x.qty + delta } : x)
  })

  const submit = async () => {
    setSubmitting(true)
    try {
      const r = await fetch(`${API}/kiosk-orders`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch_id: branchId, items: cart.map(i => ({ menu_item_id: i.id, quantity: i.qty, notes: i.notes })) })
      })
      if (!r.ok) throw new Error()
      const d = await r.json()
      setOrderNo(d.order_id)
      setPhase('done')
    } catch { alert('Napaka pri oddaji') }
    setSubmitting(false)
  }

  if (phase === 'done') return (
    <div className="kiosk-done">
      <div className="kiosk-done-inner">
        <div className="kiosk-check">✅</div>
        <h1>Naročilo oddano!</h1>
        <div className="kiosk-order-no">#{orderNo}</div>
        <p>Počakajte, da vas pokličejo.</p>
        <button onClick={() => { setCart([]); setPhase('menu'); setCatIdx(0); setOrderNo(0) }} className="kiosk-btn kiosk-btn-primary" style={{ marginTop: 24, fontSize: 18, padding: '16px 48px' }}>
          Novo naročilo
        </button>
      </div>
    </div>
  )

  return (
    <div className="kiosk-full">
      {/* Top bar */}
      <div className="kiosk-top">
        <div className="kiosk-logo">🍽️</div>
        <div className="kiosk-lang">
          {['sl', 'en', 'de', 'it'].map(l => (
            <button key={l} onClick={() => setLang(l)} className={`kiosk-lang-btn ${lang === l ? 'active' : ''}`}>{l.toUpperCase()}</button>
          ))}
        </div>
      </div>

      {/* Category tabs */}
      {!cats.length ? (
        <div className="kiosk-loading">Nalaganje menija...</div>
      ) : (
        <>
          <div className="kiosk-cats">
            {cats.map((c, i) => (
              <button key={c.id} onClick={() => setCatIdx(i)} className={`kiosk-cat-btn ${catIdx === i ? 'active' : ''}`}>{c.name}</button>
            ))}
          </div>

          {/* Items grid */}
          <div className="kiosk-items">
            {curCat?.items.filter(i => i.price > 0).map(item => (
              <button key={item.id} onClick={() => add(item)} className="kiosk-item">
                {item.image_url && <img src={item.image_url} alt="" className="kiosk-item-img" />}
                <div className="kiosk-item-info">
                  <div className="kiosk-item-name">{getItemName(item, item.name)}</div>
                  {item.description && <div className="kiosk-item-desc">{getItemDesc(item, item.description)}</div>}
                </div>
                <div className="kiosk-item-price">{item.price.toFixed(2)} €</div>
                {cart.find(c => c.id === item.id) && (
                  <div className="kiosk-item-badge">{cart.find(c => c.id === item.id)!.qty}</div>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Bottom cart bar */}
      {cart.length > 0 && (
        <div className="kiosk-bottom">
          {phase === 'cart' ? (
            <div className="kiosk-cart-expanded">
              <div className="kiosk-cart-header">
                <h3>Košarica</h3>
                <button onClick={() => setPhase('menu')} className="kiosk-btn kiosk-btn-ghost" style={{ fontSize: 12 }}>✕</button>
              </div>
              <div className="kiosk-cart-items">
                {cart.map(item => (
                  <div key={item.id} className="kiosk-cart-row">
                    <div className="kiosk-cart-info">
                      <span className="kiosk-cart-name">{item.name}</span>
                      {item.notes && <span className="kiosk-cart-note">📝 {item.notes}</span>}
                    </div>
                    <div className="kiosk-cart-actions">
                      <button onClick={() => qty(item.id, -1)} className="kiosk-qty-btn">−</button>
                      <span className="kiosk-qty">{item.qty}</span>
                      <button onClick={() => qty(item.id, 1)} className="kiosk-qty-btn">+</button>
                      <button onClick={() => { setShowNotes(item.id); setNoteText(item.notes) }} className="kiosk-qty-btn" style={{ fontSize: 14 }}>📝</button>
                      <span className="kiosk-line-total">{(item.price * item.qty).toFixed(2)} €</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="kiosk-cart-footer">
                <span style={{ fontSize: 16, fontWeight: 600 }}>Skupaj: {total.toFixed(2)} €</span>
                <button onClick={submit} disabled={submitting} className="kiosk-btn kiosk-btn-primary">{submitting ? 'Oddajanje...' : 'Naroči'}</button>
              </div>
            </div>
          ) : (
            <div className="kiosk-cart-bar">
              <div className="kiosk-cart-summary">{itemCount} kosov • {total.toFixed(2)} €</div>
              <button onClick={() => setPhase('cart')} className="kiosk-btn kiosk-btn-primary">Preglej košarico</button>
            </div>
          )}
        </div>
      )}

      {/* Notes modal */}
      {showNotes !== null && (
        <div className="kiosk-overlay" onClick={() => setShowNotes(null)}>
          <div className="kiosk-modal" onClick={e => e.stopPropagation()}>
            <h3>Opomba</h3>
            <textarea className="kiosk-input" rows={3} placeholder="Npr. brez čebule..." value={noteText} onChange={e => setNoteText(e.target.value)} />
            <button onClick={() => {
              setCart(c => c.map(x => x.id === showNotes ? { ...x, notes: noteText } : x))
              setShowNotes(null)
            }} className="kiosk-btn kiosk-btn-primary" style={{ width: '100%', marginTop: 8 }}>V redu</button>
          </div>
        </div>
      )}
    </div>
  )
}
