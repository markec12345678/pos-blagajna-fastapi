import { useState, useEffect } from 'react'
import * as api from './api'

export default function Inventory({ onNotify }: { onNotify: (msg: string) => void }) {
  const [ings, setIngs] = useState<any[]>([])
  const [category, setCategory] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('kos')
  const [cat, setCat] = useState('food')
  const [stock, setStock] = useState('0')
  const [minStock, setMinStock] = useState('0')
  const [cost, setCost] = useState('0')
  const [restockId, setRestockId] = useState<number | null>(null)
  const [restockQty, setRestockQty] = useState('')
  const [wasteId, setWasteId] = useState<number | null>(null)
  const [wasteQty, setWasteQty] = useState('')
  const [wasteReason, setWasteReason] = useState('Odpis')
  const [transactions, setTransactions] = useState<any[]>([])
  const [showTx, setShowTx] = useState<number | null>(null)
  const [barcode, setBarcode] = useState('')
  const [barcodeScan, setBarcodeScan] = useState('')
  const [scanResult, setScanResult] = useState<any>(null)

  const API = '/api/v1/inventory'

  const load = () => {
    const url = category ? `${API}/ingredients?category=${category}` : `${API}/ingredients`
    fetch(url, { headers: api.h() }).then(r => r.json()).then(setIngs)
  }
  useEffect(() => { load() }, [category])

  const loadTx = async (ingId: number) => {
    const r = await fetch(`${API}/transactions?ingredient_id=${ingId}`, { headers: api.h() })
    setTransactions(await r.json())
    setShowTx(ingId)
  }

  const addIng = async () => {
    await fetch(`${API}/ingredients`, {
      method: 'POST', headers: api.h(),
      body: JSON.stringify({ name, unit, category: cat, stock: parseFloat(stock) || 0, min_stock: parseFloat(minStock) || 0, cost_per_unit: parseFloat(cost) || 0, barcode })
    })
    setShowAdd(false); setName(''); setStock('0'); setMinStock('0'); setCost('0'); setBarcode('')
    load(); onNotify(`Dodano: ${name}`)
  }

  const doRestock = async () => {
    if (!restockId || !parseFloat(restockQty)) return
    await fetch(`${API}/stock`, {
      method: 'POST', headers: api.h(),
      body: JSON.stringify({ ingredient_id: restockId, quantity: parseFloat(restockQty), type: 'purchase', note: 'Dobava' })
    })
    setRestockId(null); setRestockQty(''); load(); onNotify('Zaloga dopolnjena')
  }

  const doWaste = async () => {
    if (!wasteId || !parseFloat(wasteQty)) return
    await fetch(`${API}/waste`, {
      method: 'POST', headers: api.h(),
      body: JSON.stringify({ ingredient_id: wasteId, quantity: parseFloat(wasteQty), reason: wasteReason })
    })
    setWasteId(null); setWasteQty(''); setWasteReason('Odpis'); load(); onNotify('Odpis zabeležen')
  }

  const categories = [
    { key: '', label: 'Vse' },
    { key: 'food', label: '🍕 Hrana' },
    { key: 'drink', label: '🥤 Pijača' },
  ]

  const totalStockValue = ings.reduce((s, i) => s + i.stock * i.cost_per_unit, 0)
  const lowCount = ings.filter(i => i.low_stock).length

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
      <div className="inv-header">
        <h2>📦 Zaloge</h2>
        <button onClick={() => setShowAdd(true)} className="btn btn-sm btn-primary">+ Sestavina</button>
      </div>

      {/* Stats row */}
      <div className="stat-grid mb-16">
        <div className="stat-card">
          <div className="stat-value green">{totalStockValue.toFixed(2)} €</div>
          <div className="stat-label">Vrednost zalog</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{ings.length}</div>
          <div className="stat-label">Sestavine</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: lowCount > 0 ? 'var(--red)' : 'var(--green)' }}>{lowCount}</div>
          <div className="stat-label">Nizke zaloge</div>
        </div>
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {categories.map(c => (
          <button key={c.key} onClick={() => setCategory(c.key)}
            className={`cat-btn ${category === c.key ? 'active' : ''}`}>{c.label}</button>
        ))}
      </div>

      {/* Barcode scanner bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <input className="input" placeholder="Skeniraj črtno kodo..." value={barcodeScan}
          onChange={e => setBarcodeScan(e.target.value)}
          onKeyDown={async e => {
            if (e.key === 'Enter' && barcodeScan.trim()) {
              try {
                const r = await fetch(`${API}/barcode/${encodeURIComponent(barcodeScan.trim())}`, { headers: api.h() })
                if (r.ok) setScanResult(await r.json())
                else setScanResult(null)
              } catch { setScanResult(null) }
            }
          }} style={{ flex: 1, maxWidth: 300 }} />
        {scanResult && (
          <div style={{ fontSize: 12, color: 'var(--green)', background: '#05966915', padding: '4px 10px', borderRadius: 6 }}>
            ✅ {scanResult.name} (stock: {scanResult.stock} {scanResult.unit})
            <button onClick={() => setScanResult(null)} className="btn btn-sm btn-ghost" style={{ marginLeft: 6 }}>✕</button>
          </div>
        )}
      </div>

      {/* Ingredient grid */}
      <div className="inv-grid">
        {ings.map(i => (
          <div key={i.id} className={`inv-card ${i.low_stock ? 'low' : ''}`}>
            <div className="inv-name">{i.name}</div>
            <div className={`inv-stock ${i.low_stock ? 'low' : 'ok'}`}>{i.stock}</div>
            <div className="inv-unit">{i.unit} {i.cost_per_unit > 0 && `• ${i.cost_per_unit.toFixed(2)} €/${i.unit}`}</div>
            <div className="inv-min">Min: {i.min_stock} {i.unit}{i.barcode ? ` • 📱 ${i.barcode}` : ''}</div>
            <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
              <button onClick={() => setRestockId(i.id)} className="btn btn-sm btn-blue" style={{ flex: 1 }}>+</button>
              <button onClick={() => { setWasteId(i.id); setWasteQty(''); setWasteReason('Odpis') }} className="btn btn-sm btn-ghost" title="Odpis">🗑️</button>
              <button onClick={() => loadTx(i.id)} className="btn btn-sm btn-ghost" title="Zgodovina">📋</button>
            </div>
            {i.low_stock && <div style={{ fontSize: 10, color: 'var(--red)', marginTop: 4, fontWeight: 600 }}>⚠️ Nizka zaloga!</div>}
          </div>
        ))}
      </div>

      {/* Stock transactions modal */}
      {showTx && (
        <div className="overlay" onClick={() => setShowTx(null)}>
          <div className="modal" style={{ width: 480, maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 12 }}>
              Zgodovina: {ings.find(i => i.id === showTx)?.name}
              <button onClick={() => setShowTx(null)} className="btn btn-sm btn-ghost" style={{ float: 'right' }}>✕</button>
            </h3>
            {transactions.length === 0 ? (
              <p style={{ color: 'var(--text2)', fontSize: 13 }}>Ni transakcij</p>
            ) : (
              <div style={{ fontSize: 13 }}>
                {transactions.map(t => (
                  <div key={t.id} className="zreport-row">
                    <span>
                      <span style={{ fontWeight: 600 }}>
                        {t.type === 'purchase' ? '📥 Dobava' : t.type === 'sale' ? '📤 Prodaja' : t.type === 'waste' ? '🗑️ Odpis' : t.type}
                      </span>
                      <span style={{ color: 'var(--text2)', marginLeft: 8, fontSize: 12 }}>
                        {new Date(t.created_at).toLocaleString('sl-SI')}
                      </span>
                    </span>
                    <span style={{ fontWeight: 600, color: t.quantity > 0 ? 'var(--green)' : 'var(--red)' }}>
                      {t.quantity > 0 ? '+' : ''}{t.quantity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add ingredient modal */}
      {showAdd && (
        <div className="overlay">
          <div className="modal modal-card">
            <h3>Nova sestavina</h3>
            <input className="input" placeholder="Ime" value={name} onChange={e => setName(e.target.value)} />
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <select className="input" value={unit} onChange={e => setUnit(e.target.value)} style={{ flex: 1 }}>
                <option>kos</option><option>kg</option><option>g</option><option>l</option><option>ml</option>
              </select>
              <select className="input" value={cat} onChange={e => setCat(e.target.value)} style={{ flex: 1 }}>
                <option value="food">🍕 Hrana</option>
                <option value="drink">🥤 Pijača</option>
                <option value="other">📦 Drugo</option>
              </select>
            </div>
            <input className="input" placeholder="Začetna zaloga" value={stock} onChange={e => setStock(e.target.value)} />
            <input className="input" placeholder="Minimalna zaloga" value={minStock} onChange={e => setMinStock(e.target.value)} />
            <input className="input" placeholder="Cena na enoto (€)" value={cost} onChange={e => setCost(e.target.value)} />
            <input className="input" placeholder="Črtna koda (barcode)" value={barcode} onChange={e => setBarcode(e.target.value)} />
            <div className="modal-btns">
              <button onClick={addIng} className="btn btn-primary">Shrani</button>
              <button onClick={() => setShowAdd(false)} className="btn btn-ghost">Prekliči</button>
            </div>
          </div>
        </div>
      )}

      {/* Restock modal */}
      {restockId && (
        <div className="overlay">
          <div className="modal modal-card">
            <h3>Dopolni zalogo</h3>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>
              {ings.find(i => i.id === restockId)?.name}
            </p>
            <input className="input" type="number" placeholder="Količina" value={restockQty} onChange={e => setRestockQty(e.target.value)} />
            <div className="modal-btns">
              <button onClick={doRestock} className="btn btn-primary">Potrdi</button>
              <button onClick={() => setRestockId(null)} className="btn btn-ghost">Prekliči</button>
            </div>
          </div>
        </div>
      )}

      {/* Waste modal */}
      {wasteId && (
        <div className="overlay">
          <div className="modal modal-card">
            <h3>🗑️ Odpiši sestavino</h3>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>
              {ings.find(i => i.id === wasteId)?.name}
            </p>
            <input className="input" type="number" placeholder="Količina" value={wasteQty} onChange={e => setWasteQty(e.target.value)} />
            <input className="input" placeholder="Razlog (npr. kvar, razlitje...)" value={wasteReason} onChange={e => setWasteReason(e.target.value)} />
            <div className="modal-btns">
              <button onClick={doWaste} className="btn btn-danger">Potrdi odpis</button>
              <button onClick={() => setWasteId(null)} className="btn btn-ghost">Prekliči</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
