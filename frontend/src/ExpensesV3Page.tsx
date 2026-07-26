import { useState, useEffect } from 'react'

interface Recurring { id: number; name: string; amount: number; frequency: string; category: string; next_payment: string; auto_pay: boolean }
interface BudgetItem { category: string; budget: number; actual: number; remaining: number; percentage: number; status: string }
interface Trend { month: string; total: number; food: number; labor: number; rent: number; other: number }
interface Meal { meal: string; food_cost: number; labor_cost: number; packaging: number; total: number; price: number; margin: number }
interface PaymentMethod { method: string; transactions: number; amount: number; percentage: number; avg_ticket: number }
interface Invoice { id: string; vendor: string; amount: number; due: string; status: string; days_until_due?: number; days_overdue?: number; auto_pay?: boolean }

export default function ExpensesV3Page({ onNotify }: { onNotify?: (msg: string, err?: boolean) => void }) {
  const [tab, setTab] = useState<string>('recurring')
  const [recurring, setRecurring] = useState<Recurring[]>([])
  const [budget, setBudget] = useState<BudgetItem[]>([])
  const [trends, setTrends] = useState<Trend[]>([])
  const [meals, setMeals] = useState<Meal[]>([])
  const [payments, setPayments] = useState<PaymentMethod[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [rRes, bRes, tRes, mRes, pRes, iRes] = await Promise.all([
        fetch('/api/v1/expenses-v3/recurring').then(r => r.json()),
        fetch('/api/v1/expenses-v3/budget-tracking').then(r => r.json()),
        fetch('/api/v1/expenses-v3/expense-trends').then(r => r.json()),
        fetch('/api/v1/expenses-v3/cost-per-meal').then(r => r.json()),
        fetch('/api/v1/expenses-v3/payment-methods').then(r => r.json()),
        fetch('/api/v1/expenses-v3/invoice-status').then(r => r.json()),
      ])
      setRecurring(rRes.recurring || [])
      setBudget(bRes.tracking || [])
      setTrends(tRes.trends || [])
      setMeals(mRes.meals || [])
      setPayments(pRes.methods || [])
      setInvoices(iRes.invoices || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  if (loading) return <div className="loading">Nalagam...</div>

  return (
    <div style={{ padding: '2rem' }}>
      <h1>💰 Stroški V3</h1>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {[
          { key: 'recurring', label: '🔄 Ponavljajoči' },
          { key: 'budget', label: '📊 Spremljanje proračuna' },
          { key: 'trends', label: '📈 Trendi' },
          { key: 'meals', label: '🍽️ Strošek/obrok' },
          { key: 'payments', label: '💳 Načini plačila' },
          { key: 'invoices', label: '🧾 Računi' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: tab === t.key ? '2px solid #2563eb' : '1px solid #d1d5db', background: tab === t.key ? '#dbeafe' : 'white', cursor: 'pointer', fontSize: '0.85rem' }}>{t.label}</button>
        ))}
      </div>

      {tab === 'recurring' && (
        <div>
          <h2>Ponavljajoči stroški</h2>
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1rem' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>Skupno mesečno: €{recurring.reduce((s, r) => s + r.amount, 0).toLocaleString()}</div>
          </div>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {recurring.map(r => (
              <div key={r.id} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{r.name}</strong>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{r.category} · {r.frequency} · Naslednje: {r.next_payment}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>€{r.amount}</span>
                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.8rem', background: r.auto_pay ? '#d1fae5' : '#f3e8ff', color: r.auto_pay ? '#065f46' : '#6b21a8' }}>{r.auto_pay ? 'Samodejno' : 'Ročno'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'budget' && (
        <div>
          <h2>Spremljanje proračuna</h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {budget.map(b => (
              <div key={b.category} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <strong>{b.category}</strong>
                  <span style={{ color: b.status === 'over' ? '#ef4444' : b.status === 'under' ? '#10b981' : '#6b7280' }}>{b.status === 'over' ? 'Prekoračeno' : b.status === 'under' ? 'Pod proračunom' : 'V okviru'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  <div>Proračun: €{b.budget.toLocaleString()}</div>
                  <div>Dejansko: €{b.actual.toLocaleString()}</div>
                  <div style={{ color: b.remaining < 0 ? '#ef4444' : '#10b981' }}>Preostanek: €{b.remaining.toLocaleString()}</div>
                </div>
                <div style={{ height: '12px', borderRadius: '6px', background: '#e5e7eb', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, b.percentage)}%`, background: b.percentage > 100 ? '#ef4444' : b.percentage > 90 ? '#f59e0b' : '#10b981', borderRadius: '6px' }} />
                </div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>{b.percentage}% porabljeno</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'trends' && (
        <div>
          <h2>Trendi stroškov</h2>
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {trends.map(t => (
                <div key={t.month} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 80px', alignItems: 'center', gap: '1rem', padding: '0.75rem', borderRadius: '8px', background: '#f9fafb' }}>
                  <div style={{ fontWeight: 600 }}>{t.month}</div>
                  <div style={{ height: '20px', borderRadius: '4px', background: '#e5e7eb', display: 'flex', overflow: 'hidden' }}>
                    <div style={{ width: `${(t.food / t.total) * 100}%`, background: '#f59e0b' }} />
                    <div style={{ width: `${(t.labor / t.total) * 100}%`, background: '#3b82f6' }} />
                    <div style={{ width: `${(t.rent / t.total) * 100}%`, background: '#8b5cf6' }} />
                    <div style={{ width: `${(t.other / t.total) * 100}%`, background: '#6b7280' }} />
                  </div>
                  <div style={{ fontWeight: 600 }}>€{t.total.toLocaleString()}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'center', fontSize: '0.85rem' }}>
              <span>🟡 Hrana</span> <span>🔵 Delovna sila</span> <span>🟣 Najemnina</span> <span>⚪ Drugo</span>
            </div>
          </div>
        </div>
      )}

      {tab === 'meals' && (
        <div>
          <h2>Strošek na obrok</h2>
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {meals.map(m => (
                <div key={m.meal} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 80px', alignItems: 'center', gap: '1rem', padding: '0.75rem', borderRadius: '8px', background: '#f9fafb' }}>
                  <strong>{m.meal}</strong>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <div>Hrana: €{m.food_cost}</div>
                    <div>Dela: €{m.labor_cost}</div>
                    <div>Skupaj: €{m.total}</div>
                    <div>Cena: €{m.price}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: m.margin > 55 ? '#10b981' : m.margin > 45 ? '#f59e0b' : '#ef4444' }}>{m.margin}%</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Marža</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'payments' && (
        <div>
          <h2>Načini plačila</h2>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {payments.map(p => (
              <div key={p.method} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{p.method}</strong>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{p.transactions} transakcij · Povprečje: €{p.avg_ticket}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '120px', height: '8px', borderRadius: '4px', background: '#e5e7eb' }}>
                    <div style={{ height: '100%', width: `${p.percentage}%`, background: '#3b82f6', borderRadius: '4px' }} />
                  </div>
                  <span style={{ fontWeight: 600 }}>€{p.amount.toLocaleString()}</span>
                  <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>{p.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'invoices' && (
        <div>
          <h2>Računi</h2>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {invoices.map(inv => (
              <div key={inv.id} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{inv.id}</strong>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{inv.vendor} · Zapade: {inv.due}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>€{inv.amount.toLocaleString()}</span>
                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.8rem', background: inv.status === 'overdue' ? '#fef2f2' : inv.status === 'scheduled' ? '#dbeafe' : '#fef3c7', color: inv.status === 'overdue' ? '#991b1b' : inv.status === 'scheduled' ? '#1e40af' : '#92400e' }}>{inv.status === 'overdue' ? 'Zapadlo' : inv.status === 'scheduled' ? 'Načrtovano' : 'V teku'}{inv.days_overdue ? ` (${inv.days_overdue} dni)` : ''}{inv.days_until_due ? ` (${inv.days_until_due} dni)` : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
