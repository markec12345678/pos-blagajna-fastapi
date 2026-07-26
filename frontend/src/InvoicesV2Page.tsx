import { useState, useEffect } from 'react'
import * as api from './api'

export default function InvoicesV2Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'list' | 'analytics'>('list')
  const [list, setList] = useState<any>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/invoices-v2/list', { headers: api.h() }).then(r => r.json()).then(setList),
      fetch('/api/v1/invoices-v2/analytics', { headers: api.h() }).then(r => r.json()).then(setAnalytics),
    ]).catch(() => onNotify('Napaka pri nalaganju')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'list', label: '🧾 Računi', count: list?.total || 0 },
    { key: 'analytics', label: '📊 Analitika' },
  ] as const

  const statusMap: Record<string, { label: string; color: string; bg: string }> = {
    paid: { label: 'Plačan', color: '#16a34a', bg: '#dcfce7' },
    partial: { label: 'Delno plačan', color: '#d97706', bg: '#fef3c7' },
    pending: { label: 'Neplačan', color: '#dc2626', bg: '#fee2e2' },
  }

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">🧾 Računi V2</h2>
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
          {tab === 'list' && list && (
            <div>
              {list.invoices?.map((inv: any, i: number) => {
                const st = statusMap[inv.status] || statusMap.pending
                return (
                  <div key={i} className="card" style={{ padding: 14, marginBottom: 8, borderLeft: `4px solid ${st.color}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div>
                        <span style={{ fontWeight: 600 }}>{inv.id}</span>
                        <span style={{ marginLeft: 8, fontSize: 12, color: '#888' }}>{inv.type}</span>
                      </div>
                      <span style={{ background: st.bg, color: st.color, padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{st.label}</span>
                    </div>
                    <div style={{ fontSize: 13, marginBottom: 4 }}>🏢 {inv.client}</div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                      <span>Znesek: <b>{inv.amount.toFixed(2)} €</b></span>
                      <span>Plačano: <b style={{ color: inv.paid > 0 ? '#22c55e' : '#ef4444' }}>{inv.paid.toFixed(2)} €</b></span>
                      <span>Rok: {inv.due_date}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{inv.date}</div>
                  </div>
                )
              })}
            </div>
          )}

          {tab === 'analytics' && analytics && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Skupaj', value: `${analytics.total_invoiced?.toFixed(0)} €`, color: '#3b82f6' },
                  { label: 'Plačano', value: `${analytics.total_paid?.toFixed(0)} €`, color: '#22c55e' },
                  { label: 'Neplačano', value: `${analytics.total_outstanding?.toFixed(0)} €`, color: '#ef4444' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Povp. plačilo</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#8b5cf6' }}>{analytics.avg_payment_days} dni</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Stopnja izterjave</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#22c55e' }}>{analytics.collection_rate}%</div>
                </div>
              </div>
              <h4 style={{ margin: '0 0 8px' }}>Po tipu</h4>
              {analytics.by_type?.map((t: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>{t.type}</span>
                  <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
                    <span>{t.count} računov</span>
                    <span>Skupaj: {t.total.toFixed(0)} €</span>
                    <span>Plačano: <b style={{ color: '#22c55e' }}>{t.paid.toFixed(0)} €</b></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}