import { useState } from 'react'
import * as api from './api'

const EXPORT_TYPES = [
  { key: 'sales', label: 'Prodaja', icon: '🧾', desc: 'Naročila, postavke, zneski' },
  { key: 'inventory', label: 'Zaloge', icon: '📦', desc: 'Sestavine, zaloge, vrednosti' },
  { key: 'waste', label: 'Odpadki', icon: '🗑️', desc: 'Odpadki in stroški' },
  { key: 'labor', label: 'Delo', icon: '👥', desc: 'Izmeni, ure, strošek' },
  { key: 'customers', label: 'Stranke', icon: '👤', desc: 'Podatki strank, članstvo' },
  { key: 'loyalty', label: 'Zvestoba', icon: '⭐', desc: 'Tранsakcije zvestobnih točk' },
  { key: 'reservations', label: 'Rezervacije', icon: '📅', desc: 'Rezervacije in statusi' },
  { key: 'e-invoices', label: 'e-Računi XML', icon: '📨', desc: 'Vsi e-računi v UBL formatu' },
]

const FORMATS = [
  { key: 'csv', label: 'CSV', icon: '📄', desc: 'Univerzalni format' },
  { key: 'xlsx', label: 'Excel', icon: '📊', desc: 'Oblikovana preglednica' },
]

export default function ExportPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [type, setType] = useState('sales')
  const [format, setFormat] = useState('xlsx')
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(false)

  const download = async () => {
    setLoading(true)
    try {
      if (type === 'e-invoices') {
        await api.downloadEracunBatch()
        onNotify('✅ e-Računi XML izvoženi')
        return
      }
      const r = await fetch(`/api/v1/export/${type}?days=${days}&format=${format}`, {
        headers: api.authHeader()
      })
      if (!r.ok) { onNotify('Napaka pri izvozu'); return }
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}_${days}d.${format === 'xlsx' ? 'xlsx' : 'csv'}`
      a.click()
      URL.revokeObjectURL(url)
      onNotify(`✅ ${format.toUpperCase()} izvožen`)
    } catch { onNotify('❌ Napaka') }
    finally { setLoading(false) }
  }

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">📤 Izvoz podatkov</h2>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <label style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8, display: 'block', fontWeight: 600 }}>Vrsta podatkov</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, marginBottom: 20 }}>
          {EXPORT_TYPES.map(et => (
            <button key={et.key} onClick={() => setType(et.key)}
              className={type === et.key ? 'export-type-btn active' : 'export-type-btn'}
              style={{
                padding: '14px 16px', borderRadius: 10, border: `2px solid ${type === et.key ? 'var(--green)' : 'var(--border)'}`,
                background: type === et.key ? 'var(--green-light)' : 'var(--surface)',
                color: 'var(--text)', cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: type === et.key ? 700 : 400,
                transition: 'all 0.2s ease',
              }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{et.icon}</div>
              <div style={{ fontWeight: 600 }}>{et.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{et.desc}</div>
            </button>
          ))}
        </div>

        <label style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8, display: 'block', fontWeight: 600 }}>Format</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {FORMATS.map(f => (
            <button key={f.key} onClick={() => setFormat(f.key)}
              style={{
                flex: 1, padding: '12px 16px', borderRadius: 8,
                border: `2px solid ${format === f.key ? 'var(--blue)' : 'var(--border)'}`,
                background: format === f.key ? 'var(--blue-light)' : 'var(--surface)',
                color: 'var(--text)', cursor: 'pointer', textAlign: 'center',
                transition: 'all 0.2s ease',
              }}>
              <div style={{ fontSize: 20, marginBottom: 2 }}>{f.icon}</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{f.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>{f.desc}</div>
            </button>
          ))}
        </div>

        <label style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8, display: 'block', fontWeight: 600 }}>Obdobje</label>
        <select className="input" value={days} onChange={e => setDays(parseInt(e.target.value))} style={{ width: '100%', marginBottom: 20 }}>
          <option value={7}>Zadnjih 7 dni</option>
          <option value={30}>Zadnjih 30 dni</option>
          <option value={90}>Zadnjih 90 dni</option>
          <option value={365}>Zadnjih 365 dni</option>
        </select>

        <button onClick={download} className="btn btn-primary" disabled={loading} style={{ width: '100%', padding: '14px', fontSize: 15 }}>
          {loading ? '⏳ Pripravljam...' : `📥 Prenesi ${format === 'xlsx' ? 'Excel' : 'CSV'}`}
        </button>
      </div>
    </div>
  )
}
