import { useState, useEffect } from 'react'
import * as api from './api'

export default function WarehouseV2Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'stock' | 'movements' | 'analytics' | 'categories'>('stock')
  const [stock, setStock] = useState<any[]>([])
  const [movements, setMovements] = useState<any>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [categories, setCategories] = useState<any>(null)
  const [catFilter, setCatFilter] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/warehouse-v2/stock', { headers: api.h() }).then(r => r.json()).then(d => setStock(d.items || [])),
      fetch('/api/v1/warehouse-v2/movements', { headers: api.h() }).then(r => r.json()).then(setMovements),
      fetch('/api/v1/warehouse-v2/analytics', { headers: api.h() }).then(r => r.json()).then(setAnalytics),
      fetch('/api/v1/warehouse-v2/categories', { headers: api.h() }).then(r => r.json()).then(setCategories),
    ]).catch(() => onNotify('Napaka pri nalaganju')).finally(() => setLoading(false))
  }, [])

  const statusColor = (s: string) => ({ ok: '#22c55e', low: '#f59e0b', out: '#ef4444' }[s] || '#6b7280')
  const movementTypeColor = (t: string) => ({ in: '#22c55e', out: '#ef4444', adjustment: '#f59e0b' }[t] || '#6b7280')
  const movementTypeLabel = (t: string) => ({ in: 'Vhod', out: 'Izhod', adjustment: 'Prilagoditev' }[t] || t)
  const filtered = catFilter ? stock.filter(s => s.category === catFilter) : stock

  const tabs = [
    { key: 'stock', label: '📦 Zaloge', count: stock.length },
    { key: 'movements', label: '🔄 Premiki' },
    { key: 'analytics', label: '📊 Analitika' },
    { key: 'categories', label: '📂 Kategorije' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">📦 Zaloge V2</h2>
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
          {tab === 'stock' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <select className="input" value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ width: 160 }}>
                  <option value="">Vse kategorije</option>
                  {[...new Set(stock.map(s => s.category))].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {filtered.map((item, i) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8, borderLeft: `4px solid ${statusColor(item.status)}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{item.category}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{item.stock} {item.unit}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>Min: {item.min_stock} · Max: {item.max_stock}</div>
                    </div>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: 6, height: 6, marginBottom: 4 }}>
                    <div style={{ background: statusColor(item.status), height: '100%', borderRadius: 6, width: `${(item.stock / item.max_stock) * 100}%` }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666' }}>
                    <span>Vrednost: {item.value?.toFixed(2)} €</span>
                    <span>Cena: {item.cost?.toFixed(2)} €/{item.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'movements' && movements && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Vhod', value: `${movements.total_in} kg`, color: '#22c55e' },
                  { label: 'Izhod', value: `${movements.total_out} kg`, color: '#ef4444' },
                  { label: 'Prilagoditve', value: movements.total_adjustments, color: '#f59e0b' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {movements.movements?.map((m: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 6, borderLeft: `3px solid ${movementTypeColor(m.type)}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>{m.item}</span>
                      <span style={{ marginLeft: 8, background: movementTypeColor(m.type), color: '#fff', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{movementTypeLabel(m.type)}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: movementTypeColor(m.type) }}>{m.type === 'in' ? '+' : m.type === 'out' ? '-' : ''}{m.quantity} {m.unit}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{m.date} · {m.by} · {m.notes}</div>
                </div>
              ))}
            </div>
          )}

          {tab === 'analytics' && analytics && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Vrednost zalog', value: `${analytics.total_value?.toFixed(0)} €`, color: '#3b82f6' },
                  { label: 'Obrat', value: `${analytics.turnover_rate}×`, color: '#22c55e' },
                  { label: 'Natančnost', value: `${analytics.stock_accuracy}%`, color: '#f59e0b' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <h4 style={{ margin: '0 0 8px' }}>📊 Po kategoriji</h4>
              {analytics.by_category?.map((c: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                    <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>{c.items} izdelkov</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                    <span>{c.value?.toFixed(0)} €</span>
                    <span>Obrat: {c.turnover}×</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'categories' && categories && (
            <div>
              {categories.categories?.map((c: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{c.items} izdelkov</div>
                  </div>
                  <div style={{ fontWeight: 700 }}>{c.total_value?.toFixed(0)} €</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}