import { useState, useEffect } from 'react'
import * as api from './api'

export default function InventoryV2Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'waste' | 'expiry' | 'fifo' | 'optimization'>('waste')
  const [waste, setWaste] = useState<any[]>([])
  const [expiry, setExpiry] = useState<any[]>([])
  const [fifo, setFifo] = useState<any[]>([])
  const [optimization, setOptimization] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/inventory-v2/waste', { headers: api.h() }).then(r => r.json()).then(setWaste),
      fetch('/api/v1/inventory-v2/expiry-alerts', { headers: api.h() }).then(r => r.json()).then(setExpiry),
      fetch('/api/v1/inventory-v2/fifo-status', { headers: api.h() }).then(r => r.json()).then(setFifo),
      fetch('/api/v1/inventory-v2/optimization', { headers: api.h() }).then(r => r.json()).then(setOptimization),
    ]).catch(() => onNotify('Napaka pri nalaganju')).finally(() => setLoading(false))
  }, [])

  const wasteReason = (r: string) => ({ spoilage: 'Kvar', overproduction: 'Prevelika proizvodnja', expired: 'Rok trajanja', damaged: 'Poškodba', other: 'Drugo' }[r] || r)
  const wasteColor = (r: string) => ({ spoilage: '#ef4444', overproduction: '#f59e0b', expired: '#8b5cf6', damaged: '#f97316', other: '#6b7280' }[r] || '#6b7280')
  const expiryColor = (d: number) => d <= 1 ? '#ef4444' : d <= 3 ? '#f59e0b' : '#22c55e'

  const tabs = [
    { key: 'waste', label: '🗑️ Odpadki', count: waste.length },
    { key: 'expiry', label: '⏰ Rok trajanja', count: expiry.length },
    { key: 'fifo', label: '📦 FIFO', count: fifo.length },
    { key: 'optimization', label: '⚡ Optimizacija' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">📦 Napredno upravljanje zalog</h2>
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
          {tab === 'waste' && (
            <div>
              {waste.length === 0 ? <div className="card" style={{ padding: 24, textAlign: 'center', color: '#888' }}>Ni zapisov odpadkov</div> : waste.map((w, i) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{w.ingredient}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{w.quantity} {w.unit} · {w.date}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ background: wasteColor(w.reason), color: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>{wasteReason(w.reason)}</span>
                      {w.cost > 0 && <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>{w.cost.toFixed(2)} €</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'expiry' && (
            <div>
              {expiry.length === 0 ? <div className="card" style={{ padding: 24, textAlign: 'center', color: '#22c55e' }}>✅ Vsi izdelki so sveži</div> : expiry.map((e, i) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8, borderLeft: `4px solid ${expiryColor(e.days_left)}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{e.ingredient}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{e.quantity} {e.unit}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, color: expiryColor(e.days_left) }}>{e.days_left} dni</div>
                      <div style={{ fontSize: 11, color: '#888' }}>{e.expiry_date}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'fifo' && (
            <div>
              {fifo.map((f, i) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{f.ingredient}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>Lot: {f.batch}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600 }}>{f.quantity} {f.unit}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>Vhod: {f.received_date}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'optimization' && optimization && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Odpadki ta mesec', value: `${optimization.waste_pct || 0}%`, color: '#ef4444' },
                  { label: 'Opremljenost', value: `${optimization.fill_rate || 0}%`, color: '#22c55e' },
                  { label: 'Vrednost zalog', value: `${optimization.total_value?.toFixed(0) || 0} €`, color: '#3b82f6' },
                  { label: 'Neravnovesje', value: `${optimization.imbalance_count || 0}`, color: '#f59e0b' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {optimization.reorder_suggestions?.length > 0 && (
                <div className="card" style={{ padding: 14 }}>
                  <h4 style={{ margin: '0 0 8px' }}>📋 Predlogi naročil</h4>
                  {optimization.reorder_suggestions.map((s: any, i: number) => (
                    <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                      <span>{s.ingredient}</span>
                      <span style={{ fontWeight: 600 }}>Naroči: {s.suggested_qty} {s.unit}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}