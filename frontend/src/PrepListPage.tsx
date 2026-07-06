import { useState, useEffect } from 'react'
import * as api from './api'

export default function PrepListPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [data, setData] = useState<any>(null)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [checked, setChecked] = useState<Record<number, boolean>>({})
  const [loading, setLoading] = useState(false)

  const load = () => {
    setLoading(true)
    fetch(`/api/v1/analytics/prep-list?date=${date}`, { headers: api.authHeader() })
      .then(r => r.json()).then(d => { setData(d); setChecked({}) }).catch(() => onNotify('❌ Napaka pri nalaganju'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [date])

  const toggleCheck = (id: number) => setChecked(p => ({ ...p, [id]: !p[id] }))

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>📋 Dnevni plan priprave</h2>
        <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} style={{ width: 160 }} />
      </div>

      {loading && <p style={{ color: 'var(--text2)' }}>Nalaganje...</p>}

      {data && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div className="card" style={{ flex: '1 1 140px', padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{data.summary.total_items}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>Artiklov</div>
            </div>
            <div className="card" style={{ flex: '1 1 140px', padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{data.summary.total_forecast}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>Napoved količin</div>
            </div>
            <div className="card" style={{ flex: '1 1 140px', padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{data.total_guests_reservations}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>Rezervacije (gostje)</div>
            </div>
            <div className="card" style={{ flex: '1 1 140px', padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: data.summary.low_stock_ingredients.length > 0 ? '#ef4444' : 'var(--green)' }}>{data.summary.low_stock_ingredients.length}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>Sestavin zmanjka</div>
            </div>
          </div>

          {data.summary.low_stock_ingredients.length > 0 && (
            <div className="card" style={{ padding: 12, marginBottom: 16, borderLeft: '4px solid #ef4444' }}>
              <h4 style={{ margin: '0 0 8px', color: '#ef4444', fontSize: 14 }}>⚠️ Sestavine zmanjkujejo</h4>
              {data.summary.low_stock_ingredients.map((ing: any) => (
                <div key={ing.ingredient_id} style={{ fontSize: 13, padding: '2px 0', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{ing.name}</span>
                  <span style={{ color: '#ef4444' }}>potrebno: {ing.required} {ing.unit} • zaloga: {ing.stock} {ing.unit} • manjka: {ing.shortage} {ing.unit}</span>
                </div>
              ))}
            </div>
          )}

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--surface2)' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', width: 30 }}>✓</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left' }}>Artikel</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Zgod.</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Naroč.</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Rezerv.</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Skupaj</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left' }}>Recept</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item: any) => {
                  const checkedCount = item.ingredients.filter((i: any) => i.low).length
                  const done = checked[item.item_id]
                  return (
                    <tr key={item.item_id} style={{
                      borderBottom: '1px solid var(--border)',
                      background: done ? 'var(--green-bg)' : 'transparent',
                      opacity: done ? 0.7 : 1,
                      transition: 'all 0.3s'
                    }}>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <input type="checkbox" checked={!!done} onChange={() => toggleCheck(item.item_id)}
                          style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--green)' }} />
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>
                        {item.item_name}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--text2)' }}>{item.forecast_qty}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', color: '#3b82f6' }}>{item.scheduled_qty || '-'}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', color: '#f59e0b' }}>{item.reservation_extra || '-'}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, fontSize: 15 }}>{item.total_qty}</td>
                      <td style={{ padding: '8px 10px', fontSize: 12 }}>
                        {item.has_recipe ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {item.ingredients.map((ing: any) => (
                              <span key={ing.ingredient_id} style={{
                                color: ing.low ? '#ef4444' : 'var(--text2)',
                                fontWeight: ing.low ? 600 : 400
                              }}>
                                {ing.name}: {ing.required_qty} {ing.unit}
                                {ing.low && <span style={{ color: '#ef4444' }}> (⚠️ {ing.stock})</span>}
                              </span>
                            ))}
                          </div>
                        ) : <span style={{ color: '#f59e0b' }}>Ni recepta</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 12, textAlign: 'center' }}>
            ✔ {Object.values(checked).filter(Boolean).length}/{data.items.length} pripravljenih
          </div>
        </>
      )}
    </div>
  )
}
