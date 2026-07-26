import { useState, useEffect } from 'react'
import * as api from './api'

export default function PromotionsV3Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'active' | 'analytics' | 'tiers'>('active')
  const [active, setActive] = useState<any>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [tiers, setTiers] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/promotions-v3/active', { headers: api.h() }).then(r => r.json()).then(setActive),
      fetch('/api/v1/promotions-v3/analytics', { headers: api.h() }).then(r => r.json()).then(setAnalytics),
      fetch('/api/v1/promotions-v3/loyalty-tiers', { headers: api.h() }).then(r => r.json()).then(setTiers),
    ]).catch(() => onNotify('Napaka pri nalaganju')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'active', label: '🏷️ Aktivne', count: active?.total || 0 },
    { key: 'analytics', label: '📊 Analitika' },
    { key: 'tiers', label: '🏆 Stopnje zvestobe' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">🏷️ Promocije V3</h2>
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
          {tab === 'active' && active && (
            <div>
              {active.promotions?.map((p: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8, borderLeft: '4px solid #3b82f6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ background: '#dbeafe', color: '#2563eb', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{p.type}</span>
                      <span style={{ fontWeight: 700, color: '#22c55e' }}>-{p.discount}%</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#666' }}>
                    <span>Uporab: {p.used}×</span>
                    <span>Vpliv: +{p.revenue_impact.toFixed(0)} €</span>
                    <span>Velja do: {p.valid_until}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'analytics' && analytics && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Aktivne', value: analytics.total_active, color: '#3b82f6' },
                  { label: 'Uporabe', value: analytics.total_used, color: '#22c55e' },
                  { label: 'Vpliv', value: `${analytics.total_revenue_impact.toFixed(0)} €`, color: '#f59e0b' },
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
                  <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                    <span>{t.count} promocij</span>
                    <span>{t.used}× uporab</span>
                    <span style={{ color: '#22c55e' }}>{t.revenue.toFixed(0)} €</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'tiers' && tiers && (
            <div>
              {tiers.tiers?.map((t: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8, borderLeft: `4px solid ${t.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>{t.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#888', fontSize: 12 }}>{t.members} članov</span>
                      <span style={{ background: t.color, color: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>-{t.discount}% popust</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>Min. točk: {t.min_points}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}