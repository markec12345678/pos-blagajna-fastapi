import { useState, useEffect } from 'react'

interface Safety { compliance_score: number; last_inspection: string; next_inspection: string; violations: number; certifications: string[]; temperature_log: Array<{ time: string; fridge: number; freezer: number; status: string }>; hygiene_checklist: Record<string, number> }
interface Waste { total_kg: number; total_cost: number; waste_per_order: number; by_category: Array<{ category: string; kg: number; cost: number; percentage: number }>; top_wasted_items: Array<{ item: string; kg: number; cost: number; reason: string }>; reduction_trend: Array<{ month: string; kg: number }> }
interface Complaint { id: number; date: string; type: string; detail: string; status: string; compensation: string }
interface Supplier { name: string; category: string; quality_score: number; delivery_reliability: number; issues_this_month: number; trend: string }
interface KPI { name: string; score: number; target: number; status: string; trend: string }
interface CorrectiveAction { id: number; issue: string; date_identified: string; action: string; assigned_to: string; status: string; completed_date?: string; deadline?: string }

export default function QualityV4Page({ onNotify }: { onNotify?: (msg: string, err?: boolean) => void }) {
  const [tab, setTab] = useState<string>('safety')
  const [safety, setSafety] = useState<Safety | null>(null)
  const [waste, setWaste] = useState<Waste | null>(null)
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [kpis, setKpis] = useState<KPI[]>([])
  const [actions, setActions] = useState<CorrectiveAction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [sRes, wRes, cRes, supRes, kRes, aRes] = await Promise.all([
        fetch('/api/v1/quality-v4/food-safety').then(r => r.json()),
        fetch('/api/v1/quality-v4/food-waste').then(r => r.json()),
        fetch('/api/v1/quality-v4/customer-complaints').then(r => r.json()),
        fetch('/api/v1/quality-v4/supplier-quality').then(r => r.json()),
        fetch('/api/v1/quality-v4/kpi-quality').then(r => r.json()),
        fetch('/api/v1/quality-v4/corrective-actions').then(r => r.json()),
      ])
      setSafety(sRes.safety || null)
      setWaste(wRes.waste || null)
      setComplaints(cRes.complaints?.recent || [])
      setSuppliers(supRes.suppliers || [])
      setKpis(kRes.kpis || [])
      setActions(aRes.actions || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const scoreColor = (s: string) => s === 'above' ? '#10b981' : s === 'below' ? '#ef4444' : '#f59e0b'
  const trendIcon = (t: string) => t === 'up' ? '📈' : t === 'down' ? '📉' : '➡️'

  if (loading) return <div className="loading">Nalagam...</div>

  return (
    <div style={{ padding: '2rem' }}>
      <h1>🍽️ Kakovost V4</h1>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {[
          { key: 'safety', label: '🛡️ Varnost hrane' },
          { key: 'waste', label: '🗑️ Odpadki' },
          { key: 'complaints', label: '😤 Pritožbe' },
          { key: 'suppliers', label: '🚚 Dobavitelji' },
          { key: 'kpis', label: '📊 KPI' },
          { key: 'actions', label: '🔧 Korektivni ukrepi' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: tab === t.key ? '2px solid #2563eb' : '1px solid #d1d5db', background: tab === t.key ? '#dbeafe' : 'white', cursor: 'pointer', fontSize: '0.85rem' }}>{t.label}</button>
        ))}
      </div>

      {tab === 'safety' && safety && (
        <div>
          <h2>Varnost hrane</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ background: '#d1fae5', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{safety.compliance_score}%</div>
              <div>Skladnost</div>
            </div>
            <div style={{ background: '#dbeafe', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{safety.violations}</div>
              <div>Nepravilnosti</div>
            </div>
            <div style={{ background: '#fef3c7', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1rem', fontWeight: 600 }}>{safety.last_inspection}</div>
              <div>Zadnji pregled</div>
            </div>
            <div style={{ background: '#f3e8ff', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1rem', fontWeight: 600 }}>{safety.next_inspection}</div>
              <div>Naslednji pregled</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3>🌡️ Dnevnik temperatur</h3>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {safety.temperature_log.map((t, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 60px', gap: '0.5rem', padding: '0.5rem', borderRadius: '6px', background: '#f9fafb' }}>
                    <div style={{ fontWeight: 600 }}>{t.time}</div>
                    <div>Hladilnik: {t.fridge}°C</div>
                    <div>Zamrzovalnik: {t.freezer}°C</div>
                    <div style={{ color: t.status === 'ok' ? '#10b981' : '#ef4444' }}>{t.status === 'ok' ? '✓' : '✗'}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3>✅ Higienski seznam</h3>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {Object.entries(safety.hygiene_checklist).filter(([k]) => k !== 'total').map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderRadius: '6px', background: '#f9fafb' }}>
                    <span style={{ textTransform: 'capitalize' }}>{k}</span>
                    <span style={{ color: '#10b981', fontWeight: 600 }}>{v}/{safety.hygiene_checklist.total}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '8px', background: '#d1fae5', textAlign: 'center', fontWeight: 600 }}>
                {safety.certifications.join(' · ')}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'waste' && waste && (
        <div>
          <h2>Odpadki hrane</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#ef4444' }}>{waste.total_kg} kg</div>
              <div>Skupaj odpadkov</div>
            </div>
            <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#ef4444' }}>€{waste.total_cost}</div>
              <div>Strošek odpadkov</div>
            </div>
            <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{waste.waste_per_order} kg</div>
              <div>Odpadki/naročilo</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3>Po kategorijah</h3>
              {waste.by_category.map(c => (
                <div key={c.category} style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}><span>{c.category}</span><span>{c.kg} kg (€{c.cost})</span></div>
                  <div style={{ height: '8px', borderRadius: '4px', background: '#e5e7eb' }}><div style={{ height: '100%', width: `${c.percentage}%`, background: '#ef4444', borderRadius: '4px' }} /></div>
                </div>
              ))}
            </div>
            <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3>Najbolj zavračani artikli</h3>
              {waste.top_wasted_items.map(item => (
                <div key={item.item} style={{ padding: '0.75rem', borderRadius: '8px', background: '#fef2f2', marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 600 }}>{item.item} — {item.kg} kg (€{item.cost})</div>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Razlog: {item.reason}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'complaints' && (
        <div>
          <h2>Pritožbe strank</h2>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {complaints.map(c => (
              <div key={c.id} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{c.detail}</strong>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{c.date} · {c.type}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>{c.compensation}</span>
                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.8rem', background: c.status === 'resolved' ? '#d1fae5' : '#fef3c7', color: c.status === 'resolved' ? '#065f46' : '#92400e' }}>{c.status === 'resolved' ? 'Rešeno' : 'V obdelavi'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'suppliers' && (
        <div>
          <h2>Kakovost dobaviteljev</h2>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {suppliers.map(s => (
              <div key={s.name} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <strong>{s.name}</strong>
                  <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>{s.category}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <div>Kakovost: ⭐ {s.quality_score}/5</div>
                  <div>Dostava: {s.delivery_reliability}%</div>
                  <div style={{ color: s.issues_this_month > 0 ? '#ef4444' : '#10b981' }}>Težave: {s.issues_this_month}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'kpis' && (
        <div>
          <h2>Kakovostni KPI</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {kpis.map(k => (
              <div key={k.name} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>{k.name}</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: scoreColor(k.status) }}>{k.score}%</div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Cilj: {k.target}%</div>
                <div style={{ marginTop: '0.5rem' }}>{trendIcon(k.trend)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'actions' && (
        <div>
          <h2>Korektivni ukrepi</h2>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {actions.map(a => (
              <div key={a.id} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <strong>{a.issue}</strong>
                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.8rem', background: a.status === 'completed' ? '#d1fae5' : a.status === 'in_progress' ? '#fef3c7' : '#f3e8ff', color: a.status === 'completed' ? '#065f46' : a.status === 'in_progress' ? '#92400e' : '#6b21a8' }}>{a.status === 'completed' ? 'Končano' : a.status === 'in_progress' ? 'V teku' : 'Na čakanju'}</span>
                </div>
                <div style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>Ukrep: {a.action}</div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Odgovoren: {a.assigned_to} · {a.completed_date || a.deadline || a.date_identified}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
