import { useState, useEffect } from 'react'
import * as api from './api'

export default function InventoryV5Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'demand' | 'suppliers' | 'dead' | 'par'>('demand')
  const [demand, setDemand] = useState<any>(null)
  const [suppliers, setSuppliers] = useState<any>(null)
  const [dead, setDead] = useState<any>(null)
  const [par, setPar] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/inventory-v5/demand-forecast', { headers: api.h() }).then(r => r.json()).then(setDemand),
      fetch('/api/v1/inventory-v5/supplier-scores', { headers: api.h() }).then(r => r.json()).then(setSuppliers),
      fetch('/api/v1/inventory-v5/dead-stock', { headers: api.h() }).then(r => r.json()).then(setDead),
      fetch('/api/v1/inventory-v5/par-levels', { headers: api.h() }).then(r => r.json()).then(setPar),
    ]).catch(() => onNotify('Napaka')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'demand', label: '🔮 Napoved povpraševanja' },
    { key: 'suppliers', label: '🏭 Kartice dobaviteljev' },
    { key: 'dead', label: '💀 Mrtva zaloga' },
    { key: 'par', label: '📊 PAR ravni' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm"><h2 className="page-title">📦 Inventura V5</h2></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>{t.label}</button>
        ))}
      </div>
      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'demand' && demand && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Natančnost</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>{demand.forecast_accuracy}%</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Napovedani artikli</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6' }}>{demand.items_forecasted}</div>
                </div>
              </div>
              {demand.top_forecasts?.map((f: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8, borderLeft: `4px solid ${f.status === 'reorder' ? '#ef4444' : '#22c55e'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{f.item}</span>
                    <span style={{ background: f.status === 'reorder' ? '#fef2f2' : '#dcfce7', color: f.status === 'reorder' ? '#dc2626' : '#16a34a', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{f.status === 'reorder' ? '⚠️ Naročilo' : '✅ OK'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12, color: '#666' }}>
                    <span>Zaloga: <b>{f.current_stock}</b></span>
                    <span>Napoved 7d: <b>{f.forecast_demand_7d}</b></span>
                    <span>Točka naročila: <b>{f.reorder_point}</b></span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'suppliers' && suppliers && (
            <div>
              <div className="card" style={{ padding: 14, marginBottom: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#888' }}>Povp. ocena</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>{suppliers.avg_score}/100</div>
              </div>
              {suppliers.suppliers?.map((s: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>🏭 {s.name}</span>
                    <span style={{ fontWeight: 700, color: s.score > 90 ? '#22c55e' : s.score > 80 ? '#f59e0b' : '#ef4444' }}>{s.score}/100</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, fontSize: 11 }}>
                    <div>⭐ {s.quality}</div>
                    <div>🚚 {s.delivery}%</div>
                    <div>💰 {s.price}%</div>
                    <div>📞 {s.communication}%</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'dead' && dead && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Vrednost mrtve zaloge</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#ef4444' }}>{dead.dead_stock_value} €</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Artikli</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b' }}>{dead.items_count}</div>
                </div>
              </div>
              {dead.items?.map((d: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{d.name}</span>
                    <span style={{ color: '#ef4444', fontWeight: 700 }}>{d.value} €</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>📦 {d.stock} {d.unit} · {d.days_since_use} dni</div>
                  <div style={{ fontSize: 11, color: '#8b5cf6', fontWeight: 600 }}>Predlog: {d.action}</div>
                </div>
              ))}
            </div>
          )}
          {tab === 'par' && par && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Optimizirani artikli</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6' }}>{par.optimized_items}</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Skupaj prihranek</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>{par.total_savings} €</div>
                </div>
              </div>
              {par.items?.map((p: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{p.item}</span>
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>+{p.saving} €</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                    <span>Trenutno: <b>{p.current_par}</b></span>
                    <span>Optimizirano: <b>{p.optimized_par}</b></span>
                    <span>频率: {p.frequency}</span>
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