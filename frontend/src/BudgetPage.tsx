import { useState, useEffect } from 'react'

interface BudgetRow { id: number; month: number; year: number; category: string; amount: number; notes: string }
interface AvsB { category: string; label: string; budgeted: number | null; actual: number; pct: number | null; diff: number | null; favorable: boolean | null }
interface BudgetPageProps { onNotify: (msg: string) => void }

const CATEGORIES = ["revenue", "cogs", "labor", "expenses", "net_profit"]
const CAT_LABELS: Record<string, string> = {
  revenue: "Prihodki", cogs: "Stroški živil", labor: "Stroški dela",
  expenses: "Operativni stroški", net_profit: "Čisti dobiček"
}
const CAT_COLORS: Record<string, string> = {
  revenue: "#059669", cogs: "#ef4444", labor: "#f59e0b",
  expenses: "#8b5cf6", net_profit: "#3b82f6"
}

export default function BudgetPage({ onNotify }: BudgetPageProps) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [budgets, setBudgets] = useState<BudgetRow[]>([])
  const [actuals, setActuals] = useState<AvsB[]>([])
  const [editing, setEditing] = useState<BudgetRow | null>(null)
  const [cat, setCat] = useState("revenue")
  const [amt, setAmt] = useState("")
  const [notes, setNotes] = useState("")
  const [availMonths, setAvailMonths] = useState<{ year: number; month: number }[]>([])
  const [loading, setLoading] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([
      fetch(`/api/v1/budgets?year=${year}&month=${month}`, { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } }).then(r => r.json()),
      fetch(`/api/v1/budgets/actual-vs-budget?year=${year}&month=${month}`, { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } }).then(r => r.json()),
      fetch(`/api/v1/budgets/available-months`, { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } }).then(r => r.json()),
    ]).then(([b, a, am]) => {
      setBudgets(b)
      setActuals(a.data)
      setAvailMonths(am)
    }).catch(() => onNotify('Napaka pri nalaganju')).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [year, month])

  const saveBudget = async () => {
    if (!amt) return
    const body = { month, year, category: cat, amount: parseFloat(amt), notes }
    const url = editing ? `/api/v1/budgets/${editing.id}` : '/api/v1/budgets'
    const method = editing ? 'PUT' : 'POST'
    await fetch(url, { method, headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token'), 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    onNotify(editing ? 'Posodobljeno' : 'Dodano')
    setEditing(null); setCat("revenue"); setAmt(""); setNotes("")
    load()
  }

  const deleteBudget = async (id: number) => {
    await fetch(`/api/v1/budgets/${id}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } })
    onNotify('Izbrisano')
    load()
  }

  const edit = (b: BudgetRow) => { setEditing(b); setCat(b.category); setAmt(String(b.amount)); setNotes(b.notes) }

  const MONTHS = ['', 'Januar', 'Februar', 'Marec', 'April', 'Maj', 'Junij', 'Julij', 'Avgust', 'September', 'Oktober', 'November', 'December']

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">📊 Budget</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="input" style={{ width: 130 }}>
            {MONTHS.map((m, i) => m ? <option key={i} value={i}>{m}</option> : null)}
          </select>
          <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value))} className="input" style={{ width: 90 }} />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>⏳ Nalagam...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Actual vs Budget comparison */}
          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px 0' }}>
              {MONTHS[month]} {year} — dejansko vs. budget
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 12 }}>
              {actuals.map(a => {
                const pct = a.budgeted && a.budgeted > 0 ? Math.min(100, (a.actual / a.budgeted) * 100) : 0
                const color = a.favorable === true ? '#059669' : a.favorable === false ? '#ef4444' : 'var(--text2)'
                return (
                  <div key={a.category} className="card" style={{ padding: '10px 12px', borderLeft: `3px solid ${CAT_COLORS[a.category] || '#666'}` }}>
                    <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>{a.label}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: 16, fontWeight: 700 }}>{a.actual.toFixed(2)} €</span>
                      {a.budgeted != null && <span style={{ fontSize: 11, color: 'var(--text2)' }}> / {a.budgeted.toFixed(2)} €</span>}
                    </div>
                    <div style={{ position: 'relative', height: 6, background: 'var(--bg)', borderRadius: 3, marginTop: 6 }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.5s' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 4 }}>
                      <span style={{ color: 'var(--text2)' }}>{a.pct != null ? `${a.pct}%` : '—'}</span>
                      {a.diff != null && <span style={{ color, fontWeight: 600 }}>{a.diff >= 0 ? '+' : ''}{a.diff.toFixed(2)} €</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Budget form */}
          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 10px 0' }}>{editing ? 'Uredi budget' : 'Dodaj budget'}</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <select value={cat} onChange={e => setCat(e.target.value)} className="input" style={{ width: 160 }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
              </select>
              <input type="number" step="0.01" placeholder="Znesek" value={amt} onChange={e => setAmt(e.target.value)} className="input" style={{ width: 120 }} />
              <input type="text" placeholder="Opomba" value={notes} onChange={e => setNotes(e.target.value)} className="input" style={{ width: 160 }} />
              <button className="btn btn-primary" onClick={saveBudget} style={{ fontSize: 12 }}>{editing ? '✔ Shrani' : '+ Dodaj'}</button>
              {editing && <button className="btn" onClick={() => { setEditing(null); setCat("revenue"); setAmt(""); setNotes("") }} style={{ fontSize: 12 }}>Prekliči</button>}
            </div>
          </div>

          {/* Existing budgets list */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Nastavljeni budgeti <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--text2)' }}>({budgets.length})</span></div>
            {budgets.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text2)', padding: 20 }}>Ni budgetov za {MONTHS[month]} {year}</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '4px 8px' }}>Kategorija</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px' }}>Znesek</th>
                  <th style={{ textAlign: 'left', padding: '4px 8px' }}>Opomba</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px' }}>Akcija</th>
                </tr></thead>
                <tbody>
                  {budgets.map(b => (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '4px 8px', fontWeight: 600 }}>{CAT_LABELS[b.category] || b.category}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right' }}>{b.amount.toFixed(2)} €</td>
                      <td style={{ padding: '4px 8px', color: 'var(--text2)' }}>{b.notes}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                        <button className="btn" onClick={() => edit(b)} style={{ fontSize: 11, marginRight: 4 }}>✎</button>
                        <button className="btn" onClick={() => deleteBudget(b.id)} style={{ fontSize: 11 }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
