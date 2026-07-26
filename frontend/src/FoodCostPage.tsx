import { useState, useEffect } from 'react'
import { authHeader } from './api'

interface FoodCostItem {
  id: number; name: string; category: string; price: number;
  cost: number; margin: number; margin_pct: number;
  ingredient_count: number; has_recipe: boolean
}

interface CatSummary {
  name: string; total_cost: number; total_revenue: number;
  margin: number; margin_pct: number; item_count: number
}

interface Warnings {
  no_recipe_items: string[]
  low_margin_items: { name: string; margin_pct: number }[]
  negative_margin_items: { name: string; margin_pct: number }[]
}

type SortKey = 'name' | 'category' | 'price' | 'cost' | 'margin_pct'

export default function FoodCostPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [items, setItems] = useState<FoodCostItem[]>([])
  const [cats, setCats] = useState<CatSummary[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [warnings, setWarnings] = useState<Warnings | null>(null)
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('margin_pct')
  const [sortAsc, setSortAsc] = useState(true)
  const [filter, setFilter] = useState<'all' | 'recipe' | 'norecipe' | 'low' | 'negative'>('all')
  const [search, setSearch] = useState('')

  const api = () => fetch('/api/v1/analytics/food-costs', {
    headers: authHeader()
  })

  const load = () => {
    setLoading(true)
    api().then(r => r.json()).then(d => {
      setItems(d.items || [])
      setCats(d.categories || [])
      setSummary(d.summary)
      setWarnings(d.warnings)
      setLoading(false)
    }).catch(() => { setLoading(false); onNotify('Napaka pri nalaganju') })
  }

  useEffect(load, [])

  const sorter = (a: FoodCostItem, b: FoodCostItem) => {
    let va: any, vb: any
    switch (sortKey) {
      case 'name': va = a.name; vb = b.name; break
      case 'category': va = a.category; vb = b.category; break
      case 'price': va = a.price; vb = b.price; break
      case 'cost': va = a.cost; vb = b.cost; break
      case 'margin_pct': va = a.margin_pct; vb = b.margin_pct; break
      default: va = a.margin_pct; vb = b.margin_pct
    }
    return sortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
  }

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortAsc(!sortAsc)
    else { setSortKey(k); setSortAsc(true) }
  }

  const sQuery = search.toLowerCase()
  const filtered = items
    .filter(i => !sQuery || i.name.toLowerCase().includes(sQuery) || i.category.toLowerCase().includes(sQuery))
    .filter(i => {
      if (filter === 'recipe') return i.has_recipe
      if (filter === 'norecipe') return !i.has_recipe
      if (filter === 'low') return i.has_recipe && i.margin_pct < 30
      if (filter === 'negative') return i.has_recipe && i.margin_pct <= 0
      return true
    })
    .sort(sorter)

  const mColor = (pct: number) => {
    if (pct <= 0) return '#ef4444'
    if (pct < 20) return '#f97316'
    if (pct < 30) return '#f59e0b'
    if (pct < 50) return '#22c55e'
    return '#059669'
  }

  if (loading) return <div className="page-container-sm"><p style={{ textAlign: 'center', color: 'var(--text2)', padding: 40 }}>Nalaganje...</p></div>

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">💰 Analiza stroškov hrane</h2>
        <button onClick={load} className="btn btn-sm btn-ghost">🔄 Osveži</button>
      </div>

      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 16 }}>
          <div className="card" style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>Skupni stroški</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#ef4444' }}>{summary.total_cost.toFixed(2)} €</div>
          </div>
          <div className="card" style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>Skupni prihodki</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#059669' }}>{summary.total_revenue.toFixed(2)} €</div>
          </div>
          <div className="card" style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>Marža</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: mColor(summary.overall_margin_pct) }}>
              {summary.overall_margin_pct}%
            </div>
          </div>
          <div className="card" style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>Dobiček</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: summary.overall_margin >= 0 ? '#059669' : '#ef4444' }}>
              {summary.overall_margin.toFixed(2)} €
            </div>
          </div>
          <div className="card" style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>Izdelkov</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{summary.total_items}</div>
          </div>
          <div className="card" style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>Sestavine</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{summary.items_with_recipe}/{summary.total_items}</div>
          </div>
        </div>
      )}

      {warnings && (warnings.negative_margin_items.length > 0 || warnings.no_recipe_items.length > 0 || warnings.low_margin_items.length > 0) && (
        <div className="card" style={{ padding: 16, marginBottom: 16, border: '2px solid var(--red)', background: 'rgba(239,68,68,0.05)' }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, color: 'var(--red)' }}>⚠️ Opozorila</div>
          {warnings.negative_margin_items.length > 0 && (
            <div style={{ fontSize: 13, marginBottom: 4, color: 'var(--red)' }}>
              ❌ {warnings.negative_margin_items.length} izdelkov s negativno maržo:
              {warnings.negative_margin_items.slice(0, 5).map(i => ` ${i.name} (${i.margin_pct}%)`).join(',')}
              {warnings.negative_margin_items.length > 5 && ` +${warnings.negative_margin_items.length - 5} več`}
            </div>
          )}
          {warnings.low_margin_items.length > 0 && (
            <div style={{ fontSize: 13, marginBottom: 4, color: '#f59e0b' }}>
              ⚠️ {warnings.low_margin_items.length} izdelkov z nizko maržo (&lt;30%)
            </div>
          )}
          {warnings.no_recipe_items.length > 0 && (
            <div style={{ fontSize: 13, color: '#f59e0b' }}>
              📝 {warnings.no_recipe_items.length} izdelkov brez recepta (ni podatka o stroških)
            </div>
          )}
        </div>
      )}

      {cats.length > 0 && (
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>📊 Po kategorijah</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '6px 8px' }}>Kategorija</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px' }}>Stroški</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px' }}>Prihodki</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px' }}>Marža</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px' }}>%</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px' }}>Izdelkov</th>
                </tr>
              </thead>
              <tbody>
                {cats.map(c => (
                  <tr key={c.name} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 600 }}>{c.name}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: '#ef4444' }}>{c.total_cost.toFixed(2)} €</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: '#059669' }}>{c.total_revenue.toFixed(2)} €</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: mColor(c.margin_pct) }}>{c.margin.toFixed(2)} €</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: mColor(c.margin_pct) }}>{c.margin_pct}%</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>{c.item_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>🍽️ Izdelki</span>
          <input className="input" placeholder="🔍 Išči..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 160, padding: '4px 8px', fontSize: 13 }} />
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {(['all', 'recipe', 'norecipe', 'low', 'negative'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: '2px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: filter === f ? 'var(--blue)' : 'var(--bg2)', color: filter === f ? '#fff' : 'var(--text)' }}>
                {f === 'all' ? 'Vsi' : f === 'recipe' ? 'S receptom' : f === 'norecipe' ? 'Brez recepta' : f === 'low' ? 'Nizka marža' : 'Negativna'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th onClick={() => toggleSort('name')} style={{ textAlign: 'left', padding: '8px', cursor: 'pointer', userSelect: 'none' }}>
                  Ime {sortKey === 'name' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => toggleSort('category')} style={{ textAlign: 'left', padding: '8px', cursor: 'pointer', userSelect: 'none' }}>
                  Kategorija {sortKey === 'category' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => toggleSort('price')} style={{ textAlign: 'right', padding: '8px', cursor: 'pointer', userSelect: 'none' }}>
                  Cena {sortKey === 'price' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => toggleSort('cost')} style={{ textAlign: 'right', padding: '8px', cursor: 'pointer', userSelect: 'none' }}>
                  Strošek {sortKey === 'cost' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => toggleSort('margin_pct')} style={{ textAlign: 'right', padding: '8px', cursor: 'pointer', userSelect: 'none' }}>
                  Marža {sortKey === 'margin_pct' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th style={{ textAlign: 'right', padding: '8px' }}>Dobiček</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text2)' }}>Ni izdelkov</td></tr>
              )}
              {filtered.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', opacity: item.has_recipe ? 1 : 0.5 }}>
                  <td style={{ padding: '6px 8px' }}>
                    {item.name}
                    {!item.has_recipe && <span style={{ fontSize: 10, color: 'var(--text2)', marginLeft: 6 }}>(brez recepta)</span>}
                    {item.ingredient_count > 0 && <span style={{ fontSize: 10, color: 'var(--text2)', marginLeft: 4 }}>({item.ingredient_count} sestavin)</span>}
                  </td>
                  <td style={{ padding: '6px 8px', color: 'var(--text2)' }}>{item.category}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{item.price.toFixed(2)} €</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', color: '#ef4444' }}>{item.has_recipe ? item.cost.toFixed(2) + ' €' : '—'}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: item.has_recipe ? mColor(item.margin_pct) : 'var(--text2)' }}>
                    {item.has_recipe ? item.margin_pct + '%' : '—'}
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: item.has_recipe ? (item.margin >= 0 ? '#059669' : '#ef4444') : 'var(--text2)' }}>
                    {item.has_recipe ? item.margin.toFixed(2) + ' €' : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
