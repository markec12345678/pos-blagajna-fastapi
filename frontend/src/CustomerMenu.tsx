import { useState, useEffect } from 'react'
import { getItemName, getItemDesc } from './i18n'
import { LanguageToggle } from './LanguageToggle'
import { useParams } from './useParams'

const ALLERGENS = [
  '🥜 Žita z glutenom', '🥛 Mleko', '🥚 Jajca', '🐟 Ribe', '🦐 Rakci', '🫘 Soja',
  '🥜🥜 Arašidi', '🌰 Oreščki', '🌱 Zeleno', '🍑 Sulfiti', '🫘🐟 Gorčica', '🌱 Sezam',
  '🌿 Lupine', '🫘🐟 Morski sadeži', '🫑 Sladki koren', '🦗 Žuželke',
]

interface PublicMenuItem {
  id: number; name: string; description: string; price: number; image_url?: string | null; allergens?: string | null; tags?: string | null
}
interface PublicCategory {
  id: number; name: string; items: PublicMenuItem[]
}
interface PublicMenu {
  table: { id: number; name: string; number: number }
  categories: PublicCategory[]
}

interface CartItem {
  menu_item_id: number; name: string; price: number; quantity: number; notes: string
}

const API = '/api/v1/public'

const CAT_ICONS: Record<string, string> = {
  pizza: '🍕', salad: '🥗', 'main course': '🥩', dessert: '🍰', drinks: '🥤', starters: '🥟',
  predjedi: '🥟', 'glavne jedi': '🥩', sladice: '🍰', pijače: '🥤', pizze: '🍕',
}

function catIcon(name: string) {
  for (const [k, v] of Object.entries(CAT_ICONS)) {
    if (name.toLowerCase().includes(k)) return v
  }
  return '🍽️'
}

export default function CustomerMenu() {
  const { tableId } = useParams()
  const [data, setData] = useState<PublicMenu | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [cat, setCat] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [orderId, setOrderId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [noteModal, setNoteModal] = useState<{id: number; name: string; notes: string} | null>(null)

  useEffect(() => {
    if (!tableId) return
    fetch(`${API}/menu/${tableId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [tableId])

  const add = (item: PublicMenuItem) => {
    setCart(c => {
      const e = c.find(x => x.menu_item_id === item.id)
      return e
        ? c.map(x => x.menu_item_id === item.id ? { ...x, quantity: x.quantity + 1 } : x)
        : [...c, { menu_item_id: item.id, name: item.name, price: item.price, quantity: 1, notes: '' }]
    })
  }

  const addFromCart = (item: CartItem) => {
    setCart(c => {
      const e = c.find(x => x.menu_item_id === item.menu_item_id)
      return e ? c.map(x => x.menu_item_id === item.menu_item_id ? { ...x, quantity: x.quantity + 1 } : x) : c
    })
  }

  const remove = (id: number) => {
    setCart(c => {
      const e = c.find(x => x.menu_item_id === id)
      return e && e.quantity > 1
        ? c.map(x => x.menu_item_id === id ? { ...x, quantity: x.quantity - 1 } : x)
        : c.filter(x => x.menu_item_id !== id)
    })
  }

  const submit = async () => {
    if (!cart.length || !tableId) return
    setSubmitting(true)
    try {
      const r = await fetch(`${API}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_id: parseInt(tableId),
          customer_name: name || 'Guest',
          items: cart.map(i => ({ menu_item_id: i.menu_item_id, quantity: i.quantity, notes: i.notes }))
        })
      })
      const d = await r.json()
      if (!r.ok) throw new Error('Napaka pri oddaji')
      setOrderId(d.order_id)
      setSuccess(true)
    } catch { alert('Napaka pri oddaji naročila') }
    setSubmitting(false)
  }

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0)
  const sQuery = search.toLowerCase()

  const filteredItems = (cat
    ? data?.categories.find(c => c.id === cat)?.items || []
    : data?.categories.flatMap(c => c.items) || []
  ).filter(i => !sQuery || i.name.toLowerCase().includes(sQuery) || i.description.toLowerCase().includes(sQuery))

  if (loading) return (
    <div className="cm-loading">
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🍽️</div>
        <div>Nalaganje menija...</div>
      </div>
    </div>
  )
  if (!data) return (
    <div className="cm-loading">
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
        <div>Mize ni mogoče najti</div>
      </div>
    </div>
  )
  if (success) return (
    <div className="cm-container">
      <div style={{
        textAlign: 'center', padding: '60px 20px',
        background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white',
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{ fontSize: 72, marginBottom: 16, animation: 'pulse 2s infinite' }}>✅</div>
        <h2 style={{ fontSize: 28, fontWeight: 700 }}>Naročilo oddano!</h2>
        <p style={{ fontSize: 16, opacity: 0.9, marginTop: 8 }}>Vaše naročilo je bilo posredovano v kuhinjo.</p>
        <div style={{
          background: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: '20px 40px', marginTop: 24
        }}>
          <div style={{ fontSize: 14, opacity: 0.8 }}>Številka naročila</div>
          <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: 2 }}>#{orderId}</div>
        </div>
        <a href={`/order/${tableId}`} style={{
          marginTop: 32, color: 'white', textDecoration: 'none',
          border: '2px solid rgba(255,255,255,0.5)', borderRadius: 12,
          padding: '14px 32px', fontSize: 16, fontWeight: 600,
          transition: 'all 0.2s'
        }}
          onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
          onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
        >
          🔄 Spremljaj naročilo
        </a>
        <p style={{ fontSize: 13, opacity: 0.7, marginTop: 32 }}>Uživajte v obroku!</p>
      </div>
    </div>
  )

  return (
    <div className="cm-container">
      <div className="cm-header">
        <div className="cm-logo">🍽️</div>
        <h1 className="cm-title">{data.table.name}</h1>
        <LanguageToggle />
      </div>

      <div className="cm-input-wrap" style={{ display: 'flex', gap: 8 }}>
        <input className="cm-input" placeholder="🔍 Išči jed ali pijačo..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
        <input className="cm-input" placeholder="Vaše ime (neobvezno)" value={name} onChange={e => setName(e.target.value)} style={{ flex: 0.6 }} />
      </div>

      {!search && (
        <div className="cm-cats">
          <button onClick={() => setCat(null)} className={`cm-cat-btn ${!cat ? 'active' : ''}`}>Vse</button>
          {data.categories.map(c => (
            <button key={c.id} onClick={() => setCat(c.id)} className={`cm-cat-btn ${cat === c.id ? 'active' : ''}`}>
              {catIcon(c.name)} {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="cm-items-wrap">
        {filteredItems.length === 0 && (
          <p style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>
            {search ? 'Ni zadetkov za iskanje.' : 'Ta kategorija je prazna.'}
          </p>
        )}
        {filteredItems.map(item => {
          const inCart = cart.find(c => c.menu_item_id === item.id)
          return (
            <button key={item.id} onClick={() => add(item)} className="cm-item" style={inCart ? { borderColor: '#059669' } : undefined}>
              {item.image_url && <img src={item.image_url} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', marginRight: 12 }} />}
              <div>
                <div className="cm-item-name">{getItemName(item, item.name)}</div>
                {item.description && <div className="cm-item-desc">{getItemDesc(item, item.description)}</div>}
                {item.allergens && (() => {
                  try {
                    const a = JSON.parse(item.allergens)
                    return <div style={{ fontSize: 11, color: '#ef4444', marginTop: 2 }}>⚠️ {a.join(', ')}</div>
                  } catch { return null }
                })()}
                {(item as any).calories ? <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>🔥 {(item as any).calories} kcal{((item as any).protein || (item as any).fat || (item as any).carbs) ? ` (B:${(item as any).protein || '-'}g M:${(item as any).fat || '-'}g OH:${(item as any).carbs || '-'}g)` : ''}</div> : null}
                {item.tags && (() => {
                  try {
                    const t = JSON.parse(item.tags)
                    const colors: Record<string, string> = { vegan: '#22c55e', vegetarian: '#86efac', 'gluten-free': '#fbbf24', spicy: '#ef4444', 'chef-special': '#a855f7', local: '#3b82f6', organic: '#10b981', 'sugar-free': '#f97316', seasonal: '#ec4899', signature: '#8b5cf6' }
                    return <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
                      {t.map((tag: string) => (
                        <span key={tag} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8, background: colors[tag.toLowerCase()] || '#6b7280', color: '#fff', fontWeight: 600 }}>{tag}</span>
                      ))}
                    </div>
                  } catch { return null }
                })()}
                {inCart && <div className="cm-item-desc" style={{ color: '#059669', fontWeight: 600, marginTop: 2 }}>V košarici: {inCart.quantity}x</div>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="cm-item-price">{item.price.toFixed(2)} €</div>
              </div>
            </button>
          )
        })}
      </div>

      {cart.length > 0 && (
        <div className="cm-cart">
          <div className="cm-cart-scroll">
            {cart.map(c => (
              <div key={c.menu_item_id} className="cm-cart-row">
                <div className="cm-item-name" style={{ fontSize: 12, lineHeight: 1.3 }}>
                  {c.name}
                  {c.notes && <span style={{ color: '#f59e0b', fontSize: 11, display: 'block' }}>📝 {c.notes}</span>}
                </div>
                <div className="cm-qty-area">
                  <button onClick={() => remove(c.menu_item_id)} className="cm-qty-btn">−</button>
                  <span className="cm-qty-value">{c.quantity}</span>
                  <button onClick={() => addFromCart(c)} className="cm-qty-btn">+</button>
                  <button onClick={() => setNoteModal({ id: c.menu_item_id, name: c.name, notes: c.notes })} className="cm-qty-btn" title="Dodaj opombo">📝</button>
                  <span className="cm-line-total">{(c.price * c.quantity).toFixed(2)} €</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ fontSize: 14, color: '#64748b' }}>
              {cart.reduce((s, i) => s + i.quantity, 0)} kosov
            </div>
            <button onClick={submit} disabled={submitting} className="cm-order-btn">
              {submitting ? 'Oddajanje...' : `Naroči | ${total.toFixed(2)} €`}
            </button>
          </div>
        </div>
      )}

      {noteModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 999, backdropFilter: 'blur(4px)'
        }} onClick={() => setNoteModal(null)}>
          <div style={{
            background: 'white', borderRadius: 16, padding: 24, maxWidth: 360, width: '90%'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 12 }}>📝 Opomba za: {noteModal.name}</h3>
            <textarea
              className="cm-input"
              placeholder="Npr. brez čebule, brez sira..."
              value={noteModal.notes}
              onChange={e => {
                setNoteModal({ ...noteModal, notes: e.target.value })
                setCart(c => c.map(x => x.menu_item_id === noteModal.id ? { ...x, notes: e.target.value } : x))
              }}
              style={{ minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={() => setNoteModal(null)} className="btn btn-primary" style={{ flex: 1 }}>✅ V redu</button>
              {noteModal.notes && (
                <button onClick={() => {
                  setNoteModal({ ...noteModal, notes: '' })
                  setCart(c => c.map(x => x.menu_item_id === noteModal.id ? { ...x, notes: '' } : x))
                }} className="btn btn-ghost" style={{ flex: 1 }}>🗑️ Zbriši</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
