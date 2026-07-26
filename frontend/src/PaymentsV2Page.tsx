import { useState, useEffect } from 'react'
import * as api from './api'

export default function PaymentsV2Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'methods' | 'transactions' | 'tips' | 'refunds' | 'reconciliation' | 'analytics'>('methods')
  const [methods, setMethods] = useState<any>(null)
  const [transactions, setTransactions] = useState<any>(null)
  const [tips, setTips] = useState<any>(null)
  const [refunds, setRefunds] = useState<any>(null)
  const [reconciliation, setReconciliation] = useState<any>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/payments-v2/methods', { headers: api.h() }).then(r => r.json()).then(setMethods),
      fetch('/api/v1/payments-v2/transactions', { headers: api.h() }).then(r => r.json()).then(setTransactions),
      fetch('/api/v1/payments-v2/tips', { headers: api.h() }).then(r => r.json()).then(setTips),
      fetch('/api/v1/payments-v2/refunds', { headers: api.h() }).then(r => r.json()).then(setRefunds),
      fetch('/api/v1/payments-v2/reconciliation', { headers: api.h() }).then(r => r.json()).then(setReconciliation),
      fetch('/api/v1/payments-v2/analytics', { headers: api.h() }).then(r => r.json()).then(setAnalytics),
    ]).catch(() => onNotify('Napaka pri nalaganju')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'methods', label: '💳 Sredstva' },
    { key: 'transactions', label: '📋 Transakcije', count: transactions?.total || 0 },
    { key: 'tips', label: '💵 Napitnine' },
    { key: 'refunds', label: '↩️ Vračila', count: refunds?.refund_count || 0 },
    { key: 'reconciliation', label: '⚖️ Usklajevanje' },
    { key: 'analytics', label: '📊 Analitika' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">💳 Plačila V2</h2>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>
            {t.label}{'count' in t && t.count !== undefined && <span style={{ marginLeft: 4, background: 'var(--primary)', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 11 }}>{t.count}</span>}
          </button>
        ))}
      </div>

      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'methods' && methods && (
            <div>
              {methods.methods?.map((m: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{m.name}</span>
                    <span style={{ fontWeight: 700, color: '#22c55e' }}>{m.total.toFixed(2)} €</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666' }}>
                    <span>{m.count} transakcij</span>
                    <span>{m.percentage}%</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: 4, height: 6, marginTop: 6 }}>
                    <div style={{ background: '#3b82f6', height: '100%', borderRadius: 4, width: `${m.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'transactions' && transactions && (
            <div>
              {transactions.transactions?.map((t: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8, borderLeft: `4px solid ${t.status === 'completed' ? '#22c55e' : '#ef4444'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ fontWeight: 600 }}>#{t.id}</div>
                    <span style={{ fontWeight: 700, color: t.status === 'completed' ? '#22c55e' : '#ef4444' }}>{t.amount.toFixed(2)} €</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                    <span>{t.method}</span>
                    <span>/{t.tip} € napitnina</span>
                    <span>{t.server}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{t.date} · Naročilo #{t.order_id}</div>
                </div>
              ))}
            </div>
          )}

          {tab === 'tips' && tips && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Skupaj napitnin', value: `${tips.total_tips} €`, color: '#f59e0b' },
                  { label: 'Povp. napitnina', value: `${tips.avg_tip} €`, color: '#22c55e' },
                  { label: 'Stopnja napitnin', value: `${tips.tip_rate}%`, color: '#3b82f6' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <h4 style={{ margin: '0 0 8px' }}>Po zaposlenih</h4>
              {tips.by_employee?.map((e: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{e.name}</span>
                    <span style={{ fontWeight: 700, color: '#f59e0b' }}>{e.tips} €</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>{e.count} napitnin · Povp. {e.avg_tip} € ({e.tip_pct}%)</div>
                </div>
              ))}
            </div>
          )}

          {tab === 'refunds' && refunds && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Vračila', value: `${refunds.total_refunds} €`, color: '#ef4444' },
                  { label: 'Število', value: refunds.refund_count, color: '#f59e0b' },
                  { label: 'Stopnja', value: `${refunds.refund_rate}%`, color: '#8b5cf6' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {refunds.refunds?.map((r: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8, borderLeft: '4px solid #ef4444' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>Naročilo #{r.order_id}</span>
                    <span style={{ fontWeight: 700, color: '#ef4444' }}>{r.amount} €</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>Razlog: {r.reason} · {r.processed_by}</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{r.date} · {r.status === 'completed' ? '✅ Zaključeno' : '⏳ V čakanju'}</div>
                </div>
              ))}
            </div>
          )}

          {tab === 'reconciliation' && reconciliation && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Pričakovano', value: `${reconciliation.expected.total.toFixed(2)} €`, color: '#3b82f6' },
                  { label: 'Dejansko', value: `${reconciliation.actual.total.toFixed(2)} €`, color: '#22c55e' },
                  { label: 'Razlika', value: `${reconciliation.difference.toFixed(2)} €`, color: reconciliation.difference === 0 ? '#22c55e' : '#ef4444' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {reconciliation.notes && <div className="card" style={{ padding: 12, marginBottom: 8, borderLeft: '4px solid #f59e0b', fontSize: 13 }}>⚠️ {reconciliation.notes}</div>}
            </div>
          )}

          {tab === 'analytics' && analytics && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Skupaj prihodek', value: `${analytics.total_revenue?.toFixed(0)} €`, color: '#22c55e' },
                  { label: 'Neto prihodek', value: `${analytics.net_revenue?.toFixed(0)} €`, color: '#3b82f6' },
                  { label: 'Povp. naročilo', value: `${analytics.avg_order_value} €`, color: '#8b5cf6' },
                  { label: 'Napitnine', value: `${analytics.total_tips?.toFixed(0)} €`, color: '#f59e0b' },
                  { label: 'Vračila', value: `${analytics.total_refunds?.toFixed(0)} €`, color: '#ef4444' },
                  { label: 'Kartice', value: `${analytics.card_percentage}%`, color: '#3b82f6' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}