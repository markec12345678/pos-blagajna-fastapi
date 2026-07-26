import { useState, useEffect } from 'react'

interface MenuItem {
  id: number; name: string; description: string; price: number; category: string; image_url?: string; is_available: boolean
}

interface CartItem extends MenuItem { quantity: number; notes: string }

export default function TableOrdering() {
  const tableId = window.location.pathname.match(/\/table-order\/(\d+)/)?.[1] || ''
  const [menu, setMenu] = useState<Record<string, MenuItem[]>>({})
  const [cart, setCart] = useState<CartItem[]>([])
  const [table, setTable] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [tab, setTab] = useState<'menu' | 'cart' | 'sent'>('menu')
  const [sending, setSending] = useState(false)
  const [activeCategory, setActiveCategory] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => { loadMenu() }, [tableId])

  const loadMenu = async () => {
    try {
      const r = await fetch(`/api/v1/table-qr/menu/${tableId}`).then(r => r.json())
      setMenu(r.categories || {})
      setTable(r.table_name || '')
      const cats = Object.keys(r.categories || {})
      if (cats.length > 0) setActiveCategory(cats[0])
    } catch {}
  }

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id)
      if (existing) return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c)
      return [...prev, { ...item, quantity: 1, notes: '' }]
    })
  }

  const updateQuantity = (id: number, qty: number) => {
    if (qty <= 0) setCart(prev => prev.filter(c => c.id !== id))
    else setCart(prev => prev.map(c => c.id === id ? { ...c, quantity: qty } : c))
  }

  const total = cart.reduce((s, c) => s + c.price * c.quantity, 0)

  const sendOrder = async () => {
    if (cart.length === 0) return
    setSending(true)
    try {
      await fetch(`/api/v1/table-qr/order/${tableId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(c => ({ id: c.id, quantity: c.quantity, notes: c.notes })),
          notes: orderNotes
        })
      })
      setTab('sent')
      setCart([])
    } catch {}
    setSending(false)
  }

  const filteredMenu = Object.entries(menu).map(([cat, items]) => ({
    cat,
    items: items.filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()))
  })).filter(g => g.items.length > 0)

  if (tab === 'sent') {
    return (
      <div style={{ minHeight: '100vh', background: '#f0fdf4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>Naročilo oddano!</h1>
        <p style={{ color: '#666', textAlign: 'center', marginBottom: 24 }}>Vaše naročilo je bilo poslano v kuhinjo. Prosimo počakajte.</p>
        <button onClick={() => setTab('menu')} style={{
          padding: '12px 24px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8,
          fontSize: 16, fontWeight: 600, cursor: 'pointer'
        }}>
          ➕ Dodaj še kaj
        </button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: '#fff', padding: '16px 20px', borderBottom: '1px solid #eee', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20 }}>🍽️ {table}</h1>
            <div style={{ fontSize: 12, color: '#888' }}>Dotaknite se za naročilo</div>
          </div>
          {cart.length > 0 && (
            <button onClick={() => setTab('cart')} style={{
              background: '#ef4444', color: '#fff', border: 'none', borderRadius: 99,
              padding: '8px 16px', fontWeight: 600, cursor: 'pointer', position: 'relative'
            }}>
              🛒 {cart.reduce((s, c) => s + c.quantity, 0)} • €{total.toFixed(2)}
            </button>
          )}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="🔍 Iskanje..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '10px 14px', marginTop: 12, border: '1px solid #ddd',
            borderRadius: 8, fontSize: 14, boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Cart view */}
      {tab === 'cart' && (
        <div style={{ padding: 20 }}>
          <button onClick={() => setTab('menu')} style={{ border: 'none', background: 'none', fontSize: 14, color: '#3b82f6', cursor: 'pointer', marginBottom: 16 }}>
            ← Nazaj na jedilnik
          </button>
          <h2>🛒 Vaše naročilo</h2>
          {cart.length === 0 ? (
            <p style={{ color: '#888' }}>Košarica je prazna</p>
          ) : (
            <>
              {cart.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #eee' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>€{item.price.toFixed(2)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} style={qtyBtnStyle}>−</button>
                    <span style={{ fontWeight: 600, minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} style={qtyBtnStyle}>+</button>
                  </div>
                </div>
              ))}
              <textarea
                placeholder="Opombe (npr. brez čebule)..."
                value={orderNotes}
                onChange={e => setOrderNotes(e.target.value)}
                style={{ width: '100%', padding: 10, marginTop: 12, border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', minHeight: 60 }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, padding: '12px 0', borderTop: '2px solid #333' }}>
                <span style={{ fontSize: 18, fontWeight: 700 }}>Skupaj</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>€{total.toFixed(2)}</span>
              </div>
              <button
                onClick={sendOrder}
                disabled={sending}
                style={{
                  width: '100%', padding: '16px', background: '#22c55e', color: '#fff',
                  border: 'none', borderRadius: 12, fontSize: 18, fontWeight: 700,
                  cursor: sending ? 'wait' : 'pointer', marginTop: 12
                }}
              >
                {sending ? '⏳ Pošiljam...' : '✅ Oddaj naročilo'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Menu view */}
      {tab === 'menu' && (
        <>
          {/* Category tabs */}
          <div style={{ display: 'flex', gap: 6, padding: '12px 16px', overflowX: 'auto', background: '#fff', borderBottom: '1px solid #eee' }}>
            {filteredMenu.map(({ cat }) => (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                padding: '8px 14px', borderRadius: 99, border: 'none', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
                background: activeCategory === cat ? '#3b82f6' : '#f3f4f6',
                color: activeCategory === cat ? '#fff' : '#333',
                cursor: 'pointer'
              }}>
                {cat}
              </button>
            ))}
          </div>

          {/* Items */}
          <div style={{ padding: '16px', display: 'grid', gap: 12 }}>
            {filteredMenu.filter(g => !activeCategory || g.cat === activeCategory).flatMap(g =>
              g.items.map(item => (
                <div key={item.id} style={{
                  background: '#fff', borderRadius: 12, padding: 14,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  opacity: item.is_available ? 1 : 0.5,
                  boxShadow: '0 1px 3px rgba(0,0,0,.06)'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{item.name}</div>
                    {item.description && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{item.description}</div>}
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#22c55e', marginTop: 4 }}>€{item.price.toFixed(2)}</div>
                  </div>
                  <button
                    onClick={() => addToCart(item)}
                    disabled={!item.is_available}
                    style={{
                      width: 44, height: 44, borderRadius: '50%', border: '2px solid #22c55e',
                      background: '#fff', color: '#22c55e', fontSize: 24, cursor: item.is_available ? 'pointer' : 'not-allowed',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                  >
                    +
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Floating cart button */}
      {tab === 'menu' && cart.length > 0 && (
        <div style={{ position: 'fixed', bottom: 20, left: 20, right: 20, zIndex: 100 }}>
          <button onClick={() => setTab('cart')} style={{
            width: '100%', padding: '16px', background: '#ef4444', color: '#fff',
            border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700,
            cursor: 'pointer', boxShadow: '0 4px 20px rgba(239,68,68,.4)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span>🛒 {cart.reduce((s, c) => s + c.quantity, 0)} artiklov</span>
            <span>€{total.toFixed(2)} →</span>
          </button>
        </div>
      )}
    </div>
  )
}

const qtyBtnStyle = {
  width: 32, height: 32, borderRadius: '50%', border: '1px solid #ddd',
  background: '#fff', fontSize: 18, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center'
}
