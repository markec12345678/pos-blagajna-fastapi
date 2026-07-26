import { useState, useEffect } from 'react'
import * as api from './api'

export default function CustomersV3Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'profiles' | 'preferences' | 'ltv' | 'segmentation'>('profiles')
  const [profiles, setProfiles] = useState<any>(null)
  const [preferences, setPreferences] = useState<any>(null)
  const [ltv, setLtv] = useState<any>(null)
  const [segmentation, setSegmentation] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/customers-v3/profiles', { headers: api.h() }).then(r => r.json()).then(setProfiles),
      fetch('/api/v1/customers-v3/preferences', { headers: api.h() }).then(r => r.json()).then(setPreferences),
      fetch('/api/v1/customers-v3/ltv', { headers: api.h() }).then(r => r.json()).then(setLtv),
      fetch('/api/v1/customers-v3/segmentation', { headers: api.h() }).then(r => r.json()).then(setSegmentation),
    ]).catch(() => onNotify('Napaka')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'profiles', label: '👤 Profili' },
    { key: 'preferences', label: '🍽️ Preference' },
    { key: 'ltv', label: '💰 LTV' },
    { key: 'segmentation', label: '📊 Segmentacija' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm"><h2 className="page-title">👥 Stranke V3</h2></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>{t.label}</button>
        ))}
      </div>
      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'profiles' && profiles && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                {[
                  { label: 'Skupaj', value: profiles.total, color: '#3b82f6' },
                  { label: 'Aktivne', value: profiles.active, color: '#22c55e' },
                  { label: 'VIP', value: profiles.vip, color: '#f59e0b' },
                  { label: 'Nove', value: profiles.new_this_month, color: '#8b5cf6' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888' }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {profiles.profiles?.map((p: any) => (
                <div key={p.id} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{p.vip ? '⭐ ' : ''}{p.name}</span>
                    <span style={{ background: p.segment === 'Redni' ? '#dcfce7' : p.segment === 'Novi' ? '#fef3c7' : '#dbeafe', color: p.segment === 'Redni' ? '#16a34a' : p.segment === 'Novi' ? '#d97706' : '#2563eb', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{p.segment}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12, color: '#666' }}>
                    <span>🚪 {p.visits} obiskov</span>
                    <span>💰 {p.total_spent.toFixed(2)} €</span>
                    <span>📅 {p.last_visit}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'preferences' && preferences && (
            <div>
              <h4 style={{ margin: '0 0 8px' }}>🍽️ Prehranske preference</h4>
              {preferences.dietary_preferences?.map((d: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{d.type}</span>
                    <span>{d.count} strank ({d.pct}%)</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: 4, height: 6 }}>
                    <div style={{ background: '#8b5cf6', height: '100%', borderRadius: 4, width: `${d.pct * 3}%` }} />
                  </div>
                </div>
              ))}
              <h4 style={{ margin: '16px 0 8px' }}>⭐ Najljubše kategorije</h4>
              {preferences.favorite_categories?.map((c: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                    <span>{c.pct}%</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: 4, height: 6 }}>
                    <div style={{ background: '#f59e0b', height: '100%', borderRadius: 4, width: `${c.pct}%` }} />
                  </div>
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
                <div className="card" style={{ padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Povp. velikost skupine</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#3b82f6' }}>{preferences.avg_party_size}</div>
                </div>
                <div className="card" style={{ padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Priljubljeni čas</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b' }}>{preferences.preferred_time}</div>
                </div>
              </div>
            </div>
          )}
          {tab === 'ltv' && ltv && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Povp. LTV', value: `${ltv.avg_ltv} €`, color: '#3b82f6' },
                  { label: 'Mediana LTV', value: `${ltv.median_ltv} €`, color: '#8b5cf6' },
                  { label: 'Top 10%', value: `${ltv.top_10pct_ltv} €`, color: '#f59e0b' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <h4 style={{ margin: '0 0 8px' }}>📊 Porazdelitev LTV</h4>
              {ltv.ltv_distribution?.map((d: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{d.range}</span>
                    <span>{d.count} strank ({d.pct}%)</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: 4, height: 6 }}>
                    <div style={{ background: '#22c55e', height: '100%', borderRadius: 4, width: `${d.pct}%` }} />
                  </div>
                </div>
              ))}
              <div className="card" style={{ padding: 14, marginTop: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#888' }}>Napoved 12 mesecev</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#22c55e' }}>{ltv.predicted_12mo?.total?.toLocaleString()} € (+{ltv.predicted_12mo?.growth}%)</div>
              </div>
            </div>
          )}
          {tab === 'segmentation' && segmentation && (
            <div>
              {segmentation.rfm?.map((s: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8, borderLeft: `4px solid ${i === 0 ? '#f59e0b' : i === 1 ? '#22c55e' : i === 2 ? '#3b82f6' : i === 3 ? '#ef4444' : '#94a3b8'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{s.segment}</span>
                    <span style={{ fontWeight: 700, color: '#3b82f6' }}>{s.count} strank</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{s.description}</div>
                  <div style={{ fontSize: 11, color: '#8b5cf6', fontWeight: 600 }}>Akcijski predlog: {s.action}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}