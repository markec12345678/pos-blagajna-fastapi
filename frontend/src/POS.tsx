import { useState, useEffect, useRef } from 'react'
import type { Category, TableData, CartItem, SelectedModifier, ModifierGroup, Customer } from './types'
import * as api from './api'
import PaymentDialog from './PaymentDialog'
import { printReceipt, printKitchenOrder } from './PrintService'
import { useTranslation, getItemName } from './i18n'
import { useWebSocket } from './useWebSocket'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'
import { fuzzySearch } from './fuzzySearch'
import { PromptDialog } from './PromptDialog'
import { AISearchPanel, AIComboPanel } from './AIPanels'

function ModifierDialog({ itemId, itemName, onConfirm, onClose }: {
  itemId: number; itemName: string;
  onConfirm: (mods: SelectedModifier[], totalImpact: number) => void;
  onClose: () => void
}) {
  const [groups, setGroups] = useState<ModifierGroup[]>([])
  const [selected, setSelected] = useState<Record<number, number[]>>({})
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    api.getModifiersForItem(itemId).then(g => {
      setGroups(g)
      const init: Record<number, number[]> = {}
      g.forEach(gr => { init[gr.id] = [] })
      setSelected(init)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [itemId])
  if (loading) return null
  if (!groups.length) { onConfirm([], 0); return null }
  const toggle = (gid: number, oid: number) => {
    setSelected(prev => {
      const cur = [...(prev[gid] || [])]
      const group = groups.find(g => g.id === gid)
      const idx = cur.indexOf(oid)
      if (idx >= 0) cur.splice(idx, 1)
      else if (group && cur.length < group.max_select) cur.push(oid)
      return { ...prev, [gid]: cur }
    })
  }
  const confirm = () => {
    const mods: SelectedModifier[] = []
    let impact = 0
    groups.forEach(g => {
      (selected[g.id] || []).forEach(oid => {
        const opt = g.options.find(o => o.id === oid)
        if (opt) {
          mods.push({ group_id: g.id, group_name: g.name, option_id: oid, option_name: opt.name, price_impact: opt.price_impact })
          impact += opt.price_impact
        }
      })
    })
    onConfirm(mods, impact)
  }
  const canConfirm = groups.every(g => !g.is_required || (selected[g.id]?.length || 0) >= g.min_select)
  return (
    <div className="overlay">
      <div className="modal" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        <h3 style={{ marginBottom: 16 }}>{itemName} — izberite dodatke</h3>
        {groups.map(g => (
          <div key={g.id} style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              {g.name}
              {g.is_required && <span style={{ color: 'var(--red)', fontSize: 12, marginLeft: 6 }}>(obvezno)</span>}
              <span style={{ fontSize: 12, color: 'var(--text2)', marginLeft: 6 }}>(max {g.max_select})</span>
            </div>
            {g.options.map(o => {
              const sel = (selected[g.id] || []).includes(o.id)
              return (
                <label key={o.id} className={`modifier-option ${sel ? 'selected' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', marginBottom: 4, borderRadius: 6, cursor: 'pointer', gap: 8, background: sel ? 'var(--primary-light, #d1fae5)' : 'var(--surface2, #f5f5f5)' }}>
                   <input type="checkbox" checked={sel} onChange={() => toggle(g.id, o.id)} aria-label={o.name} />
                  <span style={{ flex: 1 }}>{o.name}</span>
                  {o.price_impact > 0 && <span style={{ color: 'var(--green)' }}>+{o.price_impact.toFixed(2)} €</span>}
                </label>
              )
            })}
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
          <button onClick={onClose} className="btn btn-ghost">Nazaj</button>
          <button onClick={confirm} className="btn btn-primary" disabled={!canConfirm}>Potrdi</button>
        </div>
      </div>
    </div>
  )
}

const NOTES_PRESETS: Record<string, string[]> = {
  'Pizza': ['Ekstra sir', 'Gluten-free testo', 'Dobro pečeno', 'Brez sira', 'Brez omake'],
  'Salad': ['Brez krutonov', 'Brez sira', 'Dodaten preliv', 'Brez čebule'],
  'Steak': ['Medium rare', 'Medium', 'Well done', 'Brez priloge'],
  'Burger': ['Brez čebule', 'Brez solate', 'Dodaten sir', 'Slanina'],
  default: ['Brez dodatkov', 'Dodatno pečeno', 'Brez začimb', 'Na strani']
}

function NoteDialog({ itemName, categoryName, onConfirm, onClose }: {
  itemName: string; categoryName: string;
  onConfirm: (note: string) => void; onClose: () => void
}) {
  const [note, setNote] = useState('')
  const presets = NOTES_PRESETS[categoryName] || NOTES_PRESETS['default']
  return (
    <div className="overlay">
      <div className="modal" style={{ width: 360 }}>
        <h3 style={{ marginBottom: 12 }}>Opomba za "{itemName}"</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {presets.map(p => (
            <button key={p} onClick={() => {
              const cur = note ? note + ', ' : ''
              if (note.includes(p)) setNote(note.replace(`, ${p}`, '').replace(p, '').replace(', , ', ', ').trim())
              else setNote(cur + p)
            }} className={`btn btn-sm ${note.includes(p) ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: 12 }}>{p}</button>
          ))}
        </div>
        <input className="input" placeholder="Prosto besedilo..." value={note} onChange={e => setNote(e.target.value)} aria-label="Opomba za artikel" />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
          <button onClick={onClose} className="btn btn-ghost">Brez</button>
          <button onClick={() => onConfirm(note)} className="btn btn-primary">Potrdi</button>
        </div>
      </div>
    </div>
  )
}

function CustomerDetailModal({ customerId, onClose, onNotifyParent, onEnroll }: { customerId: number; onClose: () => void; onNotifyParent: (msg: string) => void; onEnroll: (c: any) => void }) {
  const [data, setData] = useState<any>(null)
  useEffect(() => { api.getCustomerHistory(customerId).then(setData).catch(() => {}) }, [customerId])
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, maxHeight: '80vh', overflow: 'auto' }}>
        {!data ? (
          <p style={{ textAlign: 'center', padding: 20, color: 'var(--text2)' }}>Nalaganje...</p>
        ) : (
          <>
            <h3 style={{ marginBottom: 8 }}>{data.customer.name}</h3>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16, fontSize: 13 }}>
              {data.customer.phone && <span>📞 {data.customer.phone}</span>}
              {data.customer.email && <span>✉️ {data.customer.email}</span>}
              {data.customer.address && <span>📍 {data.customer.address}</span>}
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <div className="card" style={{ padding: '8px 16', flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{data.customer.total_spent}€</div>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>Skupaj porabljeno</div>
              </div>
              <div className="card" style={{ padding: '8px 16', flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{data.customer.loyalty_points}</div>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>Zvestobne točke</div>
              </div>
              {!data.customer.is_member && (
                <div className="card" style={{ padding: '8px 16', flex: 1, textAlign: 'center', cursor: 'pointer', border: '1px dashed var(--gold)' }} onClick={async () => {
                  await fetch(`/api/v1/loyalty/enroll/${data.customer.id}`, { method: 'POST', headers: api.authHeader() })
                  onNotifyParent('✅ Stranka vpisana v loyalty program!')
                  onEnroll({ ...data.customer, is_member: true, loyalty_points: (data.customer.loyalty_points || 0) + 50 })
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold)' }}>➕ Vpiši v</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold)' }}>Loyalty</div>
                </div>
              )}
              <div className="card" style={{ padding: '8px 16', flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{data.order_count}</div>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>Naročil</div>
              </div>
            </div>

            {data.favorite_items.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>⭐ Najpogostejši artikli</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {data.favorite_items.map((f: any, i: number) => (
                    <span key={i} className="badge badge-blue">{f.name} ×{f.count}</span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>📋 Zgodovina naročil</div>
              {data.orders.length === 0 ? (
                <p style={{ color: 'var(--text2)', fontSize: 13 }}>Ni zaključenih naročil</p>
              ) : (
                data.orders.slice(0, 10).map((o: any) => (
                  <div key={o.id} className="item-row" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <div className="item-info">
                      <span style={{ fontWeight: 600 }}>#{o.id} — {o.total}€</span>
                      <span style={{ color: 'var(--text2)', fontSize: 12 }}>
                        {o.closed_at ? new Date(o.closed_at).toLocaleDateString('sl-SI', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                        {' • '}{o.item_count} art.
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
        <button onClick={onClose} className="btn btn-ghost" style={{ marginTop: 12 }}>Zapri</button>
      </div>
    </div>
  )
}

function CustomerSearch({ onSelect, onClose, onNotify, onEnroll }: { onSelect: (c: Customer) => void; onClose: () => void; onNotify: (msg: string) => void; onEnroll: (c: any) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Customer[]>([])
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newAddr, setNewAddr] = useState('')
  const [detailCustId, setDetailCustId] = useState<number | null>(null)
  useEffect(() => {
    if (query.length >= 2) api.searchCustomers(query).then(d => setResults(d.items || []))
    else setResults([])
  }, [query])
  const createAndSelect = async () => {
    if (!newName) return
    if (newPhone && newPhone.replace(/\D/g, '').length < 5) { onNotify('Telefonska številka mora imeti vsaj 5 številk'); return }
    const c = await api.createCustomer({ name: newName, phone: newPhone, address: newAddr })
    onSelect({ id: c.id, name: c.name, phone: newPhone, address: newAddr, email: '', notes: '', tags: '', created_at: '' })
  }
  return (
    <div className="overlay">
      {detailCustId && <CustomerDetailModal customerId={detailCustId} onClose={() => setDetailCustId(null)} onNotifyParent={onNotify} onEnroll={onEnroll} />}
      <div className="modal">
        <h3 style={{ marginBottom: 12 }}>Iskanje stranke</h3>
        {!showNew ? (
          <>
            <input className="input" placeholder="Vpiši ime ali telefon..." value={query} onChange={e => setQuery(e.target.value)} aria-label="Iskanje stranke" autoFocus />
            {results.map(c => (
              <div key={c.id} className="customer-row" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div onClick={() => onSelect(c)} style={{ flex: 1, cursor: 'pointer' }}>
                  <div style={{ fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)' }}>{c.phone}{c.address ? ` - ${c.address}` : ''}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setDetailCustId(c.id) }} className="btn btn-xs btn-ghost" title="Zgodovina" aria-label={`Zgodovina stranke ${c.name}`}>📋</button>
              </div>
            ))}
            <button onClick={() => setShowNew(true)} className="btn btn-sm btn-blue" style={{ marginTop: 8 }}>+ Nova stranka</button>
          </>
        ) : (
          <>
            <input className="input" placeholder="Ime" value={newName} onChange={e => setNewName(e.target.value)} aria-label="Ime nove stranke" />
            <input className="input" placeholder="Telefon" value={newPhone} onChange={e => setNewPhone(e.target.value)} aria-label="Telefon nove stranke" style={{ marginTop: 8 }} />
            <input className="input" placeholder="Naslov" value={newAddr} onChange={e => setNewAddr(e.target.value)} aria-label="Naslov nove stranke" style={{ marginTop: 8 }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={() => setShowNew(false)} className="btn btn-ghost">Nazaj</button>
              <button onClick={createAndSelect} className="btn btn-primary" disabled={!newName}>Ustvari</button>
            </div>
          </>
        )}
        <button onClick={onClose} className="btn btn-ghost" style={{ marginTop: 8 }}>Zapri</button>
      </div>
    </div>
  )
}

export default function POS({ onNotify }: { onNotify: (msg: string) => void }) {
  const { t } = useTranslation()
  const [menu, setMenu] = useState<Category[]>([])
  const [tables, setTables] = useState<TableData[]>([])
  const [cat, setCat] = useState<number | null>(null)
  const [courseFilter, setCourseFilter] = useState<number | null>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [selTable, setSelTable] = useState<TableData | null>(null)
  const [orderId, setOrderId] = useState<number | null>(null)
  const [orderHeld, setOrderHeld] = useState(false)
  const [orderType, setOrderType] = useState('dine-in')
  const [items, setItems] = useState<any[]>([])
  const [discount, setDiscount] = useState<any>(null)
  const [taxRate, setTaxRate] = useState(0)
  const [cart, setCart] = useState<CartItem[]>([])
  const [guest, setGuest] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [pay, setPay] = useState(false)
  const [modDialog, setModDialog] = useState<{ id: number; name: string; price: number } | null>(null)
  const [noteDialog, setNoteDialog] = useState<{ item: { id: number; name: string; price: number }; mods: SelectedModifier[]; modImpact: number; catName: string } | null>(null)
  const [showCust, setShowCust] = useState(false)
  const [showClosed, setShowClosed] = useState(false)
  const [closedOrders, setClosedOrders] = useState<any[]>([])
  const [pluInput, setPluInput] = useState('')
  const [orderTags, setOrderTags] = useState<{ name: string; color: string }[]>([])
  const [orderCurrentTags, setOrderCurrentTags] = useState<string[]>([])
  const [pluFeedback, setPluFeedback] = useState('')
  const [moveMode, setMoveMode] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set())
  const [showMoveDialog, setShowMoveDialog] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [numpadIdx, setNumpadIdx] = useState<number | null>(null)
  const [numpadVal, setNumpadVal] = useState('')
  const [modal, setModal] = useState<{ type: string; data?: any } | null>(null)
  const [showAISearch, setShowAISearch] = useState(false)
  const [showAICombo, setShowAICombo] = useState(false)
  const [oosContext, setOosContext] = useState<{ itemId: number; name: string } | null>(null)
  const [showTransfer, setShowTransfer] = useState(false)
  const [splitPayMode, setSplitPayMode] = useState(false)
  const [splitSelected, setSplitSelected] = useState<Set<number>>(new Set())
  const searchRef = useRef<HTMLInputElement>(null)
  const orderTypes = ['dine-in', 'takeaway', 'delivery']

  useKeyboardShortcuts({
    'F1': () => searchRef.current?.focus(),
    'F2': () => {
      if (!orderId) {
        const idx = orderTypes.indexOf(orderType)
        setOrderType(orderTypes[(idx + 1) % orderTypes.length])
      }
    },
    'F3': () => { if (selTable) setShowCust(true) },
    'F4': () => { if (orderId) printReceipt(items.length ? { id: orderId, items, total, customer_name: guest, table_name: selTable?.name } : { id: orderId, items, total, customer_name: guest }, selTable?.name || '', taxRate) },
    'F5': () => { if (orderId) printKitchenOrder({ id: orderId, items, customer_name: guest, order_type: orderType }, selTable?.name || '') },
    'F9': () => { if (orderId && !orderHeld) setPay(true) },
    'F10': () => {
      if (orderId) {
        fetch(`/api/v1/orders/${orderId}/hold`, { method: 'POST', headers: api.authHeader() }).then(() => {
          setOrderId(null); setItems([]); setDiscount(null); setSelTable(null); onNotify('Naročilo zadržano'); load()
        })
      }
    },
    'Enter': () => { if (!orderId && cart.length && selTable) submit() },
    'Escape': () => {
      if (showShortcuts) setShowShortcuts(false)
      else if (showAISearch) setShowAISearch(false)
      else if (showAICombo) setShowAICombo(false)
      else if (pay) setPay(false)
      else if (showCust) setShowCust(false)
      else if (modDialog) setModDialog(null)
      else if (noteDialog) setNoteDialog(null)
      else cancel()
    },
    'F6': () => { if (cart.length) setShowAICombo(true) },
    'F7': () => { setShowAISearch(true) },
    'F12': () => { setCart([]); setOrderId(null); setOrderHeld(false); setItems([]); setSelTable(null); setCustomer(null); load() },
    '?': () => setShowShortcuts(s => !s),
  })

  const load = () => { api.getMenu().then(setMenu); api.getTables().then(setTables); api.getCourses().then(setCourses).catch(() => {}) }
  useEffect(() => { load(); fetch('/api/v1/settings', { headers: api.authHeader() }).then(r => r.json()).then(s => { setTaxRate(parseFloat(s.tax_rate) || 0); try { const tags = JSON.parse(s.order_tags || '[]'); setOrderTags(Array.isArray(tags) ? tags : []) } catch {} }).catch(() => {}) }, [])
  useWebSocket((evt) => {
    if (['order_created', 'order_closed', 'item_status'].includes(evt.event)) {
      api.getTables().then(setTables)
    }
  })

  useEffect(() => {
    if (pay && orderId && !discount) {
      const cartItems = items.map(i => ({ menu_item_id: i.menu_item_id, quantity: i.quantity, price: i.unit_price, total: i.total_price }))
      api.calculatePromotion(cartItems, items.reduce((s: number, i: any) => s + i.total_price, 0)).then(best => {
        if (best && best.amount > 0) onNotify(`🎉 Samodejen popust: ${best.name} — ${best.amount.toFixed(2)} €`)
      }).catch(() => {})
    }
  }, [pay])

  const total = orderId ? items.reduce((s: number, i: any) => s + i.total_price, 0) - (discount?.discount_amount || 0) : cart.reduce((s, c) => {
    const modImpact = (c.modifiers || []).reduce((ms, m) => ms + m.price_impact, 0)
    return s + (c.price + modImpact) * c.quantity
  }, 0)

  const calcItemPrice = (item: { price: number }, mods?: SelectedModifier[]) => {
    return item.price + (mods || []).reduce((s, m) => s + m.price_impact, 0)
  }

  const pickTable = async (t: TableData) => {
    setSelTable(t); setCart([]); setOrderId(null); setOrderHeld(false); setItems([]); setDiscount(null); setGuest(''); setCustomer(null); setOrderType('dine-in'); setOrderNotes(''); setOrderCurrentTags([])
    if (t.status === 'occupied') {
      try { const o = await api.getOrderByTable(t.id); setOrderId(o.id); setItems(o.items); setDiscount(o.discount_amount > 0 ? o : null); setGuest(o.customer_name || ''); setOrderNotes(o.notes || ''); try { setOrderCurrentTags(JSON.parse(o.tags || '[]')) } catch {} } catch {}
    } else {
      try { const o = await api.getHeldOrder(t.id); setOrderId(o.id); setOrderHeld(true); setItems(o.items); setDiscount(o.discount_amount > 0 ? o : null); setGuest(o.customer_name || ''); setOrderNotes(o.notes || ''); try { setOrderCurrentTags(JSON.parse(o.tags || '[]')) } catch {} } catch {}
    }
  }

  const getPrice = (item: any) => item.combo_price || item.price

  const addItem = async (item: { id: number; name: string; price: number; combo_price?: number | null }) => {
    const mods = await api.getModifiersForItem(item.id).catch(() => [])
    if (mods.length > 0) {
      setModDialog({ id: item.id, name: item.name, price: getPrice(item) })
      return
    }
    doAddItem(item, [], 0)
    api.checkItemStock(item.id).then(r => {
      if (r.has_warnings) {
        const critical = r.warnings.filter((w: any) => w.critical)
        const low = r.warnings.filter((w: any) => !w.critical)
        if (critical.length) onNotify(`⚠️ NI ZALOGE: ${critical.map((w: any) => w.name).join(', ')}`)
        else if (low.length) onNotify(`⚠️ Nizka zaloga: ${low.map((w: any) => `${w.name} (${w.remaining.toFixed(1)})`).join(', ')}`)
      }
    }).catch(() => {})
  }

  const doAddItem = (item: { id: number; name: string; price: number; combo_price?: number | null }, mods: SelectedModifier[], modImpact: number) => {
    const basePrice = getPrice(item)
    const price = basePrice + modImpact
    if (orderId) {
      setNoteDialog({ item, mods, modImpact, catName: '' })
      return
    }
    setCart(c => {
      const key = JSON.stringify(mods.map(m => m.option_id).sort())
      const e = c.find(x => x.menu_item_id === item.id && JSON.stringify((x.modifiers || []).map(m => m.option_id).sort()) === key)
      if (e) return c.map(x => x === e ? { ...x, quantity: x.quantity + 1 } : x)
      return [...c, { menu_item_id: item.id, name: item.name, price: item.price, quantity: 1, modifiers: mods }]
    })
  }

  const confirmNote = async (notes: string) => {
    if (!noteDialog) return
    const { item, mods, modImpact } = noteDialog
    const modStr = JSON.stringify(mods.map(m => ({ group_id: m.group_id, option_id: m.option_id, option_name: m.option_name, price_impact: m.price_impact })))
    try {
      await api.addOrderItem(orderId!, item.id, 1, modStr, notes)
      const o = await api.getOrder(orderId!)
      setItems(o.items); load()
    } catch (e: any) { onNotify(e.message) }
    setNoteDialog(null)
  }

  const remItem = (id: number) => setCart(c => { const e = c.find(x => x.menu_item_id === id); return e && e.quantity > 1 ? c.map(x => x.menu_item_id === id ? { ...x, quantity: x.quantity - 1 } : x) : c.filter(x => x.menu_item_id !== id) })

  const submit = async () => {
    if (!selTable || !cart.length) return
    try {
      const payload = cart.map(c => ({
        menu_item_id: c.menu_item_id,
        quantity: c.quantity,
        modifiers: JSON.stringify((c.modifiers || []).map(m => ({ group_id: m.group_id, option_id: m.option_id, option_name: m.option_name, price_impact: m.price_impact }))),
      }))
      const o = await api.createOrder(selTable.id, guest || null, payload, orderType, customer?.id, undefined, orderNotes)
      setOrderId(o.id); setItems(o.items); setDiscount(null); setCart([]); onNotify(`Naročilo #${o.id} potrjeno`); load()
    } catch (e: any) { onNotify(e.message) }
  }

  const doPay = async (method: string, tip: number = 0, payAmount?: number) => {
    if (!orderId) return
    try {
      const o = await api.getOrder(orderId)
      let amount = payAmount !== undefined ? payAmount : o.total
      let earnedPts = 0
      if (splitPayMode && splitSelected.size > 0) {
        const selectedItems = items.filter((i: any) => splitSelected.has(i.id))
        amount = selectedItems.reduce((s: number, i: any) => s + i.total_price, 0)
        earnedPts = customer?.is_member ? Math.floor(amount) : 0
      } else {
        earnedPts = customer?.is_member ? Math.floor(o.total) : 0
      }
      await api.makePayment(orderId, Math.round(amount * 100) / 100, method, tip)
      setPay(false)
      setSplitPayMode(false); setSplitSelected(new Set())
      const msg = `Plačano (${method}): ${amount.toFixed(2)} €${tip > 0 ? ` + ${tip.toFixed(2)}€ napitnina` : ''}${earnedPts > 0 ? ` | +${earnedPts} točk ⭐` : ''}`
      onNotify(msg)
      // Prompt to send receipt
      if (customer?.email || guest) {
        setModal({ type: 'email-receipt', data: { orderId, email: customer?.email || '', afterPayment: true } })
      } else {
        setOrderId(null); setItems([]); setSelTable(null); setCustomer(null); load()
      }
    } catch (e: any) { onNotify(e.message) }
  }

  const cancel = () => { setCart([]); setOrderId(null); setOrderHeld(false); setItems([]); setSelTable(null); setCustomer(null); load() }

  const toggle86 = async (itemId: number) => {
    try {
      const r = await api.toggleItem86(itemId)
      setMenu(prev => prev.map(c => ({
        ...c,
        items: c.items.map(i => i.id === itemId ? { ...i, is_out_of_stock: r.is_out_of_stock } : i)
      })))
      onNotify(r.is_out_of_stock ? `🚫 ${r.name} — 86 (ni na voljo)` : `✅ ${r.name} — nazaj na voljo`)
      setOosContext(null)
    } catch (e: any) { onNotify(e.message) }
  }

  const doTransfer = async (targetTableId: number) => {
    if (!orderId) return
    try {
      const r = await api.transferOrder(orderId, targetTableId)
      onNotify(`➡️ Naročilo preneseno: ${r.old_table} → ${r.new_table}`)
      setShowTransfer(false)
      const t = tables.find(tb => tb.id === targetTableId)
      if (t) pickTable(t)
    } catch (e: any) { onNotify(e.message) }
  }

  const loadClosedOrders = async () => {
    try { const o = await api.getRecentOrders(20); setClosedOrders(o); setShowClosed(true) } catch { onNotify(t('error')) }
  }

  const openClosedOrders = () => {
    loadClosedOrders()
  }

  return (
    <div className="layout">
      {oosContext && (
        <div className="overlay" onClick={() => setOosContext(null)}>
          <div className="modal" style={{ width: 320 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 12 }}>🚫 86 — {oosContext.name}</h3>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
              Ali želite artikel označiti kot {menu.flatMap(c => c.items).find(i => i.id === oosContext.itemId)?.is_out_of_stock ? 'na voljo' : 'ni na voljo'}?
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setOosContext(null)} className="btn btn-ghost">Prekliči</button>
              <button onClick={() => toggle86(oosContext.itemId)} className="btn btn-danger">
                {menu.flatMap(c => c.items).find(i => i.id === oosContext.itemId)?.is_out_of_stock ? '✅ Nazaj na voljo' : '🚫 86 — Ni na voljo'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showTransfer && orderId && (
        <div className="overlay" onClick={() => setShowTransfer(false)}>
          <div className="modal" style={{ width: 360 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 12 }}>➡️ Prenos na drugo mizo</h3>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>
              Trenutna miza: <strong>{selTable?.name}</strong> — izberite ciljno mizo:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
              {tables.filter(t => t.id !== selTable?.id).map(t => (
                <button key={t.id} onClick={() => doTransfer(t.id)}
                  className={`btn ${t.status === 'free' ? 'btn-primary' : 'btn-ghost'}`}
                  disabled={t.status !== 'free'}
                  style={{ padding: '10px 8px', fontSize: 13, textAlign: 'center' }}>
                  {t.name}
                  {t.status !== 'free' && <div style={{ fontSize: 10, color: 'var(--red)' }}>zasedeno</div>}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button onClick={() => setShowTransfer(false)} className="btn btn-ghost">Prekliči</button>
            </div>
          </div>
        </div>
      )}
      {modDialog && (
        <ModifierDialog
          itemId={modDialog.id}
          itemName={modDialog.name}
          onConfirm={(mods, impact) => { doAddItem(modDialog, mods, impact); setModDialog(null) }}
          onClose={() => setModDialog(null)}
        />
      )}
      {noteDialog && (
        <NoteDialog
          itemName={noteDialog.item.name}
          categoryName={noteDialog.catName}
          onConfirm={(note) => confirmNote(note)}
          onClose={() => setNoteDialog(null)}
        />
      )}
      {showCust && (
        <CustomerSearch
          onSelect={(c) => { setCustomer(c); setGuest(c.name); setShowCust(false) }}
          onClose={() => setShowCust(false)}
          onNotify={onNotify}
          onEnroll={(c) => { setCustomer(c); setGuest(c.name) }}
        />
      )}

      <div className="sidebar pos-sidebar">
        <h3>{t('pos.table')}</h3>
        <div className="floor-plan">
          {tables.map(t => {
            const st = t.status === 'free' ? 'free' : 'occupied'
            const sel = selTable?.id === t.id
            return (
              <div key={t.id} className="table-wrapper" style={{ position: 'absolute', left: t.pos_x, top: t.pos_y }}>
                <div onClick={() => pickTable(t)}
                  className={`table-dot ${t.shape} ${st} ${sel ? 'selected' : ''}`}>
                  {t.name.replace('Miza ', '')}
                </div>
                <div className="table-label">{t.name}</div>
                {t.status !== 'free' && t.occupied_minutes ? (
                  <div className="table-occupied-since" style={{ fontSize: 9, color: 'var(--orange)', textAlign: 'center', marginTop: 1 }}>
                    {Math.floor(t.occupied_minutes / 60)}h{t.occupied_minutes % 60}m
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
        <button onClick={openClosedOrders} className="btn btn-sm btn-ghost" style={{ marginTop: 8, width: '100%' }}>
          🕐 Zadnja naročila
        </button>
      </div>

        <div className="main" role="region" aria-label="Meni in iskanje">
          <div style={{ position: 'relative', display: 'flex', gap: 8, marginBottom: 8 }}>
            <input ref={searchRef} className="input" placeholder="🔍 PLU koda / iskanje..." value={pluInput}
              onChange={e => setPluInput(e.target.value)}
              aria-label="Iskanje po PLU kodi" style={{ flex: 1, fontSize: 13 }} />
            {pluInput.length >= 2 && (
              <div className="search-dropdown" style={{
                position: 'absolute', top: 36, left: 0, right: 0, background: 'var(--surface)',
                border: '1px solid var(--border)', borderRadius: 8, maxHeight: 200, overflowY: 'auto',
                zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}>
                {(() => {
                  const all = menu.flatMap(c => c.items).filter(i => i.is_active && !i.is_out_of_stock)
                  const matches = fuzzySearch(all, pluInput, 8)
                  if (!matches.length) return <div style={{ padding: 12, color: 'var(--text2)' }}>Ni zadetkov</div>
                  return matches.map(item => (
                    <div key={item.id} onClick={() => { if (selTable) addItem(item); setPluInput(''); setPluFeedback(`✅ ${getItemName(item, item.name)}`); setTimeout(() => setPluFeedback(''), 1500) }}
                      style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>
                        {getItemName(item, item.name)}
                        {item.matchType === 'fuzzy' && <span style={{ fontSize: 10, color: 'var(--text2)', marginLeft: 6 }}>(približno)</span>}
                      </span>
                      <span style={{ color: 'var(--green)', fontWeight: 600 }}>{(item.combo_price || item.price).toFixed(2)} €</span>
                    </div>
                  ))
                })()}
              </div>
            )}
          </div>
          {pluFeedback && <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>{pluFeedback}</div>}
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setCat(null)} className={`cat-btn ${!cat ? 'active' : ''}`}>{t('pos.all')}</button>
          {menu.map(c => (
            <button key={c.id} onClick={() => setCat(c.id)} className={`cat-btn ${cat === c.id ? 'active' : ''}`}>{c.name}</button>
          ))}
        </div>
        {courses.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            <button onClick={() => setCourseFilter(null)} className={`btn btn-xs ${!courseFilter ? 'btn-primary' : 'btn-ghost'}`}>Vse</button>
            {courses.map(c => (
              <button key={c.id} onClick={() => setCourseFilter(c.id)} className={`btn btn-xs ${courseFilter === c.id ? 'btn-primary' : 'btn-ghost'}`}>{c.name}</button>
            ))}
          </div>
        )}
        {!cat && (
          <div className="fav-bar">
            {menu.flatMap(c => c.items).filter(i => i.is_active && i.is_favorite).map(item => (
              <button key={item.id} onClick={() => selTable && addItem(item)}
                className="btn btn-sm fav-btn" disabled={!selTable}>
                ⭐ {getItemName(item, item.name)} {item.price.toFixed(2)} €
              </button>
            ))}
          </div>
        )}
        <div className="menu-grid">
          {(cat ? menu.find(c => c.id === cat)?.items || [] : menu.flatMap(c => c.items)).filter(i => i.is_active).filter(i => !courseFilter || i.course_id === courseFilter).map(item => (
            <button key={item.id} onClick={() => selTable && !item.is_out_of_stock && addItem(item)}
              onContextMenu={e => { e.preventDefault(); setOosContext({ itemId: item.id, name: getItemName(item, item.name) }) }}
              className={`menu-item ${item.is_combo ? 'is-combo' : ''} ${item.is_out_of_stock ? 'oos' : ''}`}
              disabled={!selTable || item.is_out_of_stock}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                {item.image_url && <img src={item.image_url} alt="" style={{ width: '100%', height: 60, objectFit: 'cover', borderRadius: 6, marginBottom: 4 }} />}
                {getItemName(item, item.name)}
                {item.is_out_of_stock && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--red)', fontWeight: 700 }}>🚫</span>}
              </div>
              {item.tags && (() => {
                try { const t = JSON.parse(item.tags); const colors: Record<string, string> = { vegan: '#22c55e', vegetarian: '#86efac', 'gluten-free': '#fbbf24', spicy: '#ef4444', 'chef-special': '#a855f7', local: '#3b82f6', organic: '#10b981', 'sugar-free': '#f97316', seasonal: '#ec4899', signature: '#8b5cf6' }; return <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', marginBottom: 4 }}>{t.map((tag: string) => <span key={tag} style={{ fontSize: 9, padding: '0 5px', borderRadius: 6, background: colors[tag.toLowerCase()] || '#6b7280', color: '#fff' }}>{tag}</span>)}</div> } catch { return null }
              })()}
              {item.is_combo && item.combo_price ? (
                <div style={{ fontWeight: 700 }}>
                  <span style={{ color: 'var(--orange)', textDecoration: 'line-through', marginRight: 4, fontSize: 12 }}>{item.price.toFixed(2)} €</span>
                  <span style={{ color: 'var(--green)' }}>{item.combo_price.toFixed(2)} €</span>
                </div>
              ) : (
                <div style={{ color: item.is_out_of_stock ? 'var(--red)' : 'var(--green)', fontWeight: 700 }}>{item.price.toFixed(2)} €</div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="order-panel" role="region" aria-label="Naročilo">
        {!selTable ? <p style={{ color: 'var(--text2)', textAlign: 'center', marginTop: 40 }}>Izberite mizo</p>
        : <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>{selTable.name}</h3>
            {orderId && <span className={`badge ${orderHeld ? 'badge-amber' : 'badge-blue'}`}>#{orderId}{orderHeld ? ' ⏸️' : ''}</span>}
          </div>
          {!orderId && (
            <div className="type-bar">
              {[
                { v: 'dine-in', l: `🏠 ${t('pos.dine_in')}` },
                { v: 'takeaway', l: `🛍️ ${t('pos.takeaway')}` },
                { v: 'delivery', l: `🛵 ${t('pos.delivery')}` }
              ].map(ot => (
                <button key={ot.v} onClick={() => setOrderType(ot.v)}
                  className={`btn btn-sm ${orderType === ot.v ? 'btn-primary' : 'btn-ghost'}`}>{ot.l}</button>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input className="input" placeholder="Ime gosta" value={guest} onChange={e => setGuest(e.target.value)} aria-label="Ime gosta" style={{ flex: 1 }} />
            <button onClick={() => setShowCust(true)} className="btn btn-sm btn-blue" title="Išči stranko" aria-label="Išči stranko">👤</button>
            {orderId ? (
              <button onClick={() => setShowNotes(!showNotes)} className="btn btn-sm btn-ghost" title="Opombe naročila"
                aria-label="Opombe naročila">
                {orderNotes ? '📝' : '📄'}
              </button>
            ) : (
              <button onClick={() => setShowNotes(!showNotes)} className={`btn btn-sm ${orderNotes ? 'btn-blue' : 'btn-ghost'}`} title="Dodaj opombe"
                aria-label="Dodaj opombe">
                {orderNotes ? '📝' : '📄'}
              </button>
            )}
          </div>
          {showNotes && (
            <div style={{ marginTop: 8 }}>
                <textarea className="input" placeholder="Opombe naročila (npr. rojstni dan, posebne želje...)"
                value={orderNotes} onChange={e => setOrderNotes(e.target.value)}
                aria-label="Opombe naročila" style={{ width: '100%', minHeight: 50, fontSize: 12, resize: 'vertical', padding: '6px 8px' }} />
              {orderId && (
                <button onClick={async () => {
                  await fetch(`/api/v1/orders/${orderId}/meta`, { method: 'PATCH', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: orderNotes }) });
                  onNotify('Opombe shranjene');
                }} className="btn btn-xs btn-blue mt-4">Shrani</button>
              )}
            </div>
          )}
          {orderTags.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {orderTags.map(t => {
                const active = orderCurrentTags.includes(t.name)
                return (
                  <span key={t.name} onClick={async () => {
                    if (!orderId) return
                    const newTags = active ? orderCurrentTags.filter(n => n !== t.name) : [...orderCurrentTags, t.name]
                    setOrderCurrentTags(newTags)
                    await fetch(`/api/v1/orders/${orderId}/meta`, { method: 'PATCH', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ tags: JSON.stringify(newTags) }) })
                  }} style={{
                    padding: '2px 8px', borderRadius: 12, fontSize: 11, cursor: orderId ? 'pointer' : 'default',
                    background: active ? t.color : 'transparent', color: active ? '#fff' : t.color,
                    border: `1px solid ${t.color}`, opacity: active ? 1 : 0.6,
                    fontWeight: active ? 600 : 400
                  }}>{t.name}</span>
                )
              })}
            </div>
          )}
          {customer && (
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
              📞 {customer.phone}{customer.address ? ` | ${customer.address}` : ''}
               <button onClick={() => setCustomer(null)} className="btn btn-sm btn-ghost" style={{ marginLeft: 8, fontSize: 11 }} aria-label="Odstrani stranko">✕</button>
            </div>
          )}
          <div style={{ flex: 1, overflowY: 'auto', margin: '12px 0' }}>
            {orderId && splitPayMode && (
              <div style={{ padding: '8px 12px', background: 'var(--amber-light, #fef3c7)', borderRadius: 8, marginBottom: 8, fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>✂️ Izberite artikle za plačilo ({splitSelected.size} izbranih)</span>
                <span style={{ fontWeight: 700, color: 'var(--amber)' }}>
                  {items.filter((i: any) => splitSelected.has(i.id)).reduce((s: number, i: any) => s + i.total_price, 0).toFixed(2)} €
                </span>
              </div>
            )}
            {orderId ? items.map((i: any) => {
              let mods: { option_name: string; price_impact: number }[] = []
              try { if (i.modifiers) mods = JSON.parse(i.modifiers) } catch {}
              return (
              <div key={i.id} className="cart-item">
                {splitPayMode && i.menu_item_id !== 0 && (
                  <input type="checkbox" checked={splitSelected.has(i.id)}
                    onChange={e => setSplitSelected(prev => {
                      const next = new Set(prev)
                      if (e.target.checked) next.add(i.id); else next.delete(i.id)
                      return next
                    })}
                    style={{ marginRight: 8, accentColor: 'var(--amber)' }}
                    aria-label={`Izberi: ${i.item_name}`} />
                )}
                <div style={{ flex: 1 }}>
                  <div className="cart-item-name">{i.item_name}</div>
                  <div className="cart-item-meta">{i.quantity}x {i.unit_price.toFixed(2)} €
                    {i.notes && <span className="cart-item-notes">📝 {i.notes}</span>}
                  </div>
                  {mods.length > 0 && (
                    <div className="cart-item-mods" style={{ fontSize: 11, color: 'var(--text2)' }}>
                      {mods.map((m, idx) => <span key={idx}>+ {m.option_name}{m.price_impact > 0 ? ` (+${m.price_impact.toFixed(2)}€)` : ''}</span>).reduce((p: any, c: any) => [p, ', ', c] as any)}
                    </div>
                  )}
                </div>
                <div className="cart-item-actions">
                  <span className="cart-item-total">{i.total_price.toFixed(2)} €</span>
                  {i.menu_item_id !== 0 && (
                    <>
                       <button onClick={() => setModal({ type: 'item-qty', data: { itemId: i.id, itemName: i.item_name, quantity: i.quantity } })} className="qty-btn" title="Uredi" aria-label={`Uredi količino: ${i.item_name}`}>✏️</button>
                      <button onClick={() => setModal({ type: 'item-remove', data: { itemId: i.id, itemName: i.item_name } })} className="qty-btn" style={{ color: 'var(--red)' }} title="Odstrani" aria-label={`Odstrani: ${i.item_name}`}>✕</button>
                    </>
                  )}
                </div>
              </div>
            )}) : cart.length ? cart.map((c, idx) => {
              const modImpact = (c.modifiers || []).reduce((s, m) => s + m.price_impact, 0)
              const unitPrice = c.price + modImpact
              return (
              <div key={idx} className="cart-item">
                <div>
                  <div className="cart-item-name">{c.name}</div>
                  <div className="cart-item-meta">{(unitPrice * c.quantity).toFixed(2)} € / kos {unitPrice.toFixed(2)} €</div>
                  {(c.modifiers || []).length > 0 && (
                    <div className="cart-item-mods" style={{ fontSize: 11, color: 'var(--text2)' }}>
                      {c.modifiers!.map((m, mi) => <span key={mi}>+ {m.option_name}{m.price_impact > 0 ? ` (+${m.price_impact.toFixed(2)}€)` : ''}</span>).reduce((p: any, c: any) => [p, ', ', c] as any)}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                   <button onClick={() => {
                    const cur = cart[idx]
                    if (cur.quantity > 1) {
                      const newCart = [...cart]
                      newCart[idx] = { ...cur, quantity: cur.quantity - 1 }
                      setCart(newCart)
                    } else {
                      setCart(cart.filter((_, i) => i !== idx))
                    }
                  }} className="qty-btn" aria-label={`Zmanjšaj količino: ${c.name}`}>−</button>
                  <span onClick={() => { setNumpadIdx(idx); setNumpadVal(String(c.quantity)) }}
                    style={{ cursor: 'pointer', minWidth: 28, textAlign: 'center', fontWeight: 600, borderBottom: '1px dashed var(--text2)', padding: '0 4px' }}
                    title="Klikni za vnos količine">{c.quantity}</span>
                  <button onClick={() => setCart(cart.map((x, i) => i === idx ? { ...x, quantity: x.quantity + 1 } : x))} className="qty-btn" aria-label={`Povečaj količino: ${c.name}`}>+</button>
                </div>
              </div>
            )}) : <p className="cart-empty">Dodajte artikle</p>}
            {/* Cross-sell suggestions */}
            <SuggestionsPanel cart={cart} menuItems={items} quickAdd={(item) => {
              setCart(p => [...p, { menu_item_id: item.id, name: item.name, price: item.price, quantity: 1, modifiers: [], category_id: item.category_id }])
              onNotify(`Dodano: ${item.name}`)
            }} />
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <div className="order-total-row" aria-live="polite">
              <span>Skupaj:</span><span>{total.toFixed(2)} €</span>
            </div>
            {discount && discount.discount_amount > 0 ? (
              <div className="order-discount-row">
                <span>Popust ({discount.discount_type === 'percentage' ? `${discount.discount_value}%` : `${discount.discount_value.toFixed(2)} €`}):</span>
                <span>-{discount.discount_amount.toFixed(2)} €</span>
              </div>
            ) : null}
            {taxRate > 0 && !orderId && (
              <div className="order-tax-row">
                <span>DDV ({taxRate}%):</span>
                <span>+{(total * taxRate / (100 + taxRate)).toFixed(2)} €</span>
              </div>
            )}
            <div className="order-actions">
              {!orderId ? (
                <button onClick={submit} className="btn btn-primary" disabled={!cart.length}>Potrdi naročilo</button>
              ) : orderHeld ? (
                <>
                  <button onClick={async () => {
                    await fetch(`/api/v1/orders/${orderId}/unhold`, { method: 'POST', headers: api.authHeader() });
                    setOrderHeld(false); onNotify('Naročilo odprto'); load();
                  }} className="btn btn-primary">▶️ Nadaljuj naročilo</button>
                  <button onClick={cancel} className="btn btn-ghost">Zapri</button>
                </>
              ) : (
                <>
                   <button onClick={() => setPay(true)} className="btn btn-primary">Plačilo {total.toFixed(2)} €</button>
                  <button onClick={() => setModal({ type: 'service' })} className="btn btn-sm btn-purple" title="Dodaj storitev" aria-label="Dodaj storitev">💎</button>
                  <button onClick={() => setModal({ type: 'discount' })} className="btn btn-sm btn-discount" title="Popust" aria-label="Dodaj popust">🏷️</button>
                  {customer?.is_member && (customer?.loyalty_points || 0) > 0 && (
                    <button onClick={() => setModal({ type: 'loyalty', data: { customerId: customer.id, points: customer.loyalty_points || 0 } })} className="btn btn-sm btn-gold" title="Zvestobne točke" aria-label="Unovči zvestobne točke">🎁</button>
                  )}
                  <button onClick={async () => {
                    const res = await fetch('/api/v1/promotions', { headers: api.authHeader() }).then(r => r.json())
                    const active = res.filter((p: any) => p.is_active)
                    if (active.length === 0) { onNotify('Ni aktivnih promocij'); return }
                    setModal({ type: 'promotion', data: { promotions: active, orderId } })
                  }} className="btn btn-sm btn-blue" title="Promocija" aria-label="Uporabi promocijo">🏆</button>
                  <button onClick={async () => {
                    await fetch(`/api/v1/orders/${orderId}/hold`, { method: 'POST', headers: api.authHeader() });
                    setOrderId(null); setItems([]); setDiscount(null); setSelTable(null); onNotify('Naročilo zadržano'); load();
                  }} className="btn btn-sm btn-hold" title="Zadrži naročilo" aria-label="Zadrži naročilo">⏸️</button>
<button onClick={async () => {
                setMoveMode(true); setSelectedItems(new Set());
              }} className="btn btn-sm btn-ghost" title="Premakni artikle" aria-label="Premakni artikle">🔀</button>
              <button onClick={() => setModal({ type: 'split', data: { orderId, items } })} className="btn btn-sm btn-split" title="Loči račun" aria-label="Loči račun">✂️</button>
              <button onClick={() => { setSplitPayMode(!splitPayMode); setSplitSelected(new Set()) }} className={`btn btn-sm ${splitPayMode ? 'btn-primary' : 'btn-ghost'}`} title="Plačilo po artiklih" aria-label="Plačilo po artiklih">💰</button>
              <button onClick={() => setShowTransfer(true)} className="btn btn-sm btn-ghost" title="Prenesi na drugo mizo" aria-label="Prenesi naročilo">➡️</button>
                  <button onClick={() => setModal({ type: 'cancel' })} className="btn btn-sm btn-cancel" title="Prekliči naročilo" aria-label="Prekliči naročilo">🗑️</button>
                </>
              )}
              <button onClick={cancel} className="btn btn-ghost">{orderId ? 'Zapri' : 'Prekliči'}</button>
              {orderId && (
                <button onClick={async () => printReceipt(items.length ? { id: orderId, items, total, customer_name: guest, table_name: selTable?.name } : { id: orderId, items, total, customer_name: guest }, selTable?.name || '', taxRate)}
                  className="btn btn-sm btn-blue" title="Natisni račun" aria-label="Natisni račun">🧾</button>
              )}
              {orderId && (
                <button onClick={() => printKitchenOrder({ id: orderId, items, customer_name: guest, order_type: orderType }, selTable?.name || '')}
                  className="btn btn-sm btn-kitchen" title="Natisni v kuhinjo" aria-label="Natisni v kuhinjo">🍳</button>
              )}
              {orderId && selTable && selTable.status !== 'free' && (
                <button onClick={() => window.open(`/display/${selTable.id}`, '_blank')}
                  className="btn btn-sm btn-ghost" title="Zaslon za stranke" aria-label="Odpri zaslon za stranke">🖥️</button>
              )}
            </div>
            {orderId && <p className="order-tip">Klikni artikel za dodajanje</p>}
          </div>
        </>}
      </div>

      {pay && <PaymentDialog total={total} onPay={doPay} onClose={() => setPay(false)} customer={customer} />}

      {moveMode && items.length > 0 && (
        <div className="overlay" onClick={() => setMoveMode(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxHeight: '80vh', overflowY: 'auto', minWidth: 400 }}>
            <h3 style={{ marginBottom: 12 }}>🔀 Premakni artikle</h3>
            <div style={{ fontSize: 13, marginBottom: 12, color: 'var(--text2)' }}>
              Izberite artikel(e), ki jih želite premakniti na drugo mizo:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {items.map((i: any) => (
                <label key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px', background: selectedItems.has(i.id) ? 'var(--primary-light, #d1fae5)' : 'var(--surface2)', borderRadius: 6, cursor: 'pointer' }}>
                  <input type="checkbox" checked={selectedItems.has(i.id)} aria-label={`Premakni: ${i.item_name}`} onChange={e => {
                    const s = new Set(selectedItems)
                    if (e.target.checked) s.add(i.id)
                    else s.delete(i.id)
                    setSelectedItems(s)
                  }} />
                  <span style={{ flex: 1 }}>{i.item_name}</span>
                  <span style={{ color: 'var(--green)', fontWeight: 600 }}>{i.total_price.toFixed(2)} €</span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => setMoveMode(false)} className="btn btn-ghost">Prekliči</button>
              <button onClick={() => { setShowMoveDialog(true); setMoveMode(false) }} className="btn btn-primary" disabled={!selectedItems.size}>Na drugo mizo</button>
            </div>
          </div>
        </div>
      )}

      {showMoveDialog && orderId && (
        <div className="overlay" onClick={() => setShowMoveDialog(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ minWidth: 300 }}>
            <h3 style={{ marginBottom: 12 }}>🎯 Ciljna miza</h3>
            <select className="input" defaultValue="" aria-label="Ciljna miza" onChange={e => {
              const targetTableId = parseInt(e.target.value)
              if (!targetTableId) return
              const targetTable = tables.find(t => t.id === targetTableId)
              if (!targetTable) return
              api.getOrderByTable(targetTableId).then(o => {
                api.moveOrderItems(Array.from(selectedItems), o.id).then(r => {
                  onNotify(`Premaknjeno ${r.moved} artiklov na ${targetTable.name}`)
                  api.getOrder(orderId).then(o => setItems(o.items))
                  setShowMoveDialog(false); setSelectedItems(new Set())
                }).catch((e: any) => onNotify(`Napaka: ${e.message}`))
              }).catch(() => onNotify('Ciljna miza nima odprtega naročila'))
            }}>
              <option value="">Izberi mizo...</option>
              {tables.filter(t => t.status !== 'free').map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <button onClick={() => setShowMoveDialog(false)} className="btn btn-ghost" style={{ marginTop: 12 }}>Prekliči</button>
          </div>
        </div>
      )}

      {showClosed && (
        <div className="overlay">
          <div className="modal" style={{ maxHeight: '80vh', overflowY: 'auto', width: 500 }}>
            <h3 style={{ marginBottom: 12 }}>🕐 Zadnja zaključena naročila</h3>
            {closedOrders.map(o => (
              <div key={o.id} className="recent-order-row" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>#{o.id}</strong> — {o.total.toFixed(2)} €
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>{o.customer_name || '—'} | {new Date(o.closed_at || o.created_at).toLocaleString('sl-SI')}</div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={async () => printReceipt(o, '', taxRate)} className="btn btn-sm btn-blue" title="Ponatisni" aria-label={`Ponatisni račun #${o.id}`}>🧾</button>
                  <button onClick={() => setModal({ type: 'email-receipt', data: { orderId: o.id, email: '', afterPayment: false } })} className="btn btn-sm btn-purple" title="Pošlji račun" aria-label={`Pošlji račun #${o.id} po emailu`}>📧</button>
                  <button onClick={async () => {
                    if (!confirm(`Ponovno odpri naročilo #${o.id}?`)) return
                    const r = await fetch(`/api/v1/orders/${o.id}/reopen`, { method: 'POST', headers: api.authHeader() })
                    if (!r.ok) return onNotify('Napaka pri odpiranju')
                    onNotify(`Naročilo #${o.id} ponovno odprto`)
                    setShowClosed(false)
                    pickTable(tables.find(t => t.id === o.table_id) || selTable!)
                  }} className="btn btn-sm btn-hold" title="Ponovno odpri" aria-label={`Ponovno odpri naročilo #${o.id}`}>🔄</button>
                </div>
              </div>
            ))}
            {closedOrders.length === 0 && <p style={{ color: 'var(--text2)' }}>Ni nedavnih naročil</p>}
            <button onClick={() => setShowClosed(false)} className="btn btn-ghost" style={{ marginTop: 8 }}>Zapri</button>
          </div>
        </div>
      )}

      {numpadIdx !== null && (
        <div className="modal-overlay" onClick={() => setNumpadIdx(null)}>
          <div className="modal" style={{ maxWidth: 260, padding: 16 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>Količina za: <strong>{cart[numpadIdx]?.name}</strong></div>
            <input value={numpadVal} readOnly style={{
              width: '100%', fontSize: 24, fontWeight: 700, textAlign: 'center', padding: '8px 0',
              background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8,
              color: 'var(--text)', marginBottom: 8
            }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {['1','2','3','4','5','6','7','8','9','','0','⌫'].map(key => (
                key === '' ? <div key="empty" /> :
                <button key={key} onClick={() => {
                  if (key === '⌫') setNumpadVal(v => v.slice(0, -1))
                  else if (numpadVal.length < 3) setNumpadVal(v => v + key)
                }} style={{
                  padding: '10px 0', fontSize: 18, fontWeight: 600, borderRadius: 8,
                  border: '1px solid var(--border)', background: key === '⌫' ? 'var(--red)' : 'var(--surface)',
                  color: key === '⌫' ? 'white' : 'var(--text)', cursor: 'pointer'
                }}>{key}</button>
              ))}
            </div>
            {['+1', '+5', '+10'].map(inc => (
              <button key={inc} onClick={() => setNumpadVal(v => String(Math.max(0, parseInt(v || '0') + parseInt(inc))).slice(0, 3))}
                style={{
                  marginTop: 6, marginRight: 4, padding: '6px 12px', fontSize: 13, borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--surface2)', cursor: 'pointer'
                }}>{inc}</button>
            ))}
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <button onClick={() => setNumpadIdx(null)} className="btn btn-ghost" style={{ flex: 1 }}>Prekliči</button>
              <button onClick={() => {
                const qty = Math.max(1, parseInt(numpadVal) || 1)
                if (numpadIdx !== null) setCart(cart.map((x, i) => i === numpadIdx ? { ...x, quantity: qty } : x))
                setNumpadIdx(null)
              }} className="btn btn-primary" style={{ flex: 1 }}>Potrdi</button>
            </div>
          </div>
        </div>
      )}

      {showShortcuts && (
        <div className="modal-overlay" onClick={() => setShowShortcuts(false)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px' }}>⌨️ Tipkovne bližnjice</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 16px', fontSize: 13 }}>
              <kbd style={{ fontFamily: 'monospace', background: 'var(--bg)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)', textAlign: 'right' }}>F1</kbd><span>Iskanje / PLU</span>
              <kbd style={{ fontFamily: 'monospace', background: 'var(--bg)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)', textAlign: 'right' }}>F2</kbd><span>Tip naročila</span>
              <kbd style={{ fontFamily: 'monospace', background: 'var(--bg)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)', textAlign: 'right' }}>F3</kbd><span>Iskanje stranke</span>
              <kbd style={{ fontFamily: 'monospace', background: 'var(--bg)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)', textAlign: 'right' }}>F4</kbd><span>Natisni račun</span>
              <kbd style={{ fontFamily: 'monospace', background: 'var(--bg)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)', textAlign: 'right' }}>F5</kbd><span>Natisni v kuhinjo</span>
              <kbd style={{ fontFamily: 'monospace', background: 'var(--bg)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)', textAlign: 'right' }}>F6</kbd><span>🤖 AI kombinacije</span>
              <kbd style={{ fontFamily: 'monospace', background: 'var(--bg)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)', textAlign: 'right' }}>F7</kbd><span>🤖 AI iskanje</span>
              <kbd style={{ fontFamily: 'monospace', background: 'var(--bg)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)', textAlign: 'right' }}>F9</kbd><span>Plačilo</span>
              <kbd style={{ fontFamily: 'monospace', background: 'var(--bg)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)', textAlign: 'right' }}>F10</kbd><span>Zadrži naročilo</span>
              <kbd style={{ fontFamily: 'monospace', background: 'var(--bg)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)', textAlign: 'right' }}>F12</kbd><span>Novo naročilo</span>
              <kbd style={{ fontFamily: 'monospace', background: 'var(--bg)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)', textAlign: 'right' }}>Enter</kbd><span>Potrdi naročilo</span>
              <kbd style={{ fontFamily: 'monospace', background: 'var(--bg)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)', textAlign: 'right' }}>Esc</kbd><span>Zapri / Prekliči</span>
              <kbd style={{ fontFamily: 'monospace', background: 'var(--bg)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)', textAlign: 'right' }}>?</kbd><span>To okno</span>
            </div>
            <button onClick={() => setShowShortcuts(false)} className="btn btn-ghost" style={{ marginTop: 16, width: '100%' }}>Zapri</button>
          </div>
        </div>
      )}

      {showAISearch && (
        <AISearchPanel
          onSelect={(id) => {
            const flat = menu.flatMap((c: any) => c.items || [])
            const item = flat.find((i: any) => i.id === id)
            if (item) { setCart(prev => [...prev, { ...item, quantity: 1, modifiers: [], total: item.price }]); onNotify(`✅ Dodano: ${item.name}`) }
          }}
          onClose={() => setShowAISearch(false)}
        />
      )}
      {showAICombo && (
        <AIComboPanel
          cartItems={cart}
          onSelect={(id) => {
            const flat = menu.flatMap((c: any) => c.items || [])
            const item = flat.find((i: any) => i.id === id)
            if (item) { setCart(prev => [...prev, { ...item, quantity: 1, modifiers: [], total: item.price }]); onNotify(`✅ Dodano: ${item.name}`) }
          }}
          onClose={() => setShowAICombo(false)}
        />
      )}

      {modal && modal.type === 'promotion' && modal.data?.promotions && (
        <PromptDialog
          title="🏆 Izberi promocijo"
          type="select"
          options={modal.data.promotions.map((p: any) => ({
            label: `${p.name} (${p.type === 'percentage' ? `${p.value}%` : `${p.value.toFixed(2)}€`})`,
            value: String(p.id)
          }))}
          onConfirm={async (val) => {
            const promId = parseInt(val)
            try {
              const r = await fetch(`/api/v1/promotions/${promId}/apply/${modal.data.orderId}`, { method: 'POST', headers: api.authHeader() }).then(r => r.json())
              const o = await api.getOrder(modal.data.orderId); setDiscount(o); onNotify(`✅ Promocija aplicirana: -${r.discount_amount.toFixed(2)} €`)
            } catch (e: any) { onNotify('❌ ' + (e.message || 'Napaka')) }
            setModal(null)
          }}
          onCancel={() => setModal(null)}
        />
      )}

      {modal && modal.type === 'email-receipt' && (
        <PromptDialog
          title="📧 Pošlji račun na email"
          message="Prazno za preskok"
          defaultValue={modal.data.email || ''}
          type="text"
          onConfirm={async (email) => {
            if (email) {
              try {
                const r = await fetch(`/api/v1/orders/${modal.data.orderId}/send-receipt`, { method: 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
                if (r.ok) onNotify(`📧 Račun poslan na ${email}`)
                else { const e = await r.json(); onNotify(`❌ Email: ${e.detail}`) }
              } catch (e: any) { onNotify(`❌ Email: ${e.message}`) }
            }
            if (modal.data.afterPayment) { setOrderId(null); setItems([]); setSelTable(null); setCustomer(null); load() }
            setModal(null)
          }}
          onCancel={() => {
            if (modal.data.afterPayment) { setOrderId(null); setItems([]); setSelTable(null); setCustomer(null); load() }
            setModal(null)
          }}
        />
      )}

      {modal && modal.type === 'loyalty' && (
        <PromptDialog
          title={`🎁 Zvestobne točke: ${modal.data.points} pts`}
          message="Vnesi število točk za unovčenje:"
          defaultValue="0"
          type="number"
          onConfirm={async (val) => {
            const pts = parseInt(val)
            if (pts > 0 && orderId) {
              try {
                const r = await fetch('/api/v1/loyalty/redeem', { method: 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ customer_id: modal.data.customerId, points: pts, order_id: orderId }) }).then(r => r.json())
                if (r.error) { onNotify('❌ ' + (r.detail || 'Napaka')); setModal(null); return }
                await fetch(`/api/v1/orders/${orderId}/discount`, { method: 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'fixed', value: r.discount }) })
                const o = await api.getOrder(orderId); setItems(o.items); setDiscount(o)
                setCustomer((c: any) => c ? { ...c, loyalty_points: r.new_balance } : c)
                onNotify(`✅ Unovčenih ${pts} točk = ${r.discount.toFixed(2)} € popusta`)
              } catch { onNotify('❌ Napaka pri unovčenju točk') }
            }
            setModal(null)
          }}
          onCancel={() => setModal(null)}
        />
      )}

      {modal && modal.type === 'item-qty' && (
        <PromptDialog
          title={`Količina: ${modal.data.itemName}`}
          defaultValue={String(modal.data.quantity)}
          type="number"
          onConfirm={async (val) => {
            const q = parseInt(val)
            if (q > 0 && orderId) {
              await fetch(`/api/v1/orders/${orderId}/items/${modal.data.itemId}`, { method: 'PUT', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ quantity: q }) })
              const o = await api.getOrder(orderId); setItems(o.items)
            }
            setModal(null)
          }}
          onCancel={() => setModal(null)}
        />
      )}

      {modal && modal.type === 'item-remove' && (
        <PromptDialog
          title={`Odstrani: ${modal.data.itemName}?`}
          type="confirm"
          message={`Ali ste prepričani, da želite odstraniti "${modal.data.itemName}" iz naročila?`}
          onConfirm={async () => {
            if (orderId) {
              await fetch(`/api/v1/orders/${orderId}/items/${modal.data.itemId}`, { method: 'DELETE', headers: api.authHeader() })
              const o = await api.getOrder(orderId); setItems(o.items)
            }
            setModal(null)
          }}
          onCancel={() => setModal(null)}
        />
      )}

      {modal && modal.type === 'split' && (
        <PromptDialog
          title="✂️ Loči račun"
          message="ID-ji artiklov za ločitev (npr. 1,3,5):"
          type="text"
          onConfirm={async (val) => {
            const idsArr = val.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
            if (idsArr.length && modal.data.orderId) {
              try {
                const r = await fetch(`/api/v1/orders/${modal.data.orderId}/split`, { method: 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ item_ids: idsArr }) })
                const d = await r.json()
                if (!r.ok) throw new Error(d.detail)
                const o = await api.getOrder(modal.data.orderId); setItems(o.items); onNotify(`Ločen račun #${d.new_order_id}: ${d.new_total.toFixed(2)} €`)
              } catch (e: any) { onNotify(e.message) }
            }
            setModal(null)
          }}
          onCancel={() => setModal(null)}
        />
      )}

      {modal && ['service', 'discount', 'cancel', 'qty'].includes(modal.type) && (
        <PromptDialog
          title={
            modal.type === 'service' ? '💎 Dodaj storitev' :
            modal.type === 'discount' ? '🏷️ Popust' :
            modal.type === 'cancel' ? '🗑️ Preklic naročila' :
            modal.type === 'qty' ? 'Količina' : ''
          }
          message={
            modal.type === 'service' ? '% storitve (0-20):' :
            modal.type === 'discount' ? 'Vnesi % (npr. 10) ali znesek (npr. 5.00):' :
            modal.type === 'cancel' ? 'Vpišite razlog za preklic:' :
            undefined
          }
          defaultValue={
            modal.type === 'service' ? '10' :
            modal.type === 'discount' ? '10%' : ''
          }
          type={modal.type === 'cancel' ? 'text' : 'number'}
          onConfirm={async (val) => {
            if (modal.type === 'service' && orderId) {
              const pct = parseFloat(val)
              if (pct > 0 && pct <= 20) {
                await fetch(`/api/v1/orders/${orderId}/service-charge`, { method: 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ percentage: pct }) })
                const o = await api.getOrder(orderId); setItems(o.items); onNotify(`Storitev (${pct}%) dodana`)
              }
            } else if (modal.type === 'discount' && orderId) {
              const isPct = val.includes('%')
              const v = parseFloat(val.replace('%', ''))
              if (v > 0) {
                await fetch(`/api/v1/orders/${orderId}/discount`, { method: 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ type: isPct ? 'percentage' : 'fixed', value: v }) })
                const o = await api.getOrder(orderId); setItems(o.items); setDiscount(o); onNotify(`Popust ${val} dodan`)
              }
            } else if (modal.type === 'cancel' && orderId && val.trim()) {
              await fetch(`/api/v1/orders/${orderId}/cancel`, { method: 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: val.trim() }) })
              setOrderId(null); setItems([]); setDiscount(null); setSelTable(null); onNotify('Naročilo preklicano'); load()
            }
            setModal(null)
          }}
          onCancel={() => setModal(null)}
        />
      )}

      {cart.length > 0 && !pay && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 50, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          <button onClick={() => { if (items.length > 0) setModal({ type: 'discount', data: { orderId } }); else onNotify('Najprej potrdite naročilo') }}
            style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid var(--border)', background: 'var(--surface)', fontSize: 20, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }} title="Popust" aria-label="Popust">🏷️</button>
          <button onClick={() => { if (orderId) { const o = items.find((i: any) => i.id); if (o) printKitchenOrder({ id: orderId, items, customer_name: guest }, selTable?.name || ''); else onNotify('Ni artiklov za tiskanje') } else onNotify('Najprej potrdite naročilo') }}
            style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid var(--border)', background: 'var(--surface)', fontSize: 20, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }} title="Natisni v kuhinjo" aria-label="Natisni v kuhinjo">🖨️</button>
          <button onClick={() => { if (cart.length > 0) setPay(true) }}
            style={{ width: 56, height: 56, borderRadius: '50%', border: 'none', background: 'var(--green)', color: '#fff', fontSize: 22, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(5,150,105,0.4)' }} title="Plačilo (F9)" aria-label="Plačilo">€</button>
        </div>
      )}
    </div>
  )
}

function SuggestionsPanel({ cart, menuItems, quickAdd }: {
  cart: any[]; menuItems: any[]; quickAdd: (item: any) => void
}) {
  const [suggestions, setSuggestions] = useState<any[]>([])
  const itemIds = [...new Set(cart.map(c => c.menu_item_id))]
  const cartKey = cart.map(c => `${c.menu_item_id}:${c.quantity}`).join(',')

  useEffect(() => {
    if (!itemIds.length) { setSuggestions([]); return }
    const load = async () => {
      const all: any[] = []
      for (const id of itemIds.slice(0, 3)) {
        try {
          const r = await fetch(`/api/v1/menu/cross-sell/${id}`, { headers: api.authHeader() })
          if (r.ok) all.push(...(await r.json()))
        } catch {}
      }
      const unique = all.filter((s, i, a) => s.suggested_id && a.findIndex(x => x.suggested_id === s.suggested_id) === i)
      setSuggestions(unique.filter(s => !itemIds.includes(s.suggested_id)).slice(0, 4))
    }
    load()
  }, [cartKey])

  if (!suggestions.length) return null

  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 8 }}>
      <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 6 }}>🔗 Morda bi dodali še:</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {suggestions.map(s => {
          const item = menuItems.find((mi: any) => mi.id === s.suggested_id)
          return (
            <button key={s.id} onClick={() => quickAdd(item || { id: s.suggested_id, name: s.name, price: s.price })}
              style={{
                textAlign: 'left', padding: '6px 10px', background: '#f0fdf4', border: '1px solid #bbf7d0',
                borderRadius: 8, cursor: 'pointer', fontSize: 12, display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', color: '#0f172a'
              }}>
              <span>+ {s.name}</span>
              <span style={{ color: '#059669', fontWeight: 600 }}>€{(s.price || 0).toFixed(2)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
