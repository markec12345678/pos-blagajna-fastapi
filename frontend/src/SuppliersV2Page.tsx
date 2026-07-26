import { useState, useEffect } from 'react'
import * as api from './api'

export default function SuppliersV2Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'list' | 'comparison' | 'analytics'>('list')
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [comparison, setComparison] = useState<any>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/suppliers-v2/', { headers: api.h() }).then(r => r.json()).then(d => setSuppliers(d.suppliers || [])),
      fetch('/api/v1/suppliers-v2/price-comparison', { headers: api.h() }).then(r => r.json()).then(setComparison),
      fetch('/api/v1/suppliers-v2/stats', { headers: api.h() }).then(r => r.json()).then(setAnalytics),
    ]).catch(() => onNotify('Napaka pri nalaganju')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'list', label: '🏭 Dobavitelji', count: suppliers.length },
    { key: 'comparison', label: '💰 Primerjava cen' },
    { key: 'analytics', label: '📊 Analitika' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">🏭 Dobavitelji V2</h2>
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
              {suppliers.map((s, i) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{s.category} · Zadnje naročilo: {s.last_order}</div>
                    </div>
                    <span style={{ background: '#22c55e', color: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>Aktivno</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#666', marginBottom: 8 }}>
                    <span>⭐ {s.rating}</span>
                    <span>Pravočasno: {s.on_time_rate}%</span>
                    <span>Kakovost: {s.quality_rate}%</span>
                    <span>Naročila: {s.total_orders}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700 }}>{s.total_spent?.toFixed(0)} €</span>
                    <div style={{ background: '#e5e7eb', borderRadius: 6, height: 6, width: 100 }}>
                      <div style={{ background: '#22c55e', height: '100%', borderRadius: 6, width: `${s.on_time_rate}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'comparison' && comparison && (
            <div>
              {comparison.comparisons?.map((c: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>{c.item}</div>
                  {c.prices?.map((p: any, j: number) => (
                    <div key={j} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                      <span>{p.supplier}</span>
                      <span style={{ fontWeight: p.supplier === c.best ? 700 : 400, color: p.supplier === c.best ? '#22c55e' : '#666' }}>{p.price?.toFixed(2)} €/{p.unit}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 8, fontSize: 12, color: '#22c55e' }}>Najboljša cena: {c.best}</div>
                </div>
              ))}
            </div>
          )}

          {tab === 'analytics' && analytics && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Dobavitelji', value: analytics.total_suppliers || 0, color: '#3b82f6' },
                  { label: 'Povp. ocena', value: `⭐ ${analytics.avg_rating?.toFixed(1) || 0}`, color: '#f59e0b' },
                  { label: 'Skupaj poraba', value: `${analytics.total_spent?.toFixed(0) || 0} €`, color: '#ef4444' },
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