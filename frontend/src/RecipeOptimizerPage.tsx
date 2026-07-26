import { useState, useEffect } from 'react'
import * as api from './api'

export default function RecipeOptimizerPage({ onNotify }: { onNotify: (m: string) => void }) {
  const [data, setData] = useState<any>(null)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [sortKey, setSortKey] = useState('potential_saving')
  const [sortAsc, setSortAsc] = useState(false)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetch('/api/v1/analytics/recipe-optimizer', { headers: api.authHeader() })
      .then(r => r.json()).then(setData)
  }, [])

  if (!data) return <div className="page-container"><p>Nalaganje...</p></div>

  let items = [...data.items]
  if (filter === 'savings') items = items.filter(i => i.potential_saving > 0)
  else if (filter === 'no-savings') items = items.filter(i => i.potential_saving === 0)

  items.sort((a: any, b: any) => sortAsc ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey])

  const toggle = (id: number) => {
    const s = new Set(expanded)
    s.has(id) ? s.delete(id) : s.add(id)
    setExpanded(s)
  }

  const sortBy = (k: string) => { setSortKey(k); setSortAsc(k === sortKey ? !sortAsc : false) }

  const fmtPct = (v: number) => v >= 0 ? `${v.toFixed(1)}%` : `-${Math.abs(v).toFixed(1)}%`

  return (
    <div className="page-container" style={{ maxWidth: 1000, margin: '0 auto', padding: 20 }}>
      <h2 className="page-title">🔧 Optimizacija receptur</h2>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        {[
          { label: 'Artikli z recepti', value: data.summary.total_items, color: '#6366f1' },
          { label: 'Trenutni strošek', value: `${data.summary.total_current_cost.toFixed(2)} €`, color: '#ef4444' },
          { label: 'Optimiziran strošek', value: `${data.summary.total_optimized_cost.toFixed(2)} €`, color: '#059669' },
          { label: 'Potencialni prihranek', value: `${data.summary.total_potential_saving.toFixed(2)} €`, color: '#8b5cf6' },
          { label: 'Prihranek %', value: fmtPct(data.summary.saving_pct), color: '#f59e0b' },
          { label: 'Artikli s prihranki', value: data.summary.items_with_savings, color: '#06b6d4' },
        ].map(c => (
          <div key={c.label} className="card" style={{
            flex: '1 0 140px', padding: 12, textAlign: 'center',
            borderLeft: `3px solid ${c.color}`
          }}>
            <div style={{ fontSize: 11, color: 'var(--text2)' }}>{c.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('all')}>Vsi</button>
        <button className={`btn btn-sm ${filter === 'savings' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('savings')}>S prihranki</button>
        <button className={`btn btn-sm ${filter === 'no-savings' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('no-savings')}>Brez prihranka</button>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 24 }} />
              <th onClick={() => sortBy('name')} style={{ cursor: 'pointer' }}>Artikel {sortKey === 'name' ? (sortAsc ? '▲' : '▼') : ''}</th>
              <th onClick={() => sortBy('category')} style={{ cursor: 'pointer' }}>Kategorija</th>
              <th onClick={() => sortBy('price')} style={{ cursor: 'pointer', textAlign: 'right' }}>Cena</th>
              <th onClick={() => sortBy('current_cost')} style={{ cursor: 'pointer', textAlign: 'right' }}>Strošek</th>
              <th onClick={() => sortBy('current_margin_pct')} style={{ cursor: 'pointer', textAlign: 'right' }}>Marža</th>
              <th onClick={() => sortBy('optimized_cost')} style={{ cursor: 'pointer', textAlign: 'right' }}>Opt. strošek</th>
              <th onClick={() => sortBy('optimized_margin_pct')} style={{ cursor: 'pointer', textAlign: 'right' }}>Opt. marža</th>
              <th onClick={() => sortBy('potential_saving')} style={{ cursor: 'pointer', textAlign: 'right', color: '#8b5cf6' }}>Prihranek</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any) => (
              <>
                <tr key={item.id} onClick={() => item.suggestion_count > 0 && toggle(item.id)}
                  style={{ cursor: item.suggestion_count > 0 ? 'pointer' : 'default' }}>
                  <td>{item.suggestion_count > 0 ? (expanded.has(item.id) ? '▼' : '▶') : ''}</td>
                  <td style={{ fontWeight: 600 }}>{item.name}</td>
                  <td style={{ fontSize: 12, color: 'var(--text2)' }}>{item.category}</td>
                  <td style={{ textAlign: 'right' }}>{item.price.toFixed(2)} €</td>
                  <td style={{ textAlign: 'right', color: item.current_margin_pct < 30 ? '#ef4444' : 'inherit' }}>{item.current_cost.toFixed(2)} €</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: item.current_margin_pct < 30 ? '#ef4444' : item.current_margin_pct > 60 ? '#059669' : 'inherit' }}>
                    {fmtPct(item.current_margin_pct)}
                  </td>
                  <td style={{ textAlign: 'right', color: '#059669' }}>{item.optimized_cost.toFixed(2)} €</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: '#059669' }}>{fmtPct(item.optimized_margin_pct)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: item.potential_saving > 0 ? '#8b5cf6' : 'var(--text2)' }}>
                    {item.potential_saving > 0 ? `${item.potential_saving.toFixed(2)} €` : '—'}
                  </td>
                </tr>
                {expanded.has(item.id) && (
                  <tr key={`${item.id}-subs`}>
                    <td colSpan={9} style={{ padding: '0 12px 12px 36px', background: 'var(--bg)' }}>
                      <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 8, marginBottom: 6 }}>Predlagane zamenjave:</div>
                      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ color: 'var(--text2)' }}>
                            <th style={{ textAlign: 'left' }}>Sestavina</th>
                            <th style={{ textAlign: 'right' }}>Količina</th>
                            <th style={{ textAlign: 'right' }}>Trenutno</th>
                            <th style={{ textAlign: 'right' }}>→</th>
                            <th style={{ textAlign: 'right' }}>Predlog</th>
                            <th style={{ textAlign: 'right', color: '#059669' }}>Prihranek</th>
                          </tr>
                        </thead>
                        <tbody>
                          {item.suggestions.map((s: any, i: number) => (
                            <tr key={i}>
                              <td>{s.current_ingredient}</td>
                              <td style={{ textAlign: 'right' }}>{s.quantity}</td>
                              <td style={{ textAlign: 'right' }}>{s.current_line_cost.toFixed(2)} €</td>
                              <td style={{ textAlign: 'center', color: '#8b5cf6' }}>→</td>
                              <td style={{ textAlign: 'right' }}>{s.suggested_ingredient} ({s.suggested_line_cost.toFixed(2)} €)</td>
                              <td style={{ textAlign: 'right', fontWeight: 600, color: '#059669' }}>{s.saving.toFixed(2)} €</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
