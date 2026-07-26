import { useState, useEffect } from 'react'
import * as api from './api'

export default function OrdersV3Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'patterns' | 'customization' | 'preferences' | 'analytics'>('patterns')
  const [patterns, setPatterns] = useState<any>(null)
  const [customization, setCustomization] = useState<any>(null)
  const [preferences, setPreferences] = useState<any>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/orders-v3/patterns', { headers: api.h() }).then(r => r.json()).then(setPatterns),
      fetch('/api/v1/orders-v3/customization', { headers: api.h() }).then(r => r.json()).then(setCustomization),
      fetch('/api/v1/orders-v3/customer-preferences', { headers: api.h() }).then(r => r.json()).then(setPreferences),
      fetch('/api/v1/orders-v3/analytics', { headers: api.h() }).then(r => r.json()).then(setAnalytics),
    ]).catch(() => onNotify('Napaka')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'patterns', label: '📊 Vzorci' },
    { key: 'customization', label: '🎨 Prilagoditve' },
    { key: 'preferences', label: '👤 Preference' },
    { key: 'analytics', label: '📈 Analitika' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm"><h2 className="page-title">📋 Naročila V3</h2></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>{t.label}</button>
        ))}
      </div>
      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'patterns' && patterns && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Povp. vrednost', value: `${patterns.avg_order_value} €`, color: '#3b82f6' },
                  { label: 'Povp. artiklov', value: patterns.avg_items_per_order, color: '#8b5cf6' },
                  { label: 'Priljubljeni kombo', value: patterns.popular_combos?.[0]?.items, color: '#f59e0b' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <h4 style={{ margin: '0 0 8px' }}>⏰ Vrhnje ure</h4>
              {patterns.peak_hours?.map((h: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{h.hour}</span>
                    <span style={{ fontWeight: 700, color: '#3b82f6' }}>{h.orders} naročil</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: 4, height: 6 }}>
                    <div style={{ background: '#3b82f6', height: '100%', borderRadius: 4, width: `${(h.orders / 40) * 100}%` }} />
                  </div>
                </div>
              ))}
              <h4 style={{ margin: '16px 0 8px' }}>📅 Vrhnji dnevi</h4>
              {patterns.peak_days?.map((d: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>{d.day}</span>
                  <span style={{ fontWeight: 700, color: '#8b5cf6' }}>{d.orders} naročil</span>
                </div>
              ))}
            </div>
          )}
          {tab === 'customization' && customization && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Prilagoditve</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#8b5cf6' }}>{customization.total_customizations}</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Posebne zahteve</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b' }}>{customization.special_requests_rate}%</div>
                </div>
              </div>
              {customization.popular_customizations?.map((c: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>{c.item}</div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {c.customizations?.map((cu: string, j: number) => (
                      <span key={j} style={{ background: '#e5e7eb', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>{cu}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'preferences' && preferences && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Vračajoče se stranke</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>{preferences.returning_customer_orders}%</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Povp. naročil/stranko</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6' }}>{preferences.avg_orders_per_customer}</div>
                </div>
              </div>
              <h4 style={{ margin: '0 0 8px' }}>👤 Top preference</h4>
              {preferences.top_preferences?.map((p: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{p.customer}</span>
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>{p.avg_spend} €</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>Zadnje: {p.last_order} · {p.frequency}×</div>
                </div>
              ))}
            </div>
          )}
          {tab === 'analytics' && analytics && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Danes', value: analytics.total_orders_today, color: '#3b82f6' },
                  { label: 'Prihodek', value: `${analytics.total_revenue_today} €`, color: '#22c55e' },
                  { label: 'Povp. priprava', value: `${analytics.avg_preparation_time} min`, color: '#f59e0b' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <h4 style={{ margin: '0 0 8px' }}>📋 Po tipu</h4>
              {analytics.by_type?.map((t: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{t.type}</span>
                    <span style={{ fontWeight: 700, color: '#3b82f6' }}>{t.count} ({t.pct}%)</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: 4, height: 6 }}>
                    <div style={{ background: '#3b82f6', height: '100%', borderRadius: 4, width: `${t.pct}%` }} />
                  </div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Povp. vrednost: {t.avg_value} €</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}