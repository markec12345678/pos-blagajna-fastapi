import { useState, useEffect } from 'react'
import * as api from './api'

export default function BranchesV2Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'list' | 'comparison' | 'performance'>('list')
  const [list, setList] = useState<any>(null)
  const [comparison, setComparison] = useState<any>(null)
  const [performance, setPerformance] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/branches-v2/list', { headers: api.h() }).then(r => r.json()).then(setList),
      fetch('/api/v1/branches-v2/comparison', { headers: api.h() }).then(r => r.json()).then(setComparison),
      fetch('/api/v1/branches-v2/performance?branch_id=1', { headers: api.h() }).then(r => r.json()).then(setPerformance),
    ]).catch(() => onNotify('Napaka')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'list', label: '🏢 Poslovalnice', count: list?.total || 0 },
    { key: 'comparison', label: '📊 Primerjava' },
    { key: 'performance', label: '📈 Uspešnost' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm"><h2 className="page-title">🏢 Poslovalnice V2</h2></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>{t.label}</button>
        ))}
      </div>
      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'list' && list && (
            <div>
              {list.branches?.map((b: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8, borderLeft: '4px solid #22c55e' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontWeight: 600 }}>{b.name}</div>
                    <span style={{ fontWeight: 700, color: '#22c55e' }}>{b.revenue_today.toFixed(0)} €</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>📍 {b.location}</div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                    <span>👥 {b.covers_today} gostov</span>
                    <span>🧑‍🍳 {b.staff_on_duty} osebja</span>
                    <span>⭐ {b.avg_rating}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'comparison' && comparison && (
            <div>
              {comparison.branches?.map((b: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>{b.name}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12 }}>
                    <div style={{ textAlign: 'center' }}><div style={{ color: '#888', fontSize: 10 }}>Prihodek</div><b>{b.revenue.toFixed(0)} €</b></div>
                    <div style={{ textAlign: 'center' }}><div style={{ color: '#888', fontSize: 10 }}>Gosti</div><b>{b.covers}</b></div>
                    <div style={{ textAlign: 'center' }}><div style={{ color: '#888', fontSize: 10 }}>Povp.</div><b>{b.avg_order.toFixed(0)} €</b></div>
                    <div style={{ textAlign: 'center' }}><div style={{ color: '#888', fontSize: 10 }}>Ocena</div><b>⭐ {b.avg_rating}</b></div>
                    <div style={{ textAlign: 'center' }}><div style={{ color: '#888', fontSize: 10 }}>Delo %</div><b>{b.labor_cost_pct}%</b></div>
                    <div style={{ textAlign: 'center' }}><div style={{ color: '#888', fontSize: 10 }}>Hrana %</div><b>{b.food_cost_pct}%</b></div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'performance' && performance && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Tedenski prihodek', value: `${performance.weekly_revenue?.toFixed(0)} €`, color: '#22c55e' },
                  { label: 'Tedenski gostje', value: performance.weekly_covers, color: '#3b82f6' },
                  { label: 'Najboljši dan', value: performance.best_day, color: '#f59e0b' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <h4 style={{ margin: '0 0 8px' }}>📅 Po dnevih</h4>
              {performance.daily?.map((d: any, i: number) => (
                <div key={i} className="card" style={{ padding: 8, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, width: 40 }}>{d.day}</span>
                  <div style={{ flex: 1, margin: '0 12px', background: '#e5e7eb', borderRadius: 4, height: 8 }}>
                    <div style={{ background: '#3b82f6', height: '100%', borderRadius: 4, width: `${(d.revenue / 3200) * 100}%` }} />
                  </div>
                  <span style={{ fontSize: 12, width: 60, textAlign: 'right' }}>{d.revenue.toFixed(0)} €</span>
                  <span style={{ fontSize: 11, color: '#888', width: 40, textAlign: 'right' }}>{d.covers}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}