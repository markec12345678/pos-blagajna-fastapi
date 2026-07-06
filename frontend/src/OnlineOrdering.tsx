import { useState, useEffect } from 'react'
import { getItemName, getItemDesc, getCurrentLang } from './i18n'
import CustomerProfile from './CustomerProfile'

interface Branch { id: number; name: string; address: string }
interface ModOption { id: number; name: string; price_impact: number; sort_order: number }
interface ModGroup { id: number; name: string; min_select: number; max_select: number; is_required: boolean; options: ModOption[] }
interface MenuItem { id: number; name: string; description: string; price: number; image_url: string | null; allergens: string | null; tags: string | null; translations: string | null; tax_rate: number; modifier_groups: ModGroup[] }
interface Category { id: number; name: string; sort_order: number; items: MenuItem[] }

interface CartItem {
  menu_item_id: number; name: string; base_price: number; quantity: number; notes: string;
  selected_options: { option_id: number; option_name: string; price_impact: number; group_id: number; group_name: string }[]
  unit_price: number; total_price: number
}

const API = '/api/v1/public'

function formatPrice(p: number) { return p.toFixed(2) + ' €' }

export default function OnlineOrdering() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [catIdx, setCatIdx] = useState(0)
  const [search, setSearch] = useState('')
  const [phase, setPhase] = useState<'branches' | 'menu' | 'checkout' | 'done'>('branches')
  const [submitting, setSubmitting] = useState(false)
  const [orderResult, setOrderResult] = useState<any>(null)
  const [lang, setLang] = useState(getCurrentLang())
  const [itemModal, setItemModal] = useState<MenuItem | null>(null)
  const [itemQty, setItemQty] = useState(1)
  const [itemNotes, setItemNotes] = useState('')
  const [itemSelections, setItemSelections] = useState<Record<number, number[]>>({})
  const [showCart, setShowCart] = useState(false)
  const [checkout, setCheckout] = useState({ name: '', phone: '', email: '', address: '', notes: '' })
  const [orderType, setOrderType] = useState<'takeaway' | 'delivery'>('takeaway')
  const [loading, setLoading] = useState(true)
  const [customerToken, setCustomerToken] = useState(localStorage.getItem('customer_token') || '')
  const [showProfile, setShowProfile] = useState(false)

  const handleLogin = (token: string) => {
    setCustomerToken(token)
    localStorage.setItem('customer_token', token)
  }
  const handleLogout = () => {
    setCustomerToken('')
    localStorage.removeItem('customer_token')
    setCheckout({ name: '', phone: '', email: '', address: '', notes: '' })
  }

  const toggleLang = () => { const n = lang === 'sl' ? 'en' : 'sl'; setLang(n); localStorage.setItem('pos_language', n) }

  useEffect(() => {
    fetch(`${API}/branches`)
      .then(r => r.json()).then(d => {
        setBranches(d)
        if (d.length === 1) { setSelectedBranch(d[0].id) }
        setLoading(false)
      }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedBranch) return
    setLoading(true)
    fetch(`${API}/online-menu/${selectedBranch}`)
      .then(r => r.json()).then(d => {
        setCategories(d)
        setPhase('menu')
        setLoading(false)
      }).catch(() => setLoading(false))
  }, [selectedBranch])

  const itemTotal = cart.reduce((s, i) => s + i.total_price, 0)
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0)

  const addItemToCart = () => {
    if (!itemModal) return
    const selected: CartItem['selected_options'] = []
    for (const [gid, optIds] of Object.entries(itemSelections)) {
      const group = itemModal.modifier_groups.find(g => g.id === parseInt(gid))
      if (!group) continue
      for (const oid of optIds) {
        const opt = group.options.find(o => o.id === oid)
        if (opt) selected.push({ option_id: opt.id, option_name: opt.name, price_impact: opt.price_impact, group_id: group.id, group_name: group.name })
      }
    }
    const modImpact = selected.reduce((s, m) => s + m.price_impact, 0)
    const unitPrice = itemModal.price + modImpact
    const totalPrice = unitPrice * itemQty
    setCart(c => {
      const existing = c.findIndex(x =>
        x.menu_item_id === itemModal.id &&
        x.notes === itemNotes &&
        JSON.stringify(x.selected_options.map(o => o.option_id).sort()) === JSON.stringify(selected.map(o => o.option_id).sort())
      )
      if (existing >= 0) {
        const updated = [...c]
        updated[existing] = { ...updated[existing], quantity: updated[existing].quantity + itemQty, total_price: updated[existing].total_price + totalPrice }
        return updated
      }
      return [...c, {
        menu_item_id: itemModal.id, name: itemModal.name, base_price: itemModal.price,
        quantity: itemQty, notes: itemNotes,
        selected_options: selected, unit_price: unitPrice, total_price: totalPrice
      }]
    })
    closeItemModal()
  }

  const closeItemModal = () => {
    setItemModal(null)
    setItemQty(1)
    setItemNotes('')
    setItemSelections({})
  }

  const removeCartItem = (idx: number) => setCart(c => c.filter((_, i) => i !== idx))

  const updateCartQty = (idx: number, delta: number) => {
    setCart(c => {
      const item = c[idx]
      if (!item) return c
      const newQty = item.quantity + delta
      if (newQty <= 0) return c.filter((_, i) => i !== idx)
      const updated = [...c]
      updated[idx] = { ...item, quantity: newQty, total_price: item.unit_price * newQty }
      return updated
    })
  }

  const getSelectionsForGroup = (groupId: number): number[] => itemSelections[groupId] || []

  const toggleOption = (groupId: number, optionId: number, maxSelect: number) => {
    setItemSelections(prev => {
      const current = prev[groupId] || []
      if (current.includes(optionId)) {
        return { ...prev, [groupId]: current.filter(id => id !== optionId) }
      }
      if (maxSelect === 1) return { ...prev, [groupId]: [optionId] }
      if (current.length >= maxSelect) return prev
      return { ...prev, [groupId]: [...current, optionId] }
    })
  }

  const placeOrder = async () => {
    if (!cart.length || !checkout.name) return
    setSubmitting(true)
    try {
      const r = await fetch(`${API}/online-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch_id: selectedBranch,
          customer_name: checkout.name,
          customer_phone: checkout.phone,
          customer_email: checkout.email,
          order_type: orderType,
          delivery_address: checkout.address,
          delivery_notes: checkout.notes,
          token: customerToken,
          items: cart.map(i => ({
            menu_item_id: i.menu_item_id,
            quantity: i.quantity,
            notes: i.notes,
            modifier_option_ids: i.selected_options.map(o => o.option_id)
          }))
        })
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.detail || 'Napaka')
      setOrderResult(d)
      setPhase('done')
    } catch (e: any) { alert(e.message || 'Napaka pri oddaji naročila') }
    setSubmitting(false)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🍽️</div>
        <div style={{ color: '#64748b', fontSize: 16 }}>Nalaganje...</div>
      </div>
    </div>
  )

  if (phase === 'branches') return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a, #1e293b)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🍽️</div>
        <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 700, margin: 0 }}>Online naročanje</h1>
        <p style={{ color: '#94a3b8', marginTop: 8, fontSize: 14 }}>Izberite poslovalnico</p>
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {branches.map(b => (
            <button key={b.id} onClick={() => setSelectedBranch(b.id)}
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, padding: '16px 24px', color: '#fff', cursor: 'pointer', fontSize: 16, fontWeight: 600, transition: 'all 0.2s', textAlign: 'left' }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
              <div style={{ fontSize: 18 }}>{b.name}</div>
              {b.address && <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>{b.address}</div>}
            </button>
          ))}
        </div>
        <button onClick={toggleLang} style={{ marginTop: 24, background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '8px 16px', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>
          {lang === 'sl' ? '🇬🇧 English' : '🇸🇮 Slovenščina'}
        </button>
      </div>
    </div>
  )

  if (phase === 'done' && orderResult) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #059669, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ maxWidth: 420, width: '100%', textAlign: 'center', color: '#fff' }}>
        <div style={{ fontSize: 72, marginBottom: 16, animation: 'pulse 2s infinite' }}>✅</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Naročilo oddano!</h1>
        <p style={{ fontSize: 16, opacity: 0.9, marginTop: 8 }}>Hvala za vaše naročilo.</p>
        <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 16, padding: '24px', marginTop: 24 }}>
          <div style={{ fontSize: 13, opacity: 0.8 }}>Številka naročila</div>
          <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: 3 }}>#{orderResult.order_id}</div>
          <div style={{ fontSize: 20, fontWeight: 600, marginTop: 12 }}>{formatPrice(orderResult.total)}</div>
        </div>
        <a href={`/order-tracking?order=${orderResult.order_id}${checkout.phone ? '&phone=' + encodeURIComponent(checkout.phone) : ''}`}
          style={{ display: 'inline-block', marginTop: 24, color: '#fff', textDecoration: 'none', border: '2px solid rgba(255,255,255,0.5)', borderRadius: 12, padding: '14px 32px', fontSize: 16, fontWeight: 600 }}>
          🔄 Spremljaj naročilo
        </a>
        <button onClick={() => { setCart([]); setPhase('menu'); setOrderResult(null); setCheckout({ name: '', phone: '', email: '', address: '', notes: '' }) }}
          style={{ display: 'block', margin: '16px auto 0', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 14 }}>
          Novo naročilo
        </button>
      </div>
    </div>
  )

  const sQuery = search.toLowerCase()
  const filteredItems = categories.length > 0
    ? (catIdx >= 0 && catIdx < categories.length ? categories[catIdx].items : categories.flatMap(c => c.items))
        .filter(i => !sQuery || i.name.toLowerCase().includes(sQuery) || (i.description && i.description.toLowerCase().includes(sQuery)))
    : []

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif', paddingBottom: 100 }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '12px 16px', position: 'sticky', top: 0, zIndex: 100, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 24 }}>🍽️</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Online naročanje</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>{branches.find(b => b.id === selectedBranch)?.name || ''}</div>
        </div>
        <button onClick={() => setShowProfile(true)} style={{ background: 'transparent', border: customerToken ? '1px solid #059669' : '1px solid #e2e8f0', borderRadius: 8, padding: '4px 10px', color: customerToken ? '#059669' : '#64748b', cursor: 'pointer', fontSize: 13, fontWeight: customerToken ? 600 : 400 }}>
          {customerToken ? '👤 Račun' : '👤 Prijava'}
        </button>
        <button onClick={() => { setSelectedBranch(null); setPhase('branches'); setCategories([]) }} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 13 }}>Zamenjaj</button>
        <button onClick={toggleLang} style={{ background: 'transparent', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 10px', color: '#64748b', cursor: 'pointer', fontSize: 12 }}>{lang === 'sl' ? 'EN' : 'SL'}</button>
      </div>

      <div style={{ padding: '12px 16px', background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <input placeholder="🔍 Išči jed ali pijačo..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#f8fafc' }} />
      </div>

      {!search && (
        <div style={{ display: 'flex', gap: 8, padding: '12px 16px', overflowX: 'auto', background: '#fff', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
          <button onClick={() => setCatIdx(0)} style={{ padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: catIdx === 0 ? '#059669' : '#e2e8f0', color: catIdx === 0 ? '#fff' : '#475569' }}>
            Vse
          </button>
          {categories.map((c, i) => (
            <button key={c.id} onClick={() => setCatIdx(i)} style={{ padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: catIdx === i ? '#059669' : '#e2e8f0', color: catIdx === i ? '#fff' : '#475569', whiteSpace: 'nowrap' }}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredItems.length === 0 && (
          <p style={{ textAlign: 'center', color: '#94a3b8', padding: 40, fontSize: 14 }}>
            {search ? 'Ni zadetkov.' : 'Ta kategorija je prazna.'}
          </p>
        )}
        {filteredItems.map(item => {
          const inCart = cart.find(x => x.menu_item_id === item.id)
          return (
            <button key={item.id} onClick={() => { setItemModal(item); setItemQty(1); setItemNotes(''); setItemSelections({}) }}
              style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.15s', ...(inCart ? { borderColor: '#059669', borderWidth: 2 } : {}) }}>
              {item.image_url ? (
                <img src={item.image_url} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 56, height: 56, borderRadius: 10, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>🍽️</div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{getItemName(item, item.name)}</div>
                {item.description && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{getItemDesc(item, item.description)}</div>}
                {item.allergens && (() => {
                  try { const a = JSON.parse(item.allergens); return <div style={{ fontSize: 11, color: '#ef4444', marginTop: 2 }}>⚠️ {a.join(', ')}</div> } catch { return null }
                })()}
                {(item as any).calories ? <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>🔥 {(item as any).calories} kcal{((item as any).protein || (item as any).fat || (item as any).carbs) ? ` (B:${(item as any).protein || '-'}g M:${(item as any).fat || '-'}g OH:${(item as any).carbs || '-'}g)` : ''}</div> : null}
                {item.tags && (() => {
                  try { const t = JSON.parse(item.tags)
                    const colors: Record<string, string> = { vegan: '#22c55e', vegetarian: '#86efac', 'gluten-free': '#fbbf24', spicy: '#ef4444', 'chef-special': '#a855f7', local: '#3b82f6', organic: '#10b981', 'sugar-free': '#f97316', seasonal: '#ec4899', signature: '#8b5cf6' }
                    return <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>{t.map((tag: string) => <span key={tag} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8, background: colors[tag.toLowerCase()] || '#6b7280', color: '#fff', fontWeight: 600 }}>{tag}</span>)}</div>
                  } catch { return null }
                })()}
                {inCart && <div style={{ fontSize: 12, color: '#059669', fontWeight: 600, marginTop: 2 }}>V košarici: {inCart.quantity}x</div>}
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#059669', whiteSpace: 'nowrap' }}>{formatPrice(item.price)}</div>
            </button>
          )
        })}
      </div>

      {itemModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={closeItemModal}>
          <div style={{ background: '#fff', borderRadius: '16px 16px 0 0', maxWidth: 500, width: '100%', maxHeight: '85vh', overflowY: 'auto', padding: 20 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{getItemName(itemModal, itemModal.name)}</h2>
                {itemModal.description && <p style={{ color: '#64748b', fontSize: 14, margin: '4px 0 0' }}>{getItemDesc(itemModal, itemModal.description)}</p>}
                {itemModal.allergens && (() => {
                  try { const a = JSON.parse(itemModal.allergens); return <div style={{ fontSize: 12, color: '#ef4444', marginTop: 6 }}>⚠️ {a.join(', ')}</div> } catch { return null }
                })()}
                {(itemModal as any).calories ? <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>🔥 {(itemModal as any).calories} kcal{((itemModal as any).protein || (itemModal as any).fat || (itemModal as any).carbs) ? ` (B:${(itemModal as any).protein || '-'}g M:${(itemModal as any).fat || '-'}g OH:${(itemModal as any).carbs || '-'}g)` : ''}</div> : null}
              </div>
              <button onClick={closeItemModal} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ fontSize: 22, fontWeight: 700, color: '#059669', marginBottom: 16 }}>{formatPrice(itemModal.price)}</div>

            {itemModal.modifier_groups.map(group => {
              const sel = getSelectionsForGroup(group.id)
              return (
                <div key={group.id} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {group.name}
                    {group.is_required && <span style={{ color: '#ef4444', fontSize: 12 }}>*</span>}
                    <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 400 }}>
                      ({group.min_select}-{group.max_select})
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {group.options.map(opt => {
                      const selected = sel.includes(opt.id)
                      return (
                        <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: `2px solid ${selected ? '#059669' : '#e2e8f0'}`, borderRadius: 10, cursor: 'pointer', background: selected ? '#f0fdf4' : '#fff', transition: 'all 0.15s' }}>
                          <input type={group.max_select === 1 ? 'radio' : 'checkbox'} checked={selected}
                            onChange={() => toggleOption(group.id, opt.id, group.max_select)}
                            style={{ accentColor: '#059669', width: 16, height: 16 }} />
                          <span style={{ flex: 1, fontSize: 14, fontWeight: selected ? 600 : 400 }}>{opt.name}</span>
                          {opt.price_impact > 0 && <span style={{ fontSize: 13, color: '#059669', fontWeight: 600 }}>+{formatPrice(opt.price_impact)}</span>}
                          {opt.price_impact < 0 && <span style={{ fontSize: 13, color: '#ef4444', fontWeight: 600 }}>{formatPrice(opt.price_impact)}</span>}
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: '#0f172a' }}>Opomba</div>
              <textarea placeholder="Npr. brez čebule..." value={itemNotes} onChange={e => setItemNotes(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', minHeight: 60 }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #e2e8f0', borderRadius: 10, padding: '6px 10px' }}>
                <button onClick={() => setItemQty(q => Math.max(1, q - 1))} style={{ background: '#f1f5f9', border: 'none', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', fontSize: 16, fontWeight: 600 }}>−</button>
                <span style={{ fontSize: 16, fontWeight: 600, minWidth: 24, textAlign: 'center' }}>{itemQty}</span>
                <button onClick={() => setItemQty(q => q + 1)} style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', fontSize: 16, fontWeight: 600 }}>+</button>
              </div>
              <button onClick={addItemToCart} style={{ flex: 1, background: '#059669', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 20px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                Dodaj v košarico — {formatPrice((itemModal.price + Object.entries(itemSelections).flatMap(([gid, oids]) => {
                  const group = itemModal.modifier_groups.find(g => g.id === parseInt(gid))
                  return group ? group.options.filter(o => oids.includes(o.id)).reduce((s, o) => s + o.price_impact, 0) : 0
                }).reduce((s, v) => s + v, 0)) * itemQty)}
              </button>
            </div>
          </div>
        </div>
      )}

      {cart.length > 0 && (
        <>
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200, background: '#fff', borderTop: '1px solid #e2e8f0', padding: '10px 16px', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: '#64748b' }}>{itemCount} {itemCount === 1 ? 'kos' : 'kosov'}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#059669' }}>{formatPrice(itemTotal)}</div>
            </div>
            <button onClick={() => setShowCart(!showCart)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569' }}>
              {showCart ? '▲ Skrij' : '▼ Košarica'}
            </button>
            <button onClick={() => setPhase('checkout')} style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              Nadaljuj
            </button>
          </div>

          {showCart && (
            <div style={{ position: 'fixed', bottom: 64, left: 0, right: 0, zIndex: 199, background: '#fff', borderTop: '1px solid #e2e8f0', maxHeight: '50vh', overflowY: 'auto', padding: '12px 16px', boxShadow: '0 -8px 30px rgba(0,0,0,0.1)' }}>
              {cart.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{item.name}</div>
                    {item.selected_options.length > 0 && (
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>+ {item.selected_options.map(o => o.option_name).join(', ')}</div>
                    )}
                    {item.notes && <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 1 }}>📝 {item.notes}</div>}
                    <div style={{ fontSize: 13, color: '#059669', fontWeight: 600, marginTop: 2 }}>{formatPrice(item.total_price)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button onClick={() => updateCartQty(idx, -1)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>−</button>
                    <span style={{ fontSize: 14, fontWeight: 600, minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                    <button onClick={() => updateCartQty(idx, 1)} style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>+</button>
                    <button onClick={() => removeCartItem(idx)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16, color: '#ef4444', padding: 4 }}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {phase === 'checkout' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setPhase('menu')}>
          <div style={{ background: '#fff', borderRadius: '16px 16px 0 0', maxWidth: 500, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Potrdi naročilo</h2>
              <button onClick={() => setPhase('menu')} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Način prevzema</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setOrderType('takeaway')} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `2px solid ${orderType === 'takeaway' ? '#059669' : '#e2e8f0'}`, background: orderType === 'takeaway' ? '#f0fdf4' : '#fff', cursor: 'pointer', fontSize: 14, fontWeight: orderType === 'takeaway' ? 600 : 400 }}>🥡 Za sabo</button>
                <button onClick={() => setOrderType('delivery')} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `2px solid ${orderType === 'delivery' ? '#059669' : '#e2e8f0'}`, background: orderType === 'delivery' ? '#f0fdf4' : '#fff', cursor: 'pointer', fontSize: 14, fontWeight: orderType === 'delivery' ? 600 : 400 }}>🛵 Dostava</button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              <input className="oo-input" placeholder="Ime *" value={checkout.name} onChange={e => setCheckout({ ...checkout, name: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
              <input className="oo-input" placeholder="Telefon" value={checkout.phone} onChange={e => setCheckout({ ...checkout, phone: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
              <input className="oo-input" placeholder="E-pošta" type="email" value={checkout.email} onChange={e => setCheckout({ ...checkout, email: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
              {orderType === 'delivery' && (
                <input className="oo-input" placeholder="Naslov dostave *" value={checkout.address} onChange={e => setCheckout({ ...checkout, address: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
              )}
              <textarea placeholder="Dodatna navodila..." value={checkout.notes} onChange={e => setCheckout({ ...checkout, notes: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', minHeight: 60 }} />
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: '#0f172a' }}>Pregled naročila</div>
              {cart.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', color: '#475569' }}>
                  <span>{item.quantity}x {item.name}{item.selected_options.length > 0 ? ' (+' + item.selected_options.map(o => o.option_name).join(', ') + ')' : ''}</span>
                  <span style={{ fontWeight: 600 }}>{formatPrice(item.total_price)}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, color: '#059669' }}>
                <span>Skupaj</span>
                <span>{formatPrice(itemTotal)}</span>
              </div>
            </div>

            <button onClick={placeOrder} disabled={submitting || !checkout.name || (orderType === 'delivery' && !checkout.address)}
              style={{ width: '100%', padding: '14px', background: submitting ? '#94a3b8' : '#059669', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
              {submitting ? 'Oddajanje...' : `Oddaj naročilo | ${formatPrice(itemTotal)}`}
            </button>
          </div>
        </div>
      )}

      {showProfile && (
        <CustomerProfile
          token={customerToken}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  )
}
