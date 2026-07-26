import { useState, useEffect } from 'react'

interface Split { id: number; table: string; total: number; method: string; guests: number; per_person?: number; status: string; payments: Array<{ person: string; amount: number; method: string }> }
interface Refund { id: number; order_id: number; amount: number; reason: string; method: string; processed_by: string; time: string; status: string }
interface Denomination { denom: string; count: number; total: number }
interface TipEntry { table: string; amount: number; percentage: number }

export default function PaymentsV3Page({ onNotify }: { onNotify?: (msg: string, err?: boolean) => void }) {
  const [tab, setTab] = useState<string>('split')
  const [splits, setSplits] = useState<Split[]>([])
  const [tipping, setTipping] = useState<any>(null)
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [reconciliation, setReconciliation] = useState<any>(null)
  const [drawer, setDrawer] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [sRes, tRes, rRes, recRes, dRes] = await Promise.all([
        fetch('/api/v1/payments-v3/split-bills').then(r => r.json()),
        fetch('/api/v1/payments-v3/tipping').then(r => r.json()),
        fetch('/api/v1/payments-v3/refunds').then(r => r.json()),
        fetch('/api/v1/payments-v3/payment-reconciliation').then(r => r.json()),
        fetch('/api/v1/payments-v3/cash-drawer').then(r => r.json()),
      ])
      setSplits(sRes.splits || [])
      setTipping(tRes.tipping || null)
      setRefunds(rRes.refunds || [])
      setReconciliation(recRes.reconciliation || null)
      setDrawer(dRes.drawer || null)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  if (loading) return <div className="loading">Nalagam...</div>

  return (
    <div style={{ padding: '2rem' }}>
      <h1>💳 Plačila V3</h1>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {[
          { key: 'split', label: '🔪 Deljenje računov' },
          { key: 'tipping', label: '💰 Napitnine' },
          { key: 'refunds', label: '↩️ Povračila' },
          { key: 'reconciliation', label: '📋 Uskladitev' },
          { key: 'drawer', label: '🏦 Blagajna' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: tab === t.key ? '2px solid #2563eb' : '1px solid #d1d5db', background: tab === t.key ? '#dbeafe' : 'white', cursor: 'pointer', fontSize: '0.85rem' }}>{t.label}</button>
        ))}
      </div>

      {tab === 'split' && (
        <div>
          <h2>Deljenje računov</h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {splits.map(s => (
              <div key={s.id} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <strong>Miza {s.table} — {s.guests} oseb</strong>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700 }}>€{s.total}</span>
                    <span style={{ padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.8rem', background: s.status === 'completed' ? '#d1fae5' : '#fef3c7', color: s.status === 'completed' ? '#065f46' : '#92400e' }}>{s.method === 'per_person' ? 'Na osebo' : 'Po meri'}</span>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {s.payments.map((p, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', borderRadius: '6px', background: '#f9fafb' }}>
                      <span>{p.person}</span>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600 }}>€{p.amount.toFixed(2)}</span>
                        <span style={{ fontSize: '0.8rem', color: '#6b7280', textTransform: 'capitalize' }}>{p.method}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'tipping' && tipping && (
        <div>
          <h2>Napitnine</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ background: '#d1fae5', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>€{tipping.total_tips_today}</div>
              <div>Napitnine danes</div>
            </div>
            <div style={{ background: '#dbeafe', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{tipping.avg_tip_percentage}%</div>
              <div>Povprečje</div>
            </div>
            <div style={{ background: '#fef3c7', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>€{tipping.top_tippers[0]?.amount || 0}</div>
              <div>Najvišja napitnina</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3>Po načinu</h3>
              {tipping.tips_by_method.map((m: any) => (
                <div key={m.method} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderRadius: '6px', background: '#f9fafb', marginBottom: '0.5rem' }}>
                  <span>{m.method}</span>
                  <span style={{ fontWeight: 600 }}>€{m.amount} ({m.avg_percentage}%)</span>
                </div>
              ))}
            </div>
            <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3>Najvišje napitnine</h3>
              {tipping.top_tippers.map((t: TipEntry, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderRadius: '6px', background: '#f9fafb', marginBottom: '0.5rem' }}>
                  <span>Miza {t.table}</span>
                  <span style={{ fontWeight: 600 }}>€{t.amount} ({t.percentage}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'refunds' && (
        <div>
          <h2>Povračila</h2>
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', fontSize: '0.9rem' }}>
              <div><strong>Danes:</strong> €{refunds.length > 0 ? (refunds.reduce((s, r) => s + r.amount, 0)) : 0}</div>
              <div><strong>Mesec:</strong> €{185}</div>
              <div><strong>Stopnja:</strong> 0.45%</div>
              <div><strong>Povprečje:</strong> €10.25</div>
            </div>
          </div>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {refunds.map(r => (
              <div key={r.id} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>#{r.order_id} — €{r.amount}</strong>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{r.reason} · {r.time} · {r.processed_by}</div>
                </div>
                <span style={{ padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.8rem', background: '#d1fae5', color: '#065f46' }}>{r.method}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'reconciliation' && reconciliation && (
        <div>
          <h2>Uskladitev plačil</h2>
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <strong>Status: {reconciliation.status === 'reconciled' ? '✅ Usklajeno' : '⚠️ Razlike'}</strong>
              <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>{reconciliation.last_reconciled} · {reconciliation.reconciled_by}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
              {Object.entries(reconciliation.expected).map(([method, expected]) => {
                const actual = reconciliation.actual[method as keyof typeof reconciliation.actual] || 0
                const diff = reconciliation.differences[method as keyof typeof reconciliation.differences] || 0
                return (
                  <div key={method} style={{ padding: '1rem', borderRadius: '8px', background: diff === 0 ? '#d1fae5' : '#fef2f2', textAlign: 'center' }}>
                    <div style={{ fontWeight: 600, textTransform: 'capitalize', marginBottom: '0.5rem' }}>{method.replace('_', ' ')}</div>
                    <div style={{ fontSize: '0.85rem' }}>Pričakovano: €{String(expected)}</div>
                    <div style={{ fontSize: '0.85rem' }}>Dejansko: €{String(actual)}</div>
                    <div style={{ fontWeight: 700, color: diff === 0 ? '#065f46' : '#991b1b', marginTop: '0.25rem' }}>Razlika: €{String(diff)}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'drawer' && drawer && (
        <div>
          <h2>Blagajna</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ background: '#dbeafe', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>€{drawer.opening_balance}</div>
              <div>Začetno stanje</div>
            </div>
            <div style={{ background: '#d1fae5', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>€{drawer.cash_in.toLocaleString()}</div>
              <div>Vhod gotovine</div>
            </div>
            <div style={{ background: '#fef3c7', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>€{drawer.cash_out}</div>
              <div>Izhod gotovine</div>
            </div>
            <div style={{ background: drawer.difference === 0 ? '#d1fae5' : '#fef2f2', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>€{drawer.difference}</div>
              <div>Razlika</div>
            </div>
          </div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3>Apoeni</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
              {drawer.denominations.map((d: Denomination) => (
                <div key={d.denom} style={{ padding: '0.75rem', borderRadius: '8px', background: '#f9fafb', textAlign: 'center' }}>
                  <div style={{ fontWeight: 600 }}>{d.denom}</div>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{d.count} kosov</div>
                  <div style={{ fontWeight: 700 }}>€{d.total}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
