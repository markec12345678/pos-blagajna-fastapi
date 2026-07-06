import { useState, useEffect } from 'react'
import * as api from './api'

export default function RecipeScalePage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [items, setItems] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState(0)
  const [portions, setPortions] = useState(1)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/v1/menu/all', { headers: api.authHeader() })
      .then(r => r.json()).then(cats => {
        const flat: any[] = []
        cats.forEach((c: any) => c.items.forEach((i: any) => flat.push({ ...i, cat_name: c.name })))
        setItems(flat)
      }).catch(() => {})
  }, [])

  const loadScale = async () => {
    if (!selectedId || portions < 1) return
    setLoading(true)
    try {
      const r = await fetch(`/api/v1/analytics/recipe-scale?item_id=${selectedId}&portions=${portions}`, { headers: api.authHeader() })
      if (r.ok) setData(await r.json())
      else onNotify('❌ Napaka')
    } catch { onNotify('❌ Napaka') }
    setLoading(false)
  }

  useEffect(() => { if (selectedId && portions > 0) loadScale() }, [selectedId, portions])

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 16 }}>🧮 Preračun recepta</h2>

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ fontSize: 11, color: 'var(--text2)', display: 'block', marginBottom: 2 }}>Artikel</label>
            <select className="input" value={selectedId} onChange={e => { setSelectedId(parseInt(e.target.value)); setData(null) }} style={{ width: '100%' }}>
              <option value={0}>— Izberi artikel —</option>
              {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.cat_name})</option>)}
            </select>
          </div>
          <div style={{ width: 120 }}>
            <label style={{ fontSize: 11, color: 'var(--text2)', display: 'block', marginBottom: 2 }}>Porcij</label>
            <input className="input" type="number" min="1" value={portions}
              onChange={e => setPortions(Math.max(1, parseInt(e.target.value) || 1))} />
          </div>
          <button onClick={loadScale} className="btn btn-primary" disabled={!selectedId || loading}>{loading ? '⏳' : 'Preračunaj'}</button>
        </div>
      </div>

      {data && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div className="card" style={{ flex: '1 1 140px', padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>Cena artikla</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--green)' }}>{data.price.toFixed(2)} €</div>
            </div>
            <div className="card" style={{ flex: '1 1 140px', padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>Strošek ({data.portions} porcij)</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{data.total_cost.toFixed(2)} €</div>
            </div>
            <div className="card" style={{ flex: '1 1 140px', padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>Strošek na porcijo</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{data.cost_per_portion.toFixed(2)} €</div>
            </div>
            <div className="card" style={{ flex: '1 1 140px', padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>Marža</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: data.margin_pct > 50 ? 'var(--green)' : data.margin_pct > 20 ? 'var(--gold)' : '#ef4444' }}>
                {data.margin_pct}%
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--surface2)' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left' }}>Sestavina</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Na porcijo</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Za {data.portions} porcij</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Zaloga</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Strošek</th>
                </tr>
              </thead>
              <tbody>
                {data.ingredients.map((ing: any) => (
                  <tr key={ing.ingredient_id} style={{
                    borderBottom: '1px solid var(--border)',
                    background: ing.low ? 'rgba(239,68,68,0.05)' : 'transparent'
                  }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>
                      {ing.name}
                      {ing.low && <span style={{ color: '#ef4444', fontSize: 11, marginLeft: 6 }}>⚠️</span>}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>{ing.qty_per_unit} {ing.unit}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>{ing.required_qty} {ing.unit}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', color: ing.low ? '#ef4444' : 'var(--text2)' }}>
                      {ing.stock} {ing.unit}
                      {ing.shortage > 0 && <span style={{ display: 'block', fontSize: 11, color: '#ef4444' }}>manjka {ing.shortage}</span>}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>{ing.cost.toFixed(4)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.ingredients.some((i: any) => i.low) && (
            <div className="card" style={{ padding: 12, marginTop: 12, borderLeft: '4px solid #ef4444' }}>
              <h4 style={{ margin: '0 0 6px', color: '#ef4444', fontSize: 13 }}>⚠️ Zmanjkuje sestavin</h4>
              {data.ingredients.filter((i: any) => i.low).map((i: any) => (
                <div key={i.ingredient_id} style={{ fontSize: 12, padding: '2px 0' }}>
                  {i.name}: potrebno še {i.shortage} {i.unit} (zaloga: {i.stock} {i.unit})
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!loading && !data && selectedId > 0 && (
        <p style={{ color: 'var(--text2)', textAlign: 'center', padding: 40 }}>
          {items.find(i => i.id === selectedId)?.is_combo
            ? 'Combo meniji nimajo receptov.'
            : 'Artikel nima recepta. Dodajte ga v urejevalniku menija.'}
        </p>
      )}
    </div>
  )
}
