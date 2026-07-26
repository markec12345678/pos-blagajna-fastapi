import { useState, useEffect } from 'react'
import * as api from './api'

export default function CrmV2Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'customers' | 'segments' | 'interactions' | 'analytics'>('customers')
  const [customers, setCustomers] = useState<any[]>([])
  const [segments, setSegments] = useState<any>(null)
  const [interactions, setInteractions] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/crm-v2/customers', { headers: api.h() }).then(r => r.json()).then(d => setCustomers(d.customers || [])),
      fetch('/api/v1/crm-v2/segments', { headers: api.h() }).then(r => r.json()).then(setSegments),
      fetch('/api/v1/crm-v2/interactions', { headers: api.h() }).then(r => r.json()).then(d => setInteractions(d.interactions || [])),
      fetch('/api/v1/crm-v2/analytics', { headers: api.h() }).then(r => r.json()).then(setAnalytics),
    ]).catch(() => onNotify('Napaka pri nalaganju')).finally(() => setLoading(false))
  }, [])

  const segmentColor = (s: string) => ({ VIP: '#f59e0b', Loyal: '#22c55e', Potential: '#3b82f6', 'At Risk': '#ef4444', Lost: '#6b7280' }[s] || '#6b7280')
  const interactionIcon = (t: string) => ({ visit: '🍽️', feedback: '💬', complaint: '⚠️', call: '📞', email: '📧' }[t] || '📌')
  const filtered = search ? customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase())) : customers

  const tabs = [
    { key: 'customers', label: '👥 Stranke', count: customers.length },
    { key: 'segments', label: '📊 Segmenti' },
    { key: 'interactions', label: '💬 Interakcije', count: interactions.length },
    { key: 'analytics', label: '📈 Analitika' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">👤 CRM</h2>
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
          {tab === 'customers' && (
            <div>
              <input className="input" placeholder="🔍 Iskanje strank..." value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: 12 }} />
              {filtered.map((c, i) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{c.email} · {c.phone}</div>
                    </div>
                    <span style={{ background: segmentColor(c.segment), color: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>{c.segment}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12, color: '#666' }}>
                    <span>Obiski: {c.total_visits}</span>
                    <span>Skupaj: {c.total_spent?.toFixed(0)} €</span>
                    <span>Tocke: {c.loyalty_points}</span>
                  </div>
                  {c.tags?.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                      {c.tags.map((t: string, j: number) => (
                        <span key={j} style={{ background: '#e0e7ff', color: '#3730a3', padding: '1px 6px', borderRadius: 8, fontSize: 11 }}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === 'segments' && segments && (
            <div>
              {segments.segments?.map((s: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontWeight: 600 }}>{s.name}</div>
                    <span style={{ background: segmentColor(s.name), color: '#fff', padding: '2px 10px', borderRadius: 12, fontSize: 12 }}>{s.count} strank</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>{s.description}</div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#666' }}>
                    <span>Povprečje obiskov: {s.avg_visits}</span>
                    <span>Povprečje porabe: {s.avg_spend?.toFixed(0)} €</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'interactions' && (
            <div>
              {interactions.map((inter, i) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 20 }}>{interactionIcon(inter.type)}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{inter.customer}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{inter.description}</div>
                      <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>{inter.date}</div>
                    </div>
                    {inter.amount && <div style={{ fontWeight: 600, color: '#22c55e' }}>{inter.amount.toFixed(0)} €</div>}
                    {inter.rating && <div style={{ fontWeight: 600, color: '#f59e0b' }}>⭐ {inter.rating}/5</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'analytics' && analytics && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Skupaj strank', value: analytics.customer_metrics?.total_customers || 0, color: '#3b82f6' },
                  { label: 'Nove stranke', value: analytics.customer_metrics?.new_customers || 0, color: '#22c55e' },
                  { label: 'Retencija', value: `${analytics.customer_metrics?.retention_rate || 0}%`, color: '#22c55e' },
                  { label: 'NPS', value: analytics.satisfaction?.nps_score || 0, color: '#f59e0b' },
                  { label: 'Povprečna vrednost', value: `${analytics.engagement?.avg_spend_per_customer?.toFixed(0) || 0} €`, color: '#3b82f6' },
                  { label: 'Zadovoljstvo', value: `${analytics.satisfaction?.satisfaction_rate || 0}%`, color: '#22c55e' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {analytics.insights?.length > 0 && (
                <div className="card" style={{ padding: 14 }}>
                  <h4 style={{ margin: '0 0 8px' }}>💡 Uvidi</h4>
                  {analytics.insights.map((ins: string, i: number) => (
                    <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>• {ins}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}