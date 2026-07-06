import { useState } from 'react'

const EXPORT_TYPES = [
  { key: 'sales', label: 'Prodaja', icon: '🧾' },
  { key: 'inventory', label: 'Zaloge', icon: '📦' },
  { key: 'waste', label: 'Odpadki', icon: '🗑️' },
  { key: 'labor', label: 'Delo', icon: '👥' },
]

export default function ExportPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [type, setType] = useState('sales')
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(false)

  const download = async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/v1/export/${type}?days=${days}`, {
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
      })
      if (!r.ok) { onNotify('Napaka pri izvozu'); return }
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `${type}_${days}d.csv`; a.click()
      URL.revokeObjectURL(url)
      onNotify('✅ CSV izvožen')
    } catch { onNotify('❌ Napaka') }
    finally { setLoading(false) }
  }

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">📤 Izvoz podatkov (CSV)</h2>
      </div>
      <div className="card" style={{ padding: 20 }}>
        <label style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6, display: 'block' }}>Vrsta izvoza</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, marginBottom: 16 }}>
          {EXPORT_TYPES.map(et => (
            <button key={et.key} onClick={() => setType(et.key)}
              style={{
                padding: '12px 16px', borderRadius: 8, border: `2px solid ${type === et.key ? 'var(--primary, #3b82f6)' : 'var(--border)'}`,
                background: type === et.key ? 'var(--primary-alpha, rgba(59,130,246,0.1))' : 'var(--bg2)',
                color: 'var(--text)', cursor: 'pointer', textAlign: 'center', fontSize: 13, fontWeight: type === et.key ? 700 : 400
              }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{et.icon}</div>
              <div>{et.label}</div>
            </button>
          ))}
        </div>
        <label style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6, display: 'block' }}>Obdobje</label>
        <select className="input" value={days} onChange={e => setDays(parseInt(e.target.value))} style={{ width: 140, marginBottom: 16 }}>
          <option value={7}>Zadnjih 7 dni</option>
          <option value={30}>Zadnjih 30 dni</option>
          <option value={90}>Zadnjih 90 dni</option>
          <option value={365}>Zadnjih 365 dni</option>
        </select>
        <button onClick={download} className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
          {loading ? '⏳ Pripravljam...' : '📥 Prenesi CSV'}
        </button>
      </div>
    </div>
  )
}
