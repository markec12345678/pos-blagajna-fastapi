import { useState, useEffect } from 'react'
import * as api from './api'

export default function InventoryV3Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'replenishment' | 'waste' | 'suppliers' | 'costs'>('replenishment')
  const [replenishment, setReplenishment] = useState<any>(null)
  const [waste, setWaste] = useState<any>(null)
  const [suppliers, setSuppliers] = useState<any>(null)
  const [costs, setCosts] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/inventory-v3/auto-replenishment', { headers: api.h() }).then(r => r.json()).then(setReplenishment),
      fetch('/api/v1/inventory-v3/waste', { headers: api.h() }).then(r => r.json()).then(setWaste),
      fetch('/api/v1/inventory-v3/suppliers', { headers: api.h() }).then(r => r.json()).then(setSuppliers),
      fetch('/api/v1/inventory-v3/cost-analysis', { headers: api.h() }).then(r => r.json()).then(setCosts),
    ]).catch(() => onNotify('Napaka')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'replenishment', label: '🔄 Samodejno naročanje' },
    { key: 'waste', label: '🗑️ Odpadki' },
    { key: 'suppliers', label: '🏭 Dobavitelji' },
    { key: 'costs', label: '💰 Stroški' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm"><h2 className="page-title">📦 Inventura V3</h2></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>{t.label}</button>
        ))}
      </div>
      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'replenishment' && replenishment && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Čakajoča naročila</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b' }}>{replenishment.pending_orders}</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Samodejna ta teden</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>{replenishment.auto_orders_this_week}</div>
                </div>
              </div>
              {replenishment.rules?.map((r: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8, borderLeft: `4px solid ${r.current <= r.min ? '#ef4444' : '#22c55e'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{r.item}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {r.auto_order && <span style={{ background: '#dcfce7', color: '#16a34a', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>🤖 Auto</span>}
                      {r.current <= r.min && <span style={{ background: '#fef2f2', color: '#dc2626', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>⚠️ Nizko</span>}
                    </div>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: 4, height: 6, marginBottom: 6 }}>
                    <div style={{ background: r.current <= r.min ? '#ef4444' : '#22c55e', height: '100%', borderRadius: 4, width: `${(r.current / r.max) * 100}%` }} />
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                    <span>Trenutno: {r.current}</span>
                    <span>Min: {r.min}</span>
                    <span>Max: {r.max}</span>
                    <span>🏭 {r.supplier}</span>
                    <span>🚚 {r.lead_time_days} dni</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'waste' && waste && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Danes', value: `${waste.today.items} artikelov`, sub: `${waste.today.cost} €`, color: '#ef4444' },
                  { label: 'Ta teden', value: `${waste.this_week.items} artikelov`, sub: `${waste.this_week.cost} €`, color: '#f59e0b' },
                  { label: '% od nakupov', value: `${waste.this_week.pct_of_purchases}%`, color: '#8b5cf6' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
                    {'sub' in s && <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{s.sub}</div>}
                  </div>
                ))}
              </div>
              <h4 style={{ margin: '0 0 8px' }}>🏷️ Največji odpadki</h4>
              {waste.top_waste?.map((w: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600 }}>{w.item}</span>
                    <span style={{ color: '#ef4444', fontWeight: 700 }}>{w.cost} €</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{w.qty} {w.unit} · {w.reason}</div>
                </div>
              ))}
              <h4 style={{ margin: '16px 0 8px' }}>📊 Po razlogu</h4>
              {waste.by_reason?.map((r: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{r.reason}</span>
                    <span>{r.pct}%</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: 4, height: 6 }}>
                    <div style={{ background: '#ef4444', height: '100%', borderRadius: 4, width: `${r.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'suppliers' && suppliers && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                {[
                  { label: 'Aktivni', value: suppliers.active_suppliers, color: '#3b82f6' },
                  { label: 'Dostave', value: suppliers.pending_deliveries, color: '#f59e0b' },
                  { label: 'Povp. dostava', value: `${suppliers.avg_delivery_days} dni`, color: '#8b5cf6' },
                  { label: 'Pravočasnost', value: `${suppliers.on_time_rate}%`, color: '#22c55e' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888' }}>{s.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <h4 style={{ margin: '0 0 8px' }}>🚚 Prihajajoče dostave</h4>
              {suppliers.upcoming?.map((u: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 6, borderLeft: `4px solid ${u.status === 'in_transit' ? '#3b82f6' : u.status === 'confirmed' ? '#22c55e' : '#f59e0b'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600 }}>{u.supplier}</span>
                    <span style={{ background: u.status === 'in_transit' ? '#dbeafe' : u.status === 'confirmed' ? '#dcfce7' : '#fef3c7', color: u.status === 'in_transit' ? '#2563eb' : u.status === 'confirmed' ? '#16a34a' : '#d97706', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{u.status}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>📦 {u.items} artiklov · 📅 {u.eta}</div>
                </div>
              ))}
              <h4 style={{ margin: '16px 0 8px' }}>⭐ Top dobavitelji</h4>
              {suppliers.top_suppliers?.map((s: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                    <span style={{ color: '#f59e0b' }}>⭐ {s.quality}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>📋 {s.orders} naročil · ✅ {s.on_time}% pravočasno</div>
                </div>
              ))}
            </div>
          )}
          {tab === 'costs' && costs && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Skupaj nakupi', value: `${costs.total_purchases_month} €`, color: '#3b82f6' },
                  { label: 'Strošek/obrok', value: `${costs.cost_per_cover} €`, color: '#8b5cf6' },
                  { label: '% hrane', value: `${costs.food_cost_pct}%`, color: costs.food_cost_pct > 35 ? '#ef4444' : '#22c55e' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {costs.by_category?.map((c: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{c.category}</span>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontWeight: 700 }}>{c.amount} €</span>
                      <span style={{ color: c.trend === 'up' ? '#ef4444' : c.trend === 'down' ? '#22c55e' : '#888', fontSize: 12 }}>{c.trend === 'up' ? '↑' : c.trend === 'down' ? '↓' : '→'}</span>
                    </div>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: 4, height: 6 }}>
                    <div style={{ background: '#3b82f6', height: '100%', borderRadius: 4, width: `${c.pct}%` }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{c.pct}%</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}