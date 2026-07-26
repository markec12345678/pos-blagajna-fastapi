import { useState, useEffect } from 'react'
import * as api from './api'

export default function PriceRulesV2Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'rules' | 'analytics' | 'combos'>('rules')
  const [rules, setRules] = useState<any>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [combos, setCombos] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/price-rules-v2/rules', { headers: api.h() }).then(r => r.json()).then(setRules),
      fetch('/api/v1/price-rules-v2/analytics', { headers: api.h() }).then(r => r.json()).then(setAnalytics),
      fetch('/api/v1/price-rules-v2/combos', { headers: api.h() }).then(r => r.json()).then(setCombos),
    ]).catch(() => onNotify('Napaka')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'rules', label: '💲 Pravila', count: rules?.active || 0 },
    { key: 'analytics', label: '📊 Analitika' },
    { key: 'combos', label: '📦 Kombinacije' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm"><h2 className="page-title">💲 Pravila cen V2</h2></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>{t.label}</button>
        ))}
      </div>
      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'rules' && rules && (
            <div>
              {rules.rules?.map((r: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8, borderLeft: `4px solid ${r.status === 'active' ? '#22c55e' : '#94a3b8'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontWeight: 600 }}>{r.name}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ background: '#dbeafe', color: '#2563eb', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{r.type}</span>
                      <span style={{ fontWeight: 700, color: '#22c55e' }}>-{r.discount}%</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Pogoji: {r.conditions}</div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                    <span>Danes uporab: {r.applied_today}</span>
                    <span>Vpliv: {r.revenue_impact} €</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'analytics' && analytics && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Aktivna pravila', value: analytics.active_rules, color: '#22c55e' },
                  { label: 'Danes uporab', value: analytics.total_applications_today, color: '#3b82f6' },
                  { label: 'Vpliv', value: `${analytics.total_revenue_impact} €`, color: '#ef4444' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <h4 style={{ margin: '0 0 8px' }}>Po tipu</h4>
              {analytics.by_type?.map((t: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>{t.type}</span>
                  <div style={{ fontSize: 12 }}>
                    {t.applications} uporab · {t.impact} €
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'combos' && combos && (
            <div>
              {combos.combos?.map((c: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                    <span style={{ fontWeight: 700, color: '#22c55e' }}>{c.combo_price.toFixed(2)} €</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                    {c.items?.map((item: string, j: number) => (
                      <span key={j} style={{ background: '#e5e7eb', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>{item}</span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                    <span>Redna cena: {c.original_price.toFixed(2)} €</span>
                    <span>Prihranek: <b style={{ color: '#22c55e' }}>{c.savings.toFixed(2)} €</b></span>
                    <span>Priljubljenost: {c.popularity}%</span>
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