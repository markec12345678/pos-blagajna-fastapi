import { useState, useEffect } from 'react'
import * as api from './api'
import type { Course } from './types'

interface Cat { id: number; name: string; sort_order: number; items: Item[] }
interface Item { id: number; name: string; description: string; price: number; category_id: number; course_id: number | null; is_active: boolean; is_favorite: boolean; is_out_of_stock: boolean; plu_code: string | null; image_url: string | null; allergens: string | null; tags: string | null; translations: string | null }

export default function MenuEditor({ onNotify }: { onNotify: (msg: string) => void }) {
  const [cats, setCats] = useState<Cat[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [costs, setCosts] = useState<Record<number, { cost: number; margin: number }>>({})
  const [showCost, setShowCost] = useState(false)
  const [editing, setEditing] = useState<{ type: 'cat' | 'item'; data: any } | null>(null)
  const [recipeDialog, setRecipeDialog] = useState<{ itemId: number; itemName: string; recipes: any[]; ingredients: any[] } | null>(null)
  const [nutritionDialog, setNutritionDialog] = useState<number | null>(null)
  const [nutritionForm, setNutritionForm] = useState<any>({})
  const [showBulk, setShowBulk] = useState(false)
  const [bulkAction, setBulkAction] = useState<'price' | 'category' | 'course' | 'activate'>('price')
  const [bulkCategoryId, setBulkCategoryId] = useState<number | null>(null)
  const [bulkValue, setBulkValue] = useState('')
  const [bulkTargetCat, setBulkTargetCat] = useState<number | null>(null)
  const [bulkTargetCourse, setBulkTargetCourse] = useState<number | null>(null)
  const [transDialog, setTransDialog] = useState<{ itemId: number; itemName: string; trans: Record<string, { name: string; description: string }> } | null>(null)
  const [badgePresets, setBadgePresets] = useState<{ value: string; icon: string }[]>([])
  const [tagDialog, setTagDialog] = useState<{ itemId: number; tags: string[] } | null>(null)

  const load = () => {
    fetch('/api/v1/menu/all', { headers: api.authHeader() }).then(r => r.json()).then(setCats)
    api.getCourses().then(setCourses).catch(() => {})
    fetch('/api/v1/menu/badge-presets', { headers: api.authHeader() }).then(r => r.json()).then(setBadgePresets).catch(() => {})
    if (showCost) {
      fetch('/api/v1/menu/costs', { headers: api.authHeader() }).then(r => r.json()).then((arr: any[]) => {
        const m: Record<number, any> = {}
        arr.forEach(i => { m[i.id] = i })
        setCosts(m)
      }).catch(() => {})
    }
  }
  useEffect(() => { load() }, [])

  const addCat = async () => {
    const name = prompt('Ime nove kategorije:')
    if (!name) return
    await fetch('/api/v1/menu/categories', { method: 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
    onNotify(`Kategorija "${name}" dodana`); load()
  }

  const editCat = async (cat: Cat) => {
    const name = prompt('Ime kategorije:', cat.name)
    if (!name || name === cat.name) return
    await fetch(`/api/v1/menu/categories/${cat.id}`, { method: 'PUT', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
    onNotify(`Kategorija posodobljena`); load()
  }

  const delCat = async (cat: Cat) => {
    if (!confirm(`Izbriši kategorijo "${cat.name}"?`)) return
    const r = await fetch(`/api/v1/menu/categories/${cat.id}`, { method: 'DELETE', headers: api.authHeader() })
    if (!r.ok) return onNotify((await r.json()).detail || 'Napaka')
    onNotify(`Kategorija izbrisana`); load()
  }

  const addItem = async (catId: number) => {
    const name = prompt('Ime artikla:')
    if (!name) return
    const price = parseFloat(prompt('Cena (€):') || '0')
    if (!price) return
    const desc = prompt('Opis (neobvezno):') || ''
    await fetch('/api/v1/menu/items', { method: 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ name, price, category_id: catId, description: desc }) })
    onNotify(`Artikel "${name}" dodan`); load()
  }

  const editItem = async (item: Item) => {
    const name = prompt('Ime:', item.name)
    if (!name) return
    const price = parseFloat(prompt('Cena (€):', String(item.price)) || '0')
    if (!price) return
    const desc = prompt('Opis:', item.description) || ''
    const tax = parseFloat(prompt('Davčna stopnja % (0 = brez):', String((item as any).tax_rate || 0)) || '0')
    await fetch(`/api/v1/menu/items/${item.id}`, { method: 'PUT', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ name, price, description: desc, tax_rate: tax }) })
    onNotify(`Artikel posodobljen`); load()
  }

  const toggleItem = async (item: Item) => {
    await fetch(`/api/v1/menu/items/${item.id}`, { method: 'PUT', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !item.is_active }) })
    onNotify(item.is_active ? 'Artikel skrit' : 'Artikel prikazan'); load()
  }

  const delItem = async (item: Item) => {
    if (!confirm(`Izbriši "${item.name}"?`)) return
    await fetch(`/api/v1/menu/items/${item.id}`, { method: 'DELETE', headers: api.authHeader() })
    onNotify(`Artikel izbrisan`); load()
  }

  const setCourse = async (itemId: number, courseId: number | null) => {
    await fetch(`/api/v1/menu/items/${itemId}`, { method: 'PUT', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ course_id: courseId }) })
    load()
  }

  return (
    <div className="menu-editor">
      <div className="menu-editor-header">
        <h2>📝 Urejevalnik menija</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={async () => {
            const name = prompt('Ime novega tečaja (npr. "Predjedi"):')
            if (!name) return
            await fetch('/api/v1/courses', { method: 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
            onNotify(`Tečaj "${name}" dodan`); load()
          }} className="btn btn-sm btn-purple">+ Tečaj</button>
          <button onClick={addCat} className="btn btn-primary btn-sm">+ Kategorija          </button>
          <button onClick={async () => {
            const r = await fetch('/api/v1/menu/auto-out-of-stock', { method: 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' } }).then(r => r.json())
            onNotify(`📦 Avtomatsko: ${r.marked_out_of_stock} označenih, ${r.marked_available} odznačenih`); load()
          }} className="btn btn-sm btn-ghost" title="Avtomatsko označi razprodane">📦 Auto</button>
          <button onClick={() => { setShowCost(!showCost); if (!showCost) load() }} className={`btn btn-sm ${showCost ? 'btn-purple' : 'btn-ghost'}`}>
            💰 Stroški
          </button>
          <button onClick={() => setShowBulk(true)} className="btn btn-sm btn-blue">⚡ Množično</button>
        </div>
      </div>
       

      {courses.length > 0 && (
        <div style={{ marginBottom: 16, padding: 12, background: 'var(--surface2)', borderRadius: 8 }}>
          <h4 style={{ marginBottom: 8 }}>Tečaji (hodi)</h4>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {courses.map(c => (
              <span key={c.id} className="badge badge-blue">{c.name}</span>
            ))}
          </div>
        </div>
      )}

      {cats.map(cat => (
        <div key={cat.id} className="menu-editor-cat">
          <div className="cat-header">
            <h3>{cat.name}</h3>
            <button onClick={() => editCat(cat)} className="btn btn-sm btn-ghost" title="Uredi">✏️</button>
            <button onClick={() => delCat(cat)} className="btn btn-sm btn-ghost" title="Izbriši">🗑️</button>
            <button onClick={() => addItem(cat.id)} className="btn btn-sm btn-blue">+ Artikel</button>
          </div>

          <div className="cat-items">
            {cat.items.map(item => (
              <div key={item.id} className={`item-row ${!item.is_active ? 'inactive' : ''}`}>
                <div className="item-info">
                  <span className="item-name">{item.name}</span>
                  {item.description && <span className="item-desc">{item.description}</span>}
                  {item.plu_code && <span className="item-desc" style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'monospace' }}>PLU: {item.plu_code}</span>}
                  {item.image_url && <span style={{ fontSize: 11, color: '#3b82f6', display: 'block' }}>🖼️ Ima sliko</span>}
                  {item.allergens && <span style={{ fontSize: 11, color: '#ef4444', display: 'block' }}>⚠️ {(() => { try { return JSON.parse(item.allergens).join(', ') } catch (e) { return item.allergens } })()}</span>}
                  {item.tags && (() => { try {
                    const tagList: string[] = JSON.parse(item.tags || '[]')
                    return <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 2 }}>{tagList.map(tag => {
                      const preset = badgePresets.find(p => p.value.toLowerCase() === tag.toLowerCase())
                      return preset
                        ? <span key={tag} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8, background: '#e5e7eb', color: '#374151', fontWeight: 600 }}>{preset.icon} {tag}</span>
                        : <span key={tag} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8, background: '#6b7280', color: '#fff', fontWeight: 600 }}>{tag}</span>
                    })}</div>
                  } catch (e) { return null } })()}
                  {(item as any).calories ? <span style={{ fontSize: 11, color: 'var(--text2)', display: 'block' }}>🔥 {(item as any).calories} kcal{((item as any).protein || (item as any).fat || (item as any).carbs) ? ' (B:' + ((item as any).protein || '-') + 'g M:' + ((item as any).fat || '-') + 'g OH:' + ((item as any).carbs || '-') + 'g)' : ''}</span> : null}
                </div>
                <span className="item-price">{item.price.toFixed(2)} €
                  {(item as any).tax_rate ? <span style={{ fontSize: 10, color: '#f59e0b', marginLeft: 4 }}>DDV {(item as any).tax_rate}%</span> : null}
                  {showCost && costs[item.id] && (
                    <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 6, color: costs[item.id].margin > 50 ? 'var(--green)' : costs[item.id].margin > 20 ? 'var(--gold)' : 'var(--red)' }}>
                      (s{((costs[item.id] as any).cost || 0).toFixed(2)} • {(costs[item.id] as any).margin || 0}%)
                    </span>
                  )}
                </span>
                <div className="item-actions">
                  <select value={item.course_id || ''} onChange={e => setCourse(item.id, e.target.value ? parseInt(e.target.value) : null)}
                    className="input" style={{ width: 100, fontSize: 12, padding: '2px 4px' }}>
                    <option value="">Brez</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button onClick={() => editItem(item)} className="btn btn-sm btn-ghost" title="Uredi">✏️</button>
                  <button onClick={async () => {
                    await fetch(`/api/v1/menu/items/${item.id}`, { method: 'PUT', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ is_out_of_stock: !item.is_out_of_stock }) })
                    load()
                  }} className="btn btn-sm btn-ghost" title={item.is_out_of_stock ? 'Ni na zalogi' : 'Na zalogi'}>
                    {item.is_out_of_stock ? '🚫' : '✅'}
                  </button>
                  <button onClick={() => toggleItem(item)} className="btn btn-sm btn-ghost" title={item.is_active ? 'Skrij' : 'Prikaži'}>
                    {item.is_active ? '👁️' : '🚫'}
                  </button>
                  <button onClick={async () => {
                    await fetch(`/api/v1/menu/items/${item.id}`, { method: 'PUT', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ is_favorite: !item.is_favorite }) });
                    load();
                  }} className="btn btn-sm btn-ghost" title="Priljubljeno">{item.is_favorite ? '⭐' : '☆'}</button>
                  <button onClick={async () => {
                    const plu = prompt('PLU koda:', item.plu_code || '')
                    if (plu === null) return
                    await fetch(`/api/v1/menu/items/${item.id}`, { method: 'PUT', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ plu_code: plu || null }) })
                    load()
                  }} className="btn btn-sm btn-ghost" title="PLU koda">🏷️</button>
                  <button onClick={async () => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = 'image/*'
                    input.onchange = async () => {
                      const file = input.files?.[0]
                      if (!file) return
                      const fd = new FormData()
                      fd.append('file', file)
                      const token = localStorage.getItem('pos_token')
                      const r = await fetch('/api/v1/media/upload', { method: 'POST', body: fd, headers: token ? { 'Authorization': `Bearer ${token}` } : {} })
                      if (!r.ok) { onNotify('Napaka pri nalaganju'); return }
                      const d = await r.json()
                      await fetch(`/api/v1/menu/items/${item.id}`, { method: 'PUT', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ image_url: d.url }) })
                      onNotify('Slika naložena'); load()
                    }
                    input.click()
                  }} className="btn btn-sm btn-ghost" title="Naloži sliko">{item.image_url ? '🖼️' : '📸'}</button>
                  <button onClick={async () => {
                    const current: string[] = (() => { try { return JSON.parse(item.allergens || '[]') } catch { return [] } })()
                    const ALLERGEN_LIST = 'Žita z glutenom, Mleko, Jajca, Ribe, Rakci, Soja, Arašidi, Oreščki, Zeleno, Sulfiti, Gorčica, Sezam, Lupine, Morski sadeži'
                    const input = prompt('Alergeni (ločeni z vejico):\n' + ALLERGEN_LIST, current.join(', '))
                    if (input === null) return
                    const list = input.split(',').map(s => s.trim()).filter(Boolean)
                    await fetch(`/api/v1/menu/items/${item.id}`, { method: 'PUT', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ allergens: list.length ? JSON.stringify(list) : null }) })
                    onNotify('Alergeni posodobljeni'); load()
                  }} className="btn btn-sm btn-ghost" title="Alergeni">⚠️</button>
                  <button onClick={() => {
                    const current: string[] = (() => { try { return JSON.parse(item.tags || '[]') } catch { return [] } })()
                    setTagDialog({ itemId: item.id, tags: current })
                  }} className="btn btn-sm btn-ghost" title="Oznake">🏷️</button>
                  <button onClick={async () => {
                    const comboPrice = prompt('Cena za combo (€):', item.price.toFixed(2))
                    if (comboPrice === null) return
                    await fetch(`/api/v1/menu/items/${item.id}`, { method: 'PUT', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ combo_price: parseFloat(comboPrice) || 0, is_combo: true }) })
                    onNotify('Combo nastavljen'); load()
                  }} className="btn btn-sm btn-ghost" title="Nastavi combo">📦</button>
                  {nutritionDialog === item.id ? (
                    <div className="overlay" onClick={() => setNutritionDialog(null)} style={{ zIndex: 1000 }}>
                      <div className="modal modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 300 }}>
                        <h3 style={{ marginTop: 0 }}>🥗 Prehranske vrednosti</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {['calories', 'protein', 'fat', 'carbs'].map(f => (
                            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <label style={{ flex: '0 0 80px', fontSize: 13, color: 'var(--text2)' }}>
                                {f === 'calories' ? 'Kalorije (kcal)' : f === 'protein' ? 'Beljakovine (g)' : f === 'fat' ? 'Maščobe (g)' : 'Ogljik. hidrati (g)'}
                              </label>
                              <input className="input" type="number" style={{ flex: 1 }}
                                value={(nutritionForm as any)[f] ?? ''}
                                onChange={e => setNutritionForm({ ...nutritionForm, [f]: e.target.value ? parseFloat(e.target.value) : null })} />
                            </div>
                          ))}
                        </div>
                        <div className="modal-btns" style={{ marginTop: 12 }}>
                          <button onClick={async () => {
                            await fetch(`/api/v1/menu/items/${item.id}`, { method: 'PUT', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify(nutritionForm) })
                            onNotify('Prehranske vrednosti posodobljene'); setNutritionDialog(null); load()
                          }} className="btn btn-primary btn-sm">Shrani</button>
                          <button onClick={() => setNutritionDialog(null)} className="btn btn-ghost btn-sm">Prekliči</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => {
                      setNutritionForm({ calories: (item as any).calories, protein: (item as any).protein, fat: (item as any).fat, carbs: (item as any).carbs })
                      setNutritionDialog(item.id)
                    }} className="btn btn-sm btn-ghost" title="Prehranske vrednosti">🥗 Prehranske vrednosti</button>
                  )}
                  <button onClick={async () => {
                    const [recipes, ings] = await Promise.all([
                      fetch('/api/v1/inventory/recipes', { headers: api.authHeader() }).then(r => r.json()),
                      api.getIngredients()
                    ])
                    setRecipeDialog({
                      itemId: item.id, itemName: item.name,
                      recipes: recipes.filter((r: any) => r.menu_item_id === item.id),
                      ingredients: ings
                    })
                  }} className="btn btn-sm btn-ghost" title="Recept">🧾</button>
                  <button onClick={() => {
                    let trans: any = {}
                    try { trans = JSON.parse(item.translations || '{}') } catch {}
                    setTransDialog({ itemId: item.id, itemName: item.name, trans })
                  }} className="btn btn-sm btn-ghost" title="Prevodi">🌐</button>
                  <button onClick={() => delItem(item)} className="btn btn-sm btn-ghost" title="Izbriši">🗑️</button>
                </div>
              </div>
            ))}
            {cat.items.length === 0 && <p className="menu-editor-empty">Ni artiklov</p>}
          </div>
        </div>
      ))}

      {recipeDialog && (
        <div className="overlay" onClick={() => setRecipeDialog(null)}>
          <div className="modal" style={{ width: 450, maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 12 }}>🧾 Recept: {recipeDialog.itemName}</h3>
            <div style={{ fontSize: 13, marginBottom: 12 }}>
              {recipeDialog.recipes.length === 0 ? (
                <p style={{ color: 'var(--text2)' }}>Ni recepta</p>
              ) : (
                recipeDialog.recipes.map((r: any) => (
                  <div key={r.id} className="zreport-row" style={{ padding: '4px 0' }}>
                    <span>{r.ingredient_name || '—'}</span>
                    <span>{r.quantity} {r.unit || ''}</span>
                    <button onClick={async () => {
                      await fetch(`/api/v1/inventory/recipes/${r.id}`, { method: 'DELETE', headers: api.authHeader() })
                      setRecipeDialog(prev => prev ? { ...prev, recipes: prev.recipes.filter((x: any) => x.id !== r.id) } : null)
                      onNotify('Sestavina odstranjena')
                    }} className="btn btn-xs btn-ghost">✕</button>
                  </div>
                ))
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select id="recipe-ing-select" className="input" style={{ flex: 1 }}>
                <option value="">— Izberi sestavino —</option>
                {recipeDialog.ingredients.map((ing: any) => (
                  <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                ))}
              </select>
              <input id="recipe-qty" className="input" type="number" placeholder="Količina" style={{ width: 80 }} step="0.01" />
              <button onClick={async () => {
                const sel = document.getElementById('recipe-ing-select') as HTMLSelectElement
                const qty = document.getElementById('recipe-qty') as HTMLInputElement
                if (!sel.value || !parseFloat(qty.value)) return
                const r = await fetch('/api/v1/inventory/recipes', {
                  method: 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' },
                  body: JSON.stringify({ menu_item_id: recipeDialog.itemId, ingredient_id: parseInt(sel.value), quantity: parseFloat(qty.value) })
                }).then(r => r.json())
                // Re-fetch recipes
                const recipes = await fetch('/api/v1/inventory/recipes', { headers: api.authHeader() }).then(r => r.json())
                setRecipeDialog(prev => prev ? { ...prev, recipes: recipes.filter((x: any) => x.menu_item_id === prev.itemId) } : null)
                sel.value = ''; qty.value = ''
                onNotify('Sestavina dodana')
              }} className="btn btn-sm btn-primary">Dodaj</button>
            </div>
            <div className="modal-btns" style={{ marginTop: 12 }}>
              <button onClick={() => setRecipeDialog(null)} className="btn btn-ghost">Zapri</button>
            </div>
          </div>
        </div>
      )}

      {showBulk && (
        <div className="overlay" onClick={() => setShowBulk(false)}>
          <div className="modal modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <h3 style={{ marginBottom: 12 }}>⚡ Množična dejanja</h3>
            <div className="field">
              <label>Akcija:</label>
              <select className="input" value={bulkAction} onChange={e => setBulkAction(e.target.value as any)}>
                <option value="price">Spremeni ceno</option>
                <option value="category">Spremeni kategorijo</option>
                <option value="course">Spremeni tečaj</option>
                <option value="activate">Omogoči/onemogoči</option>
              </select>
            </div>
            <div className="field">
              <label>Kategorija (vsi artikli v njej):</label>
              <select className="input" value={bulkCategoryId ?? ''} onChange={e => setBulkCategoryId(e.target.value ? parseInt(e.target.value) : null)}>
                <option value="">Vse kategorije</option>
                {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {bulkAction === 'price' && (
              <div className="field">
                <label>Sprememba (npr. "+10%" ali "5" za fiksni znesek):</label>
                <input className="input" value={bulkValue} onChange={e => setBulkValue(e.target.value)} placeholder="+10% ali -2" />
              </div>
            )}
            {bulkAction === 'category' && (
              <div className="field">
                <label>Nova kategorija:</label>
                <select className="input" value={bulkTargetCat ?? ''} onChange={e => setBulkTargetCat(e.target.value ? parseInt(e.target.value) : null)}>
                  <option value="">Izberi...</option>
                  {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            {bulkAction === 'course' && (
              <div className="field">
                <label>Nov tečaj:</label>
                <select className="input" value={bulkTargetCourse ?? ''} onChange={e => setBulkTargetCourse(e.target.value ? parseInt(e.target.value) : null)}>
                  <option value="">Brez tečaja</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            {bulkAction === 'activate' && (
              <div className="field">
                <label>Dejanje:</label>
                <select className="input" value={bulkValue} onChange={e => setBulkValue(e.target.value)}>
                  <option value="activate">Omogoči (aktiviraj)</option>
                  <option value="deactivate">Onemogoči (skrij)</option>
                </select>
              </div>
            )}
            <div className="modal-btns" style={{ marginTop: 12 }}>
              <button onClick={async () => {
                if (bulkAction === 'price' && !confirm(`Spremenim cene artiklov? To ni reverzibilno.`)) return
                const payload: any = { action: bulkAction, category_id: bulkCategoryId }
                if (bulkAction === 'price') payload.value = bulkValue
                if (bulkAction === 'category') payload.category_id = bulkTargetCat
                if (bulkAction === 'course') payload.course_id = bulkTargetCourse
                if (bulkAction === 'activate') payload.value = bulkValue
                try {
                  const r = await fetch('/api/v1/menu/bulk', { method: 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.json())
                  onNotify(`✅ Množično: ${r.updated} artiklov posodobljenih`)
                  setShowBulk(false)
                  load()
                } catch (e) {
                  onNotify('❌ Napaka pri množičnem dejanju')
                }
              }} className="btn btn-primary">Izvedi</button>
              <button onClick={() => setShowBulk(false)} className="btn btn-ghost">Prekliči</button>
            </div>
          </div>
        </div>
      )}

      {transDialog && (
        <div className="overlay" onClick={() => setTransDialog(null)}>
          <div className="modal" style={{ width: 500, maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 12 }}>🌐 Prevodi: {transDialog.itemName}</h3>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>
              Jezik se nastavi v splošnih nastavitvah. Podprti: sl, en, de, it, hr, fr, es, ru
            </div>
            {['en', 'de', 'it', 'hr', 'fr', 'es', 'ru'].map(langCode => (
              <div key={langCode} style={{ marginBottom: 12, padding: 8, background: 'var(--surface2)', borderRadius: 6 }}>
                <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 13 }}>{langCode.toUpperCase()}</div>
                <input className="input" style={{ marginBottom: 4 }} placeholder={`Ime (${langCode})`}
                  value={transDialog.trans[langCode]?.name || ''}
                  onChange={e => setTransDialog(prev => {
                    if (!prev) return prev
                    const t = { ...prev.trans }
                    if (!t[langCode]) t[langCode] = { name: '', description: '' }
                    t[langCode] = { ...t[langCode], name: e.target.value }
                    return { ...prev, trans: t }
                  })} />
                <input className="input" placeholder={`Opis (${langCode})`}
                  value={transDialog.trans[langCode]?.description || ''}
                  onChange={e => setTransDialog(prev => {
                    if (!prev) return prev
                    const t = { ...prev.trans }
                    if (!t[langCode]) t[langCode] = { name: '', description: '' }
                    t[langCode] = { ...t[langCode], description: e.target.value }
                    return { ...prev, trans: t }
                  })} />
              </div>
            ))}
            <div className="modal-btns">
              <button onClick={async () => {
                const clean: any = {}
                for (const [code, val] of Object.entries(transDialog.trans)) {
                  if ((val as any).name || (val as any).description) clean[code] = val
                }
                await fetch(`/api/v1/menu/translations/${transDialog.itemId}`, {
                  method: 'PUT', headers: { ...api.authHeader(), 'Content-Type': 'application/json' },
                  body: JSON.stringify(clean)
                })
                setTransDialog(null)
                onNotify('Prevodi shranjeni')
                load()
              }} className="btn btn-primary">Shrani prevode</button>
              <button onClick={() => setTransDialog(null)} className="btn btn-ghost">Prekliči</button>
            </div>
          </div>
        </div>
      )}

      {tagDialog && (
        <div className="overlay" onClick={() => setTagDialog(null)}>
          <div className="modal modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h3 style={{ marginTop: 0 }}>🏷️ Oznake</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {badgePresets.map(p => {
                const isActive = tagDialog.tags.some(t => t.toLowerCase() === p.value.toLowerCase())
                return (
                  <button key={p.value} onClick={() => {
                    setTagDialog(prev => {
                      if (!prev) return prev
                      const next = isActive ? prev.tags.filter(t => t.toLowerCase() !== p.value.toLowerCase()) : [...prev.tags, p.value]
                      return { ...prev, tags: next }
                    })
                  }} style={{
                    padding: '4px 10px', borderRadius: 16, border: `2px solid ${isActive ? '#3b82f6' : '#d1d5db'}`,
                    background: isActive ? '#eff6ff' : '#fff', cursor: 'pointer', fontSize: 13, fontWeight: isActive ? 600 : 400
                  }}>
                    {p.icon} {p.value}
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              <input id="tag-custom-input" className="input" style={{ flex: 1 }}
                placeholder="Dodaj poljubno oznako..."
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value.trim()
                    if (!val) return
                    setTagDialog(prev => prev ? { ...prev, tags: [...prev.tags, val] } : null)
                    ;(e.target as HTMLInputElement).value = ''
                  }
                }} />
              <button onClick={() => {
                const inp = document.getElementById('tag-custom-input') as HTMLInputElement
                const val = inp.value.trim()
                if (!val) return
                setTagDialog(prev => prev ? { ...prev, tags: [...prev.tags, val] } : null)
                inp.value = ''
              }} className="btn btn-sm btn-primary">Dodaj</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {tagDialog.tags.map(tag => {
                const preset = badgePresets.find(p => p.value.toLowerCase() === tag.toLowerCase())
                return (
                  <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 12, background: '#e5e7eb', fontSize: 12 }}>
                    {preset ? preset.icon : null} {tag}
                    <button onClick={() => setTagDialog(prev => prev ? { ...prev, tags: prev.tags.filter(t => t !== tag) } : null)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 14, lineHeight: 1, color: '#6b7280' }}>✕</button>
                  </span>
                )
              })}
            </div>
            <div className="modal-btns" style={{ marginTop: 12 }}>
              <button onClick={async () => {
                await fetch(`/api/v1/menu/items/${tagDialog.itemId}`, { method: 'PUT', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ tags: tagDialog.tags.length ? JSON.stringify(tagDialog.tags) : null }) })
                onNotify('Oznake posodobljene'); setTagDialog(null); load()
              }} className="btn btn-primary btn-sm">Shrani</button>
              <button onClick={() => setTagDialog(null)} className="btn btn-ghost btn-sm">Prekliči</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
