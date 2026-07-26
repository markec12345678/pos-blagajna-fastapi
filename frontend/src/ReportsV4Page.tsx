import { useState, useEffect } from 'react'
import * as api from './api'

export default function ReportsV4Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'financial' | 'comparison' | 'kpi' | 'categories'>('financial')
  const [financial, setFinancial] = useState<any>(null)
  const [comparison, setComparison] = useState<any>(null)
  const [kpi, setKpi] = useState<any>(null)
  const [categories, setCategories] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/reports-v4/financial', { headers: api.h() }).then(r => r.json()).then(setFinancial),
      fetch('/api/v1/reports-v4/comparison', { headers: api.h() }).then(r => r.json()).then(setComparison),
      fetch('/api/v1/reports-v4/kpi-dashboard', { headers: api.h() }).then(r => r.json()).then(setKpi),
      fetch('/api/v1/reports-v4/category-breakdown', { headers: api.h() }).then(r => r.json()).then(setCategories),
    ]).catch(() => onNotify('Napaka pri nalaganju')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'financial', label: '💰 Finančno' },
    { key: 'comparison', label: '📊 Primerjava' },
    { key: 'kpi', label: '🎯 KPI' },
    { key: 'categories', label: '📦 Kategorije' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">📊 Poročila V3</h2>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>{t.label}</button>
        ))}
      </div>

      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'financial' && financial && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Prihodek', value: `${financial.revenue?.current?.toFixed(0)} €`, color: '#22c55e' },
                  { label: 'Stroški', value: `${financial.costs?.total?.toFixed(0)} €`, color: '#ef4444' },
                  { label: 'Dobiček', value: `${financial.profit?.net?.toFixed(0)} €`, color: '#3b82f6' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <h4 style={{ margin: '0 0 8px' }}>📋 Struktura stroškov</h4>
              {[
                { name: 'Hrana', amount: financial.costs?.food, pct: ((financial.costs?.food / financial.revenue?.current) * 100).toFixed(1) },
                { name: 'Delo', amount: financial.costs?.labor, pct: ((financial.costs?.labor / financial.revenue?.current) * 100).toFixed(1) },
                { name: 'Najemnina', amount: financial.costs?.rent, pct: ((financial.costs?.rent / financial.revenue?.current) * 100).toFixed(1) },
                { name: 'Stroški', amount: financial.costs?.utilities, pct: ((financial.costs?.utilities / financial.revenue?.current) * 100).toFixed(1) },
              ].map((c, i) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>{c.name}</span>
                  <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
                    <span>{c.pct}%</span>
                    <span style={{ fontWeight: 600 }}>{c.amount?.toFixed(0)} €</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'comparison' && comparison && (
            <div>
              {comparison.comparison?.map((c: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>{c.month}</div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                    <span>Prihodek: <b style={{ color: '#22c55e' }}>{c.revenue.toFixed(0)} €</b></span>
                    <span>Stroški: <b style={{ color: '#ef4444' }}>{c.costs.toFixed(0)} €</b></span>
                    <span>Dobiček: <b style={{ color: '#3b82f6' }}>{c.profit.toFixed(0)} €</b></span>
                    <span>Gosti: <b>{c.covers}</b></span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'kpi' && kpi && (
            <div>
              <div className="card" style={{ padding: 14, marginBottom: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#888' }}>Skupaj KPI</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: kpi.overall_score >= 80 ? '#22c55e' : '#f59e0b' }}>{kpi.overall_score}/100</div>
              </div>
              {kpi.kpis?.map((k: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8, borderLeft: `4px solid ${k.status === 'above' ? '#22c55e' : '#f59e0b'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{k.name}</span>
                    <span style={{ fontSize: 11, color: k.trend === 'increasing' ? '#22c55e' : k.trend === 'decreasing' ? '#ef4444' : '#888' }}>{k.trend === 'increasing' ? '📈' : k.trend === 'decreasing' ? '📉' : '➡️'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span>Trenutno: <b>{k.value}{k.unit === 'EUR' ? ' €' : k.unit === '%' ? '%' : ''}</b></span>
                    <span>Cilj: {k.target}{k.unit === 'EUR' ? ' €' : k.unit === '%' ? '%' : ''}</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: 4, height: 6, marginTop: 6 }}>
                    <div style={{ background: k.status === 'above' ? '#22c55e' : '#f59e0b', height: '100%', borderRadius: 4, width: `${Math.min((k.value / k.target) * 100, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'categories' && categories && (
            <div>
              {categories.categories?.map((c: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                    <span style={{ fontWeight: 700, color: '#22c55e' }}>{c.revenue.toFixed(0)} €</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                    <span>Strošek: {c.cost.toFixed(0)} €</span>
                    <span>Marža: <b>{c.margin}%</b></span>
                    <span>Prodanih: {c.items_sold}</span>
                    <span>Povp. cena: {c.avg_price} €</span>
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