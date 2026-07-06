import { useState, useEffect } from 'react'
import * as api from './api'

const REASONS = ['spoilage', 'overproduction', 'expired', 'damaged', 'other']
const REASON_LABEL: Record<string, string> = {
  spoilage: 'Kvar', overproduction: 'Prevelika proizvodnja',
  expired: 'Rok trajanja', damaged: 'Poškodba', other: 'Drugo'
}
const REASON_COLOR: Record<string, string> = {
  spoilage: '#ef4444', overproduction: '#f59e0b',
  expired: '#8b5cf6', damaged: '#f97316', other: '#6b7280'
}

export default function WastePage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [records, setRecords] = useState<any[]>([])
  const [ingredients, setIngredients] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)
  const [form, setForm] = useState({ ingredient_id: 0, quantity: '', reason: 'spoilage', notes: '', cost: '' })
  const [showForm, setShowForm] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([
      fetch(`/api/v1/waste?days=${days}`, { headers: api.h() }).then(r => r.json()).then(setRecords),
      fetch(`/api/v1/waste/analytics?days=${days}`, { headers: api.h() }).then(r => r.json()).then(setAnalytics),
      api.getIngredients().then(setIngredients),
    ]).catch(() => onNotify('Napaka pri nalaganju')).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [days])

  const submit = async () => {
    if (!form.ingredient_id || !form.quantity) { onNotify('Izpolni sestavino in količino'); return }
    try {
      const body: any = { ingredient_id: form.ingredient_id, quantity: parseFloat(form.quantity), reason: form.reason, notes: form.notes }
      if (form.cost) body.cost = parseFloat(form.cost)
      const r = await fetch('/api/v1/waste', { method: 'POST', headers: { ...api.h(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json())
      onNotify(`🗑️ Odpad zabeležen: ${r.ingredient} (${r.quantity})`)
      setForm({ ingredient_id: 0, quantity: '', reason: 'spoilage', notes: '', cost: '' }); setShowForm(false); load()
    } catch { onNotify('❌ Napaka') }
  }

  const delRecord = async (id: number) => {
    if (!confirm('Izbriši zapis?')) return
    await fetch(`/api/v1/waste/${id}`, { method: 'DELETE', headers: api.h() })
    onNotify('Zapis izbrisan'); load()
  }

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">🗑️ Odpadki</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="input" value={days} onChange={e => setDays(parseInt(e.target.value))} style={{ width: 100, fontSize: 12 }}>
            <option value={7}>7 dni</option>
            <option value={30}>30 dni</option>
            <option value={90}>90 dni</option>
          </select>
          <button onClick={() => setShowForm(!showForm)} className={`btn btn-sm ${showForm ? 'btn-ghost' : 'btn-primary'}`}>
            {showForm ? 'Zapri' : '+ Zabeleži'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 8px' }}>Zabeleži odpadek</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <select className="input" value={form.ingredient_id} onChange={e => setForm({ ...form, ingredient_id: parseInt(e.target.value) })}>
              <option value={0}>— Izberi sestavino —</option>
              {ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({i.stock} {i.unit})</option>)}
            </select>
            <input className="input" type="number" step="0.1" min="0" placeholder="Količina" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
            <select className="input" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}>
              {REASONS.map(r => <option key={r} value={r}>{REASON_LABEL[r]}</option>)}
            </select>
            <input className="input" type="number" step="0.01" min="0" placeholder="Strošek (prazno = samodejno)" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} />
          </div>
          <input className="input" placeholder="Opombe" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ marginTop: 8 }} />
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <button onClick={submit} className="btn btn-sm btn-primary" disabled={!form.ingredient_id || !form.quantity}>Shrani</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>⏳ Nalaganje...</div>
      ) : (
        <>
          {analytics && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 16 }}>
              <div className="card" style={{ padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>Skupni strošek</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#ef4444' }}>{analytics.total_cost.toFixed(2)} €</div>
              </div>
              <div className="card" style={{ padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>Količina</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{analytics.total_quantity.toFixed(1)}</div>
              </div>
              <div className="card" style={{ padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>Zapisov</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{analytics.record_count}</div>
              </div>
              <div className="card" style={{ padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>Obdobje</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{analytics.days} dni</div>
              </div>
            </div>
          )}

          {analytics && Object.keys(analytics.by_reason).length > 0 && (
            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>📊 Po vzroku</div>
              <div style={{ fontSize: 12 }}>
                {Object.entries(analytics.by_reason).map(([reason, data]: [string, any]) => {
                  const maxCost = Math.max(...Object.values(analytics.by_reason).map((v: any) => v.cost), 1)
                  return (
                    <div key={reason} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontWeight: 600 }}>{REASON_LABEL[reason] || reason}</span>
                        <span>{data.cost.toFixed(2)} € ({data.count}x)</span>
                      </div>
                      <div style={{ background: 'var(--bg2)', borderRadius: 4, height: 12, overflow: 'hidden' }}>
                        <div style={{ width: `${(data.cost / maxCost) * 100}%`, height: '100%', background: REASON_COLOR[reason] || '#6b7280', borderRadius: 4, transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {analytics && Object.keys(analytics.by_ingredient).length > 0 && (
            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>🧂 Po sestavinah (top 20)</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '4px 8px' }}>Sestavina</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px' }}>Količina</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px' }}>Strošek</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px' }}>Zapisov</th>
                </tr></thead>
                <tbody>
                  {Object.entries(analytics.by_ingredient).map(([name, data]: [string, any]) => (
                    <tr key={name} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '4px 8px', fontWeight: 600 }}>{name}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right' }}>{data.qty.toFixed(1)} {data.unit}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', color: '#ef4444' }}>{data.cost.toFixed(2)} €</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right' }}>{data.count}x</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Records list */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>📋 Zgodovina</div>
            {records.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text2)', padding: 20 }}>Ni zabeleženih odpadkov</p>
            ) : (
              <div style={{ fontSize: 13 }}>
                {records.map(r => (
                  <div key={r.id} className="item-row" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <div className="item-info">
                      <span className="item-name">{r.ingredient_name} <span style={{ fontWeight: 400, color: 'var(--text2)' }}>— {r.quantity} {r.ingredient_unit}</span></span>
                      <span className="item-desc">
                        <span className="badge" style={{ background: REASON_COLOR[r.reason] || '#6b7280', color: '#fff', fontSize: 10, marginRight: 6 }}>{REASON_LABEL[r.reason] || r.reason}</span>
                        {r.notes && <span>📝 {r.notes} • </span>}
                        <span>{new Date(r.created_at).toLocaleString('sl-SI')}</span>
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#ef4444', fontSize: 14 }}>{r.cost.toFixed(2)} €</span>
                      <button onClick={() => delRecord(r.id)} className="btn btn-xs btn-ghost">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
