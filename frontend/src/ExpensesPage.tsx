import { useState, useEffect } from 'react'
import * as api from './api'

const CATEGORIES = [
  { key: 'rent', label: 'Najemnina', icon: '🏢' },
  { key: 'utilities', label: 'Storitve', icon: '💡' },
  { key: 'marketing', label: 'Marketing', icon: '📢' },
  { key: 'maintenance', label: 'Vzdrževanje', icon: '🔧' },
  { key: 'supplies', label: 'Material', icon: '📦' },
  { key: 'insurance', label: 'Zavarovanje', icon: '🛡️' },
  { key: 'salaries', label: 'Plače', icon: '👤' },
  { key: 'licenses', label: 'Licence', icon: '📄' },
  { key: 'software', label: 'Programska oprema', icon: '💻' },
  { key: 'other', label: 'Drugo', icon: '📋' },
]

const CAT_MAP: Record<string, { label: string; icon: string }> = {}
CATEGORIES.forEach(c => { CAT_MAP[c.key] = { label: c.label, icon: c.icon } })

export default function ExpensesPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [records, setRecords] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', amount: '', category: 'other', expense_date: new Date().toISOString().slice(0, 10), notes: '' })
  const [editing, setEditing] = useState<any>(null)
  const [catFilter, setCatFilter] = useState('')

  const load = () => {
    setLoading(true)
    const catQ = catFilter ? `&category=${catFilter}` : ''
    Promise.all([
      fetch(`/api/v1/expenses?days=${days}${catQ}`, { headers: api.h() }).then(r => r.json()).then(setRecords),
      fetch(`/api/v1/expenses/analytics?days=${days}`, { headers: api.h() }).then(r => r.json()).then(setAnalytics),
    ]).catch(() => onNotify('Napaka')).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [days, catFilter])

  const resetForm = () => setForm({ name: '', amount: '', category: 'other', expense_date: new Date().toISOString().slice(0, 10), notes: '' })

  const submit = async () => {
    if (!form.name || !form.amount) { onNotify('Izpolni ime in znesek'); return }
    try {
      if (editing) {
        await fetch(`/api/v1/expenses/${editing.id}`, { method: 'PUT', headers: { ...api.h(), 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        onNotify('Strošek posodobljen')
      } else {
        await fetch('/api/v1/expenses', { method: 'POST', headers: { ...api.h(), 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        onNotify(`💰 Strošek "${form.name}" dodan`)
      }
      setShowForm(false); setEditing(null); resetForm(); load()
    } catch { onNotify('❌ Napaka') }
  }

  const del = async (id: number) => {
    if (!confirm('Izbriši strošek?')) return
    await fetch(`/api/v1/expenses/${id}`, { method: 'DELETE', headers: api.h() })
    onNotify('Izbrisano'); load()
  }

  const editExp = (e: any) => {
    setEditing(e); setForm({ name: e.name, amount: String(e.amount), category: e.category, expense_date: e.expense_date, notes: e.notes || '' }); setShowForm(true)
  }

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">💰 Stroški poslovanja</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="input" value={days} onChange={e => setDays(parseInt(e.target.value))} style={{ width: 90, fontSize: 12 }}>
            <option value={7}>7 dni</option>
            <option value={30}>30 dni</option>
            <option value={90}>90 dni</option>
            <option value={365}>365 dni</option>
          </select>
          <select className="input" value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ width: 120, fontSize: 12 }}>
            <option value="">Vse kategorije</option>
            {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          <button onClick={() => { setShowForm(!showForm); if (!showForm) { setEditing(null); resetForm() } }} className={`btn btn-sm ${showForm ? 'btn-ghost' : 'btn-primary'}`}>
            {showForm ? 'Zapri' : '+ Strošek'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 8px' }}>{editing ? 'Uredi strošek' : 'Nov strošek'}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input className="input" placeholder="Naziv *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input className="input" type="number" step="0.01" min="0" placeholder="Znesek *" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            <select className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
            </select>
            <input className="input" type="date" value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} />
          </div>
          <input className="input" placeholder="Opombe" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ marginTop: 8 }} />
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <button onClick={submit} className="btn btn-sm btn-primary" disabled={!form.name || !form.amount}>Shrani</button>
            {editing && <button onClick={() => { setShowForm(false); setEditing(null); resetForm() }} className="btn btn-sm btn-ghost">Prekliči</button>}
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>⏳ Nalaganje...</div>
      ) : (
        <>
          {analytics && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 16 }}>
              <div className="card" style={{ padding: '10px 14px', borderLeft: '3px solid #ef4444' }}>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>Skupaj stroški</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#ef4444' }}>{analytics.total.toFixed(2)} €</div>
              </div>
              <div className="card" style={{ padding: '10px 14px', borderLeft: '3px solid #3b82f6' }}>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>Število</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{analytics.count}</div>
              </div>
              <div className="card" style={{ padding: '10px 14px', borderLeft: '3px solid #8b5cf6' }}>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>Povprečje</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{(analytics.count > 0 ? analytics.total / analytics.count : 0).toFixed(2)} €</div>
              </div>
              <div className="card" style={{ padding: '10px 14px', borderLeft: '3px solid #f59e0b' }}>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>Obdobje</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{analytics.days} dni</div>
              </div>
            </div>
          )}

          {/* Category breakdown */}
          {analytics && Object.keys(analytics.by_category).length > 0 && (
            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>📊 Po kategorijah</div>
              {(() => {
                const maxAmt = Math.max(...Object.values(analytics.by_category).map((v: any) => v.amount), 1)
                return (
                  <div style={{ fontSize: 12 }}>
                    {Object.entries(analytics.by_category).map(([key, data]: [string, any]) => {
                      const ci = CAT_MAP[key] || { label: key, icon: '📋' }
                      return (
                        <div key={key} style={{ marginBottom: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                            <span style={{ fontWeight: 600 }}>{ci.icon} {ci.label}</span>
                            <span>{data.amount.toFixed(2)} € ({data.count}x)</span>
                          </div>
                          <div style={{ background: 'var(--bg2)', borderRadius: 4, height: 10, overflow: 'hidden' }}>
                            <div style={{ width: `${(data.amount / maxAmt) * 100}%`, height: '100%', background: '#ef4444', borderRadius: 4, transition: 'width 0.3s' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          )}

          {/* Monthly chart */}
          {analytics && Object.keys(analytics.by_month).length > 1 && (
            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>📈 Mesečni trend</div>
              <svg width="100%" height="100" viewBox="0 0 400 100">
                {(() => {
                  const entries = Object.entries(analytics.by_month)
                  const maxV = Math.max(...entries.map(([_, v]) => v as number), 1)
                  const bw = 360 / entries.length
                  return (
                    <>
                      {entries.map(([mk, v], i) => {
                        const x = 30 + i * bw
                        const h = ((v as number) / maxV) * 70
                        return <g key={mk}>
                          <rect x={x} y={80 - h} width={Math.max(bw - 4, 4)} height={h} fill="#ef4444" rx="2" opacity="0.7" />
                          <text x={x + bw / 2} y={90} textAnchor="middle" fontSize="6" fill="var(--text2)">{mk.slice(5)}</text>
                        </g>
                      })}
                      <text x={5} y={75} fontSize="8" fill="var(--text2)" transform="rotate(-90,5,75)">€</text>
                    </>
                  )
                })()}
              </svg>
            </div>
          )}

          {/* Records list */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>📋 Zgodovina</div>
            {records.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text2)', padding: 20 }}>Ni stroškov</p>
            ) : (
              records.map(r => {
                const ci = CAT_MAP[r.category] || { label: r.category, icon: '📋' }
                return (
                  <div key={r.id} className="item-row" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <div className="item-info">
                      <span className="item-name">{ci.icon} {r.name}</span>
                      <span className="item-desc">
                        <span className="badge" style={{ background: '#ef4444', color: '#fff', fontSize: 10, marginRight: 6 }}>{ci.label}</span>
                        {r.expense_date} • {r.notes || ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#ef4444', fontSize: 14 }}>{r.amount.toFixed(2)} €</span>
                      <button onClick={() => editExp(r)} className="btn btn-xs btn-ghost">✏️</button>
                      <button onClick={() => del(r.id)} className="btn btn-xs btn-ghost">🗑️</button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}
