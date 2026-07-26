import { useState, useEffect } from 'react'
import { authHeader } from './api'

interface EngItem {
  id: number; name: string; category: string; price: number;
  cost: number | null; margin: number | null; margin_pct: number | null;
  qty_sold: number; revenue: number; popularity: number;
  has_recipe: boolean; classification: string
}

const CLASS_INFO: Record<string, { label: string; icon: string; color: string; bg: string; desc: string; action: string }> = {
  star: { label: 'Zvezda', icon: '⭐', color: '#059669', bg: '#f0fdf4', desc: 'Visoka marža + visoka prodaja', action: 'Promoviraj in ohrani' },
  plowhorse: { label: 'Konj', icon: '🐴', color: '#f59e0b', bg: '#fef3c7', desc: 'Nizka marža + visoka prodaja', action: 'Povišaj ceno ali znižaj stroške' },
  puzzle: { label: 'Uganka', icon: '🧩', color: '#3b82f6', bg: '#eff6ff', desc: 'Visoka marža + nizka prodaja', action: 'Bolj promoviraj ali daj v combo' },
  dog: { label: 'Pes', icon: '🐕', color: '#ef4444', bg: '#fef2f2', desc: 'Nizka marža + nizka prodaja', action: 'Odstrani iz menija ali repriciraj' },
}

export default function MenuEngineeringPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [items, setItems] = useState<EngItem[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [sortKey, setSortKey] = useState('qty_sold')
  const [sortAsc, setSortAsc] = useState(false)

  const api = () => fetch(`/api/v1/analytics/menu-engineering?days=${days}`, {
    headers: authHeader()
  })

  const load = () => {
    setLoading(true)
    api().then(r => r.json()).then(d => {
      setItems(d.items || [])
      setSummary(d.summary)
      setLoading(false)
    }).catch(() => { setLoading(false); onNotify('Napaka pri nalaganju') })
  }

  useEffect(load, [days])

  const toggleSort = (k: string) => {
    if (sortKey === k) setSortAsc(!sortAsc)
    else { setSortKey(k); setSortAsc(true) }
  }

  const cats = [...new Set(items.map(i => i.category))].sort()
  const filtered = items
    .filter(i => !categoryFilter || i.category === categoryFilter)
    .filter(i => !classFilter || i.classification === classFilter)
    .sort((a, b) => {
      let va: any, vb: any
      switch (sortKey) {
        case 'name': va = a.name; vb = b.name; break
        case 'category': va = a.category; vb = b.category; break
        case 'price': va = a.price; vb = b.price; break
        case 'cost': va = a.cost ?? 0; vb = b.cost ?? 0; break
        case 'margin_pct': va = a.margin_pct ?? -999; vb = b.margin_pct ?? -999; break
        case 'qty_sold': va = a.qty_sold; vb = b.qty_sold; break
        case 'revenue': va = a.revenue; vb = b.revenue; break
        default: va = a.qty_sold; vb = b.qty_sold
      }
      return sortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
    })

  const mColor = (pct: number | null) => {
    if (pct === null) return '#94a3b8'
    if (pct <= 0) return '#ef4444'
    if (pct < 30) return '#f59e0b'
    if (pct < 50) return '#22c55e'
    return '#059669'
  }

  if (loading) return <div className="page-container-sm"><p style={{ textAlign: 'center', color: 'var(--text2)', padding: 40 }}>Nalaganje...</p></div>

  const cl = summary?.classifications || {}
  const matrixData = [
    { x: 'Nizka prodaja', y: 'Visoka marža', type: 'puzzle', icon: '🧩', count: cl.puzzle || 0 },
    { x: 'Visoka prodaja', y: 'Visoka marža', type: 'star', icon: '⭐', count: cl.star || 0 },
    { x: 'Nizka prodaja', y: 'Nizka marža', type: 'dog', icon: '🐕', count: cl.dog || 0 },
    { x: 'Visoka prodaja', y: 'Nizka marža', type: 'plowhorse', icon: '🐴', count: cl.plowhorse || 0 },
  ]

  const popMax = Math.max(...items.filter(i => i.qty_sold > 0).map(i => i.popularity), 1)
  const mrgMax = Math.max(...items.filter(i => i.margin_pct !== null).map(i => i.margin_pct || 0), 1)

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">📊 Inženiring menija</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="input" value={days} onChange={e => setDays(parseInt(e.target.value))} style={{ width: 100, fontSize: 12 }}>
            <option value={7}>7 dni</option>
            <option value={30}>30 dni</option>
            <option value={90}>90 dni</option>
          </select>
          <button onClick={load} className="btn btn-sm btn-ghost">🔄</button>
        </div>
      </div>

      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: 16 }}>
          <div className="card" style={{ padding: '10px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--text2)' }}>Prodano</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{summary.total_sold}</div>
          </div>
          <div className="card" style={{ padding: '10px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--text2)' }}>Povp. marža</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: mColor(summary.avg_margin_pct) }}>{summary.avg_margin_pct}%</div>
          </div>
          <div className="card" style={{ padding: '10px 14px', textAlign: 'center', background: '#f0fdf4' }}>
            <div style={{ fontSize: 11, color: '#059669' }}>⭐ Zvezde</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#059669' }}>{cl.star || 0}</div>
          </div>
          <div className="card" style={{ padding: '10px 14px', textAlign: 'center', background: '#fef3c7' }}>
            <div style={{ fontSize: 11, color: '#92400e' }}>🐴 Konji</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#92400e' }}>{cl.plowhorse || 0}</div>
          </div>
          <div className="card" style={{ padding: '10px 14px', textAlign: 'center', background: '#eff6ff' }}>
            <div style={{ fontSize: 11, color: '#1d4ed8' }}>🧩 Uganke</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1d4ed8' }}>{cl.puzzle || 0}</div>
          </div>
          <div className="card" style={{ padding: '10px 14px', textAlign: 'center', background: '#fef2f2' }}>
            <div style={{ fontSize: 11, color: '#dc2626' }}>🐕 Psi</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#dc2626' }}>{cl.dog || 0}</div>
          </div>
        </div>
      )}

      {/* Matrix visualization */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, textAlign: 'center' }}>Matrika menija</div>
        <div style={{ position: 'relative', maxWidth: 500, margin: '0 auto' }}>
          <div style={{ position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%) rotate(-90deg)', transformOrigin: 'center', fontSize: 11, color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>
            Marža →
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {matrixData.map(cell => {
              const info = CLASS_INFO[cell.type]
              return (
                <button key={cell.type} onClick={() => setClassFilter(classFilter === cell.type ? '' : cell.type)}
                  style={{
                    padding: '16px 12px', borderRadius: 12, border: `2px solid ${classFilter === cell.type ? info.color : 'transparent'}`,
                    background: info.bg, cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s', minHeight: 100,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4
                  }}>
                  <div style={{ fontSize: 28 }}>{info.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: info.color }}>{info.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: info.color }}>{cell.count}</div>
                  <div style={{ fontSize: 10, color: info.color, opacity: 0.7 }}>{info.desc}</div>
                  <div style={{ fontSize: 10, color: info.color, fontWeight: 600, marginTop: 2 }}>{info.action}</div>
                </button>
              )
            })}
          </div>
          <div style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', fontWeight: 600, marginTop: 8 }}>
            Prodaja →
          </div>
        </div>
      </div>

      {/* Items table */}
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>🍽️ Izdelki</span>
          <select className="input" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ width: 140, fontSize: 12, padding: '4px 8px' }}>
            <option value="">Vse kategorije</option>
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="input" value={classFilter} onChange={e => setClassFilter(e.target.value)} style={{ width: 120, fontSize: 12, padding: '4px 8px' }}>
            <option value="">Vse klasifikacije</option>
            <option value="star">⭐ Zvezde</option>
            <option value="plowhorse">🐴 Konji</option>
            <option value="puzzle">🧩 Uganke</option>
            <option value="dog">🐕 Psi</option>
          </select>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th onClick={() => toggleSort('name')} style={{ textAlign: 'left', padding: '6px 8px', cursor: 'pointer', userSelect: 'none' }}>Ime {sortKey === 'name' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => toggleSort('category')} style={{ textAlign: 'left', padding: '6px 8px', cursor: 'pointer', userSelect: 'none' }}>Kat. {sortKey === 'category' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th style={{ textAlign: 'center', padding: '6px 4px' }}>Klas.</th>
                <th onClick={() => toggleSort('price')} style={{ textAlign: 'right', padding: '6px 8px', cursor: 'pointer', userSelect: 'none' }}>Cena {sortKey === 'price' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => toggleSort('cost')} style={{ textAlign: 'right', padding: '6px 8px', cursor: 'pointer', userSelect: 'none' }}>Strošek {sortKey === 'cost' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => toggleSort('margin_pct')} style={{ textAlign: 'right', padding: '6px 8px', cursor: 'pointer', userSelect: 'none' }}>Marža {sortKey === 'margin_pct' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => toggleSort('qty_sold')} style={{ textAlign: 'right', padding: '6px 8px', cursor: 'pointer', userSelect: 'none' }}>Prodaja {sortKey === 'qty_sold' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => toggleSort('revenue')} style={{ textAlign: 'right', padding: '6px 8px', cursor: 'pointer', userSelect: 'none' }}>Prihodek {sortKey === 'revenue' ? (sortAsc ? '▲' : '▼') : ''}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 20, color: 'var(--text2)' }}>Ni izdelkov</td></tr>
              )}
              {filtered.map(item => {
                const ci = CLASS_INFO[item.classification]
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', background: item.has_recipe ? 'transparent' : 'rgba(0,0,0,0.02)' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 600 }}>
                      {item.name}
                      {!item.has_recipe && <span style={{ fontSize: 10, color: 'var(--text2)', marginLeft: 4 }}>(brez recepta)</span>}
                    </td>
                    <td style={{ padding: '6px 8px', color: 'var(--text2)' }}>{item.category}</td>
                    <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                      <span title={`${ci.desc}. ${ci.action}`} style={{ fontSize: 16, cursor: 'help' }}>{ci.icon}</span>
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>{item.price.toFixed(2)} €</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: item.has_recipe ? '#ef4444' : 'var(--text2)' }}>
                      {item.has_recipe ? (item.cost || 0).toFixed(2) + ' €' : '—'}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: item.has_recipe ? mColor(item.margin_pct) : 'var(--text2)' }}>
                      {item.has_recipe ? (item.margin_pct || 0) + '%' : '—'}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{item.qty_sold}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: '#059669' }}>{item.revenue.toFixed(2)} €</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
