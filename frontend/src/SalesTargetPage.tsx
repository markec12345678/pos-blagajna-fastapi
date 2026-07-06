import { useState, useEffect } from 'react'

export default function SalesTargetPage({ onNotify }: { onNotify?: (msg: string, err?: boolean) => void }) {
  const [data, setData] = useState<any>(null)
  const [editTargets, setEditTargets] = useState({ daily_sales_target: 0, monthly_sales_target: 0 })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const r = await fetch('/api/v1/analytics/sales-targets')
    if (r.ok) {
      const d = await r.json()
      setData(d)
      setEditTargets({ daily_sales_target: d.daily_target || 0, monthly_sales_target: d.monthly_target || 0 })
    }
  }

  useEffect(() => { load() }, [])

  const saveTargets = async () => {
    setSaving(true)
    await fetch('/api/v1/analytics/sales-targets', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editTargets)
    })
    await load()
    setSaving(false)
  }

  const Gauge = ({ pct, label, value, target, color }: { pct: number; label: string; value: string; target: string; color: string }) => {
    const deg = Math.min(pct / 100 * 360, 360)
    return (
      <div className="card" style={{ padding: 20, textAlign: 'center', minWidth: 200, flex: 1 }}>
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>{label}</div>
        <div style={{ position: 'relative', width: 160, height: 80, margin: '0 auto 12px', overflow: 'hidden' }}>
          <svg width="160" height="160" viewBox="0 0 160 160">
            <path d="M 20 140 A 60 60 0 1 1 140 140" fill="none" stroke="#e2e8f0" strokeWidth="16" strokeLinecap="round" />
            <path d="M 20 140 A 60 60 0 1 1 140 140" fill="none" stroke={color} strokeWidth="16" strokeLinecap="round"
              strokeDasharray={`${deg / 360 * 284} 284`} transform="rotate(180 80 80)" />
          </svg>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color }}>{pct.toFixed(0)}%</div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: 12, color: '#475569' }}>
          <span>€ {value}</span>
          <span>🎯 {target}</span>
        </div>
      </div>
    )
  }

  if (!data) return <div className="loading" />

  return (
    <div>
      <div className="page-header">
        <h2>🎯 Prodajni cilji</h2>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <Gauge pct={data.daily_pct} label="Danes" value={data.daily_actual.toLocaleString('sl-SI')}
          target={data.daily_target.toLocaleString('sl-SI')} color={data.daily_pct >= 100 ? '#059669' : data.daily_pct >= 80 ? '#f59e0b' : '#ef4444'} />
        <Gauge pct={data.monthly_pct} label="Mesec (dan {data.day_of_month}/{data.days_in_month})"
          value={data.monthly_actual.toLocaleString('sl-SI')} target={data.monthly_target.toLocaleString('sl-SI')}
          color={data.monthly_pct >= 100 ? '#059669' : data.monthly_pct >= 80 ? '#f59e0b' : '#ef4444'} />
      </div>

      <div className="card" style={{ padding: 20, maxWidth: 480 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Nastavi cilje</h3>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Dnevni cilj (€)</label>
          <input type="number" className="input" value={editTargets.daily_sales_target}
            onChange={e => setEditTargets(p => ({ ...p, daily_sales_target: parseFloat(e.target.value) || 0 }))}
            style={{ width: '100%', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Mesečni cilj (€)</label>
          <input type="number" className="input" value={editTargets.monthly_sales_target}
            onChange={e => setEditTargets(p => ({ ...p, monthly_sales_target: parseFloat(e.target.value) || 0 }))}
            style={{ width: '100%', boxSizing: 'border-box' }} />
        </div>
        <button onClick={saveTargets} disabled={saving}
          style={{ padding: '10px 24px', background: '#059669', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          {saving ? 'Shranjujem...' : 'Shrani cilje'}
        </button>
      </div>
    </div>
  )
}
