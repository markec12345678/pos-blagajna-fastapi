import { useState, useEffect } from 'react'
import * as api from './api'

export default function PromotionsV2Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'list' | 'analytics' | 'loyalty'>('list')
  const [promos, setPromos] = useState<any[]>([])
  const [promoAnalytics, setPromoAnalytics] = useState<any>(null)
  const [loyalty, setLoyalty] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/promotions-v2/', { headers: api.h() }).then(r => r.json()).then(d => setPromos(d.promotions || [])),
      fetch('/api/v1/promotions-v2/analytics', { headers: api.h() }).then(r => r.json()).then(setPromoAnalytics),
      fetch('/api/v1/promotions-v2/loyalty', { headers: api.h() }).then(r => r.json()).then(setLoyalty),
    ]).catch(() => onNotify('Napaka pri nalaganju')).finally(() => setLoading(false))
  }, [])

  const statusColor = (s: string) => ({ active: '#22c55e', expired: '#6b7280', paused: '#f59e0b' }[s] || '#6b7280')
  const typeLabel = (t: string) => ({ percentage: '% popust', fixed: 'Fiksni popust', buy_x_get_y: 'Kupi X dobi Y', combo: 'Komplet' }[t] || t)
  const tierColor = (t: string) => ({ Bronasti: '#cd7f32', Srebrni: '#94a3b8', Zlati: '#f59e0b', Platina: '#8b5cf6' }[t] || '#6b7280')

  const tabs = [
    { key: 'list', label: '🏷️ Promocije', count: promos.length },
    { key: 'analytics', label: '📊 Analitika' },
    { key: 'loyalty', label: '🎁 Program zvestobe' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">🏷️ Promocije V2</h2>
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
              {promos.map((p, i) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{typeLabel(p.type)} · {p.value}{p.type === 'percentage' ? '%' : ' €'}</div>
                    </div>
                    <span style={{ background: statusColor(p.status), color: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>{p.status === 'active' ? 'Aktivna' : p.status === 'expired' ? 'Potekla' : 'Pavzirana'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#666' }}>
                    <span>Uporabe: {p.usage_count}</span>
                    <span>Vpliv: {p.revenue_impact?.toFixed(0)} €</span>
                    <span>{p.start_date} — {p.end_date}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'analytics' && promoAnalytics && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Aktivne promocije', value: promoAnalytics.active_promotions || 0, color: '#22c55e' },
                  { label: 'Skupaj uporab', value: promoAnalytics.total_usage || 0, color: '#3b82f6' },
                  { label: 'Povp. popust', value: `${promoAnalytics.avg_discount_per_order?.toFixed(2) || 0} €`, color: '#f59e0b' },
                  { label: 'Konverzija', value: `${promoAnalytics.conversion_rate || 0}%`, color: '#8b5cf6' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <h4 style={{ margin: '0 0 8px' }}>🏆 Najboljše promocije</h4>
              {promoAnalytics.top_performing?.map((p: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>#{i + 1} {p.name}</span>
                      <div style={{ fontSize: 12, color: '#888' }}>Uporabe: {p.usage} · Vpliv: {p.revenue_impact?.toFixed(0)} €</div>
                    </div>
                    <span style={{ fontWeight: 700, color: '#22c55e' }}>ROI: {p.roi}×</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'loyalty' && loyalty && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Člani', value: loyalty.total_members || 0, color: '#3b82f6' },
                  { label: 'Točke izdane', value: loyalty.total_points_issued || 0, color: '#f59e0b' },
                  { label: 'Unovčitve', value: loyalty.total_redemptions || 0, color: '#22c55e' },
                  { label: 'Povp. točke', value: loyalty.avg_points_per_member?.toFixed(0) || 0, color: '#8b5cf6' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {loyalty.tiers?.map((t: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 16 }}>{t.name}</span>
                      <span style={{ background: tierColor(t.name), color: '#fff', padding: '2px 8px', borderRadius: 8, fontSize: 11 }}>{t.members} članov</span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: tierColor(t.name) }}>{t.discount}% popust</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Min. točk: {t.min_points}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {t.benefits?.map((b: string, j: number) => (
                      <span key={j} style={{ background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: 8, fontSize: 11 }}>✓ {b}</span>
                    ))}
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