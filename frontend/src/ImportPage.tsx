import { useState, useRef } from 'react'
import * as api from './api'

const TYPES = [
  { key: 'customers', label: 'Stranke', desc: 'name, phone, email, address, notes, tags, is_member, loyalty_points' },
  { key: 'menu-items', label: 'Artikli', desc: 'name, price, description, category, is_active, is_favorite, plu_code, tax_rate, allergens' },
  { key: 'ingredients', label: 'Sestavine', desc: 'name, unit, category, stock, min_stock, cost_per_unit, barcode' },
]

export default function ImportPage({ onNotify }: { onNotify: (m: string) => void }) {
  const [type, setType] = useState('customers')
  const [preview, setPreview] = useState<any[] | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setResult(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const lines = text.split('\n').filter(l => l.trim())
      if (lines.length < 2) { onNotify('CSV mora vsebovati glavo in vsaj eno vrstico'); return }
      const h = lines[0].split(',').map(s => s.trim().replace(/^"/, '').replace(/"$/, ''))
      setHeaders(h)
      const rows = lines.slice(1, 11).map(line => {
        const vals = line.split(',').map(s => s.trim().replace(/^"/, '').replace(/"$/, ''))
        const row: Record<string, string> = {}
        h.forEach((k, i) => { row[k] = vals[i] || '' })
        return row
      })
      setPreview(rows)
    }
    reader.readAsText(f)
  }

  const doImport = async () => {
    if (!file) return
    setImporting(true)
    setResult(null)
    const form = new FormData()
    form.append('file', file)
    try {
      const r = await fetch(`/api/v1/import/${type}`, {
        method: 'POST',
        headers: api.authHeader(),
        body: form
      })
      const d = await r.json()
      setResult(d)
      if (r.ok) onNotify(`Uvoženo: ${d.imported} od ${d.total_rows}`)
      else onNotify(d.detail || 'Napaka pri uvozu')
    } catch (e: any) {
      onNotify(e.message || 'Napaka')
    }
    setImporting(false)
  }

  return (
    <div className="page-container" style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
      <h2 className="page-title">📥 Uvoz podatkov (CSV)</h2>

      {/* Type selector */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 14 }}>1. Izberi tip podatkov</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {TYPES.map(t => (
            <button key={t.key} onClick={() => { setType(t.key); setPreview(null); setFile(null); setResult(null) }}
              className={`btn btn-sm ${type === t.key ? 'btn-primary' : 'btn-ghost'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text2)', background: 'var(--bg)', padding: 8, borderRadius: 6 }}>
          Pričakovani stolpci: <code style={{ background: '#1e293b', color: '#e2e8f0', padding: '1px 4px', borderRadius: 3 }}>
            {TYPES.find(t => t.key === type)?.desc}
          </code>
        </div>
      </div>

      {/* File picker */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 14 }}>2. Izberi CSV datoteko</h3>
        <input ref={fileRef} type="file" accept=".csv" onChange={handleFile}
          style={{ fontSize: 13, marginBottom: 8 }} />
        {file && <div style={{ fontSize: 12, color: 'var(--text2)' }}>{file.name} ({(file.size / 1024).toFixed(1)} KB)</div>}
      </div>

      {/* Preview */}
      {preview && preview.length > 0 && (
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: 14 }}>3. Predogled (prvih {preview.length} vrstic)</h3>
          <div style={{ overflowX: 'auto', fontSize: 12 }}>
            <table className="data-table" style={{ minWidth: 400 }}>
              <thead>
                <tr>
                  {headers.map(h => <th key={h} style={{ fontSize: 11 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i}>
                    {headers.map(h => <td key={h} style={{ fontSize: 11 }}>{row[h] || ''}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import button */}
      {file && (
        <button onClick={doImport} disabled={importing} className="btn btn-primary" style={{ width: '100%', padding: 12 }}>
          {importing ? '⏳ Uvažanje...' : `📥 Uvozi ${TYPES.find(t => t.key === type)?.label || ''}`}
        </button>
      )}

      {/* Result */}
      {result && (
        <div className="card" style={{ padding: 16, marginTop: 16, borderLeft: `3px solid ${result.errors?.length > 0 ? '#f59e0b' : '#059669'}` }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>
            {result.errors?.length > 0 ? '⚠️ Uvoženo z napakami' : '✅ Uvoz uspešen'}
          </div>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            Uvoženo: <strong>{result.imported}</strong> / {result.total_rows}
          </div>
          {result.errors?.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#ef4444' }}>
              {result.errors.map((e: string, i: number) => <div key={i}>⚠️ {e}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
