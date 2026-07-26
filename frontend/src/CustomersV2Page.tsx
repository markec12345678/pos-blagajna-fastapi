import { useState, useEffect } from 'react'
import * as api from './api'

export default function CustomersV2Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'list' | 'segments' | 'analytics'>('list')
  const [customers, setCustomers] = useState<any[]>([])
  const [segments, setSegments] = useState<any>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [segFilter, setSegFilter] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/customers-v2/', { headers: api.h() }).then(r => r.json()).then(d => setCustomers(d.customers || [])),
      fetch('/api/v1/customers-v2/segments', { headers: api.h() }).then(r => r.json()).then(setSegments),
      fetch('/api/v1/customers-v2/stats', { headers: api.h() }).then(r => r.json()).then(setAnalytics),
    ]).catch(() => onNotify('Napaka pri nalaganju')).finally(() => setLoading(false))
  }, [])

  const segmentColor = (s: string) => ({ VIP: '#f59e0b', Loyal: '#22c55e', Potential: '#3b82f6', 'At Risk': '#ef4444', Lost: '#6b7280' }[s] || '#6b7280')
  const tierColor = (t: string) => ({ Zlati: '#f59e0b', Srebrni: '#94a3b8', Bronasti: '#cd7f32', Platina: '#8b5cf6' }[t] || '#6b7280')
  const filtered = customers.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.email?.toLowerCase().includes(search.toLowerCase())) return false
    if (segFilter && c.segment !== segFilter) return false
    return true
  })

  const tabs = [
    { key: 'list', label: '👥 Stranke', count: customers.length },
    { key: 'segments', label: '📊 Segmenti' },
    { key: 'analytics', label: '📈 Analitika' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">👥 Stranke V2</h2>
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
          {tab === 'list' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input className="input" placeholder="🔍 Iskanje..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
                <select className="input" value={segFilter} onChange={e => setSegFilter(e.target.value)} style={{ width: 130 }}>
                  <option value="">Vsi segmenti</option>
                  {['VIP', 'Loyal', 'Potential', 'At Risk', 'Lost'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {filtered.map((c, i) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600 }}>{c.name}</span>
                        <span style={{ background: segmentColor(c.segment), color: '#fff', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{c.segment}</span>
                        <span style={{ background: tierColor(c.tier), color: '#fff', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{c.tier}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{c.email} · {c.phone}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700 }}>{c.total_spent?.toFixed(0)} €</div>
                      <div style={{ fontSize: 11, color: '#888' }}>{c.loyalty_points} točk</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12, color: '#666' }}>
                    <span>Obiski: {c.total_visits}</span>
                    <span>Povp.: {c.avg_order?.toFixed(0)} €</span>
                    <span>Zadnji: {c.last_visit}</span>
                  </div>
                  {c.tags?.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                      {c.tags.map((t: string, j: number) => (
                        <span key={j} style={{ background: '#e0e7ff', color: '#3730a3', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{t}</span>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 16 }}>{s.name}</span>
                      <span style={{ background: segmentColor(s.name), color: '#fff', padding: '2px 10px', borderRadius: 12, fontSize: 12 }}>{s.count} strank</span>
                    </div>
                    <span style={{ fontSize: 13, color: '#22c55e', fontWeight: 600 }}>{s.retention}% retencija</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#666' }}>
                    <span>Povp. poraba: {s.avg_spend?.toFixed(0)} €</span>
                    <span>Povp. obiski: {s.avg_visits}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'analytics' && analytics && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Skupaj strank', value: analytics.total_customers || 0, color: '#3b82f6' },
                  { label: 'Aktivne', value: analytics.active_customers || 0, color: '#22c55e' },
                  { label: 'VIP', value: analytics.vip_customers || 0, color: '#f59e0b' },
                  { label: 'Retencija', value: `${analytics.retention_rate || 0}%`, color: '#22c55e' },
                  { label: 'Povp. vrednost', value: `${analytics.avg_lifetime_value?.toFixed(0) || 0} €`, color: '#3b82f6' },
                  { label: 'NPS', value: analytics.nps_score || 0, color: '#f59e0b' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
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