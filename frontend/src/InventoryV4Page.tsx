import { useState, useEffect } from 'react'
import * as api from './api'

export default function InventoryV4Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'sensors' | 'auto-order' | 'suppliers' | 'costs'>('sensors')
  const [sensors, setSensors] = useState<any>(null)
  const [autoOrder, setAutoOrder] = useState<any>(null)
  const [suppliers, setSuppliers] = useState<any>(null)
  const [costs, setCosts] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/inventory-v4/sensors', { headers: api.h() }).then(r => r.json()).then(setSensors),
      fetch('/api/v1/inventory-v4/auto-order', { headers: api.h() }).then(r => r.json()).then(setAutoOrder),
      fetch('/api/v1/inventory-v4/supplier-portal', { headers: api.h() }).then(r => r.json()).then(setSuppliers),
      fetch('/api/v1/inventory-v4/cost-optimization', { headers: api.h() }).then(r => r.json()).then(setCosts),
    ]).catch(() => onNotify('Napaka')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'sensors', label: '📡 Senzorji' },
    { key: 'auto-order', label: '🤖 Auto-naročanje' },
    { key: 'suppliers', label: '🏭 Portal' },
    { key: 'costs', label: '💰 Optimizacija' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm"><h2 className="page-title">📦 Inventura V4</h2></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>{t.label}</button>
        ))}
      </div>
      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'sensors' && sensors && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Senzorji', value: sensors.total_sensors, color: '#3b82f6' },
                  { label: 'Aktivni', value: sensors.active, color: '#22c55e' },
                  { label: 'Opozorila', value: sensors.alerts, color: sensors.alerts > 0 ? '#ef4444' : '#22c55e' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {sensors.sensors?.map((s: any) => (
                <div key={s.id} className="card" style={{ padding: 12, marginBottom: 6, borderLeft: `4px solid ${s.status === 'ok' ? '#22c55e' : '#f59e0b'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{s.location}</span>
                    <span style={{ fontWeight: 700, color: '#3b82f6' }}>{s.value} {s.unit}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                    <span>📡 {s.type}</span>
                    <span>🔋 {s.battery}%</span>
                    <span style={{ color: s.status === 'ok' ? '#22c55e' : '#f59e0b' }}>{s.status === 'ok' ? '✅ OK' : '⚠️ Opozorilo'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'auto-order' && autoOrder && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Pravila', value: autoOrder.rules_active, color: '#3b82f6' },
                  { label: 'Danes generirano', value: autoOrder.orders_generated_today, color: '#22c55e' },
                  { label: 'Čaka odobritev', value: autoOrder.pending_approval, color: '#f59e0b' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {autoOrder.auto_orders?.map((o: any) => (
                <div key={o.id} className="card" style={{ padding: 12, marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{o.item}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {o.auto && <span style={{ background: '#dcfce7', color: '#16a34a', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>🤖 Auto</span>}
                      <span style={{ background: o.status === 'ordered' ? '#dcfce7' : '#fef3c7', color: o.status === 'ordered' ? '#16a34a' : '#d97706', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{o.status === 'ordered' ? 'Naročeno' : 'Čaka'}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                    <span>📦 {o.qty} {o.unit}</span>
                    <span>🏭 {o.supplier}</span>
                    <span>💰 {o.cost} €</span>
                  </div>
                </div>
              ))}
              <div className="card" style={{ padding: 12, marginTop: 8, textAlign: 'center', background: '#f0fdf4' }}>
                <span style={{ color: '#22c55e', fontWeight: 700 }}>💰 Prihranek ta mesec: {autoOrder.savings_this_month} €</span>
              </div>
            </div>
          )}
          {tab === 'suppliers' && suppliers && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Povezani', value: suppliers.connected_suppliers, color: '#3b82f6' },
                  { label: 'Naročila', value: suppliers.portal_orders, color: '#22c55e' },
                  { label: 'Računi', value: suppliers.pending_invoices, color: '#f59e0b' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {suppliers.suppliers?.map((s: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>🏭 {s.name}</span>
                    <span style={{ background: '#dcfce7', color: '#16a34a', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>✅ Povezan</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                    <span>📦 {s.catalog_items} artiklov</span>
                    <span>🛒 {s.pending_orders} naročil</span>
                    <span>🔄 {s.last_sync}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'costs' && costs && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Stroški ta mesec</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#ef4444' }}>{costs.total_spend_month?.toLocaleString()} €</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Možni prihranek</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#22c55e' }}>{costs.potential_savings?.toLocaleString()} €</div>
                </div>
              </div>
              <h4 style={{ margin: '0 0 8px' }}>💡 Predlogi</h4>
              {costs.suggestions?.map((s: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8, borderLeft: '4px solid #22c55e' }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{s.title}</div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>💰 +{s.saving} €</span>
                    <span style={{ color: '#888' }}>📦 {s.item}</span>
                    <span style={{ color: '#888' }}>🎯 {s.confidence}%</span>
                  </div>
                </div>
              ))}
              <h4 style={{ margin: '16px 0 8px' }}>📈 Trendi cen</h4>
              {costs.price_trends?.map((t: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>{t.item}</span>
                  <span style={{ color: t.trend === 'up' ? '#ef4444' : t.trend === 'down' ? '#22c55e' : '#888', fontWeight: 700 }}>{t.change_pct > 0 ? '+' : ''}{t.change_pct}%</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}