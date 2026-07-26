import { useState, useEffect } from 'react'

interface ABCItem {
  id: number; name: string; usage_quantity: number; usage_percentage: number;
  current_stock: number; unit: string; cost_per_unit: number; category: string
}

interface WasteItem {
  name: string; quantity: number; unit: string; cost: number
}

interface ReorderItem {
  id: number; name: string; current_stock: number; min_stock: number;
  daily_usage: number; days_until_stockout: number | null;
  urgency: string; suggested_order_qty: number; unit: string; estimated_cost: number
}

const CATEGORY_COLORS = { A: '#ef4444', B: '#f59e0b', C: '#22c55e' }
const URGENCY_COLORS: Record<string, string> = {
  critical: '#ef4444', urgent: '#f97316', warning: '#f59e0b', low: '#3b82f6', ok: '#22c55e'
}

export default function InventoryAnalyticsPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'abc' | 'valuation' | 'waste' | 'reorder'>('abc')
  const [abcData, setAbcData] = useState<{ summary: any; items: ABCItem[] } | null>(null)
  const [valuation, setValuation] = useState<any>(null)
  const [waste, setWaste] = useState<any>(null)
  const [reorder, setReorder] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [days, setDays] = useState(30)

  const headers = { ...JSON.parse(localStorage.getItem('auth') || '{}').headers }

  useEffect(() => { loadData() }, [tab, days])

  const loadData = async () => {
    setLoading(true)
    try {
      if (tab === 'abc') {
        const r = await fetch(`/api/v1/inventory-analytics/abc?days=${days}`, { headers }).then(r => r.json())
        setAbcData(r)
      } else if (tab === 'valuation') {
        const r = await fetch('/api/v1/inventory-analytics/stock-valuation', { headers }).then(r => r.json())
        setValuation(r)
      } else if (tab === 'waste') {
        const r = await fetch(`/api/v1/inventory-analytics/waste-report?days=${days}`, { headers }).then(r => r.json())
        setWaste(r)
      } else {
        const r = await fetch('/api/v1/inventory-analytics/reorder-suggestions', { headers }).then(r => r.json())
        setReorder(r)
      }
    } catch { onNotify('Napaka') }
    setLoading(false)
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ margin: '0 0 16px' }}>📊 Analitika zalog</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { key: 'abc', label: '🔤 ABC analiza' },
          { key: 'valuation', label: '💰 Vrednost' },
          { key: 'waste', label: '🗑️ Zavrženo' },
          { key: 'reorder', label: '📦 Naročilo' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>
            {t.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <select className="input" value={days} onChange={e => setDays(parseInt(e.target.value))} style={{ width: 100, fontSize: 12 }}>
          <option value={7}>7 dni</option>
          <option value={30}>30 dni</option>
          <option value={90}>90 dni</option>
        </select>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40 }}>⏳ Nalaganje...</div>}

      {/* ABC Analysis */}
      {tab === 'abc' && abcData && !loading && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
            <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{abcData.summary.total_items}</div>
              <div style={{ fontSize: 11, color: '#888' }}>Skupaj artiklov</div>
            </div>
            <div style={{ background: '#fef2f2', borderRadius: 12, padding: 14, textAlign: 'center', border: '2px solid #ef4444' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#ef4444' }}>{abcData.summary.a_items}</div>
              <div style={{ fontSize: 11, color: '#888' }}>A ({abcData.summary.a_pct_items}%)</div>
            </div>
            <div style={{ background: '#fefce8', borderRadius: 12, padding: 14, textAlign: 'center', border: '2px solid #f59e0b' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#f59e0b' }}>{abcData.summary.b_items}</div>
              <div style={{ fontSize: 11, color: '#888' }}>B</div>
            </div>
            <div style={{ background: '#f0fdf4', borderRadius: 12, padding: 14, textAlign: 'center', border: '2px solid #22c55e' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#22c55e' }}>{abcData.summary.c_items}</div>
              <div style={{ fontSize: 11, color: '#888' }}>C</div>
            </div>
          </div>

          {/* Visual bar chart */}
          <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>Porazdelitev porabe</h3>
            <div style={{ display: 'flex', height: 30, borderRadius: 6, overflow: 'hidden' }}>
              {abcData.items.slice(0, 20).map((item, i) => (
                <div key={i} title={`${item.name}: ${item.usage_percentage}%`}
                  style={{
                    width: `${item.usage_percentage}%`,
                    background: CATEGORY_COLORS[item.category as keyof typeof CATEGORY_COLORS],
                    minWidth: 2,
                  }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11 }}>
              <span>🔴 A (80% porabe)</span>
              <span>🟡 B (15%)</span>
              <span>🟢 C (5%)</span>
            </div>
          </div>

          {/* Items list */}
          <div style={{ display: 'grid', gap: 6 }}>
            {abcData.items.map(item => (
              <div key={item.id} style={{
                background: 'var(--card, #fff)', borderRadius: 8, padding: 10,
                display: 'grid', gridTemplateColumns: '30px 1fr 80px 80px 60px', gap: 8, alignItems: 'center',
                borderLeft: `4px solid ${CATEGORY_COLORS[item.category as keyof typeof CATEGORY_COLORS]}`
              }}>
                <span style={{
                  width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${CATEGORY_COLORS[item.category as keyof typeof CATEGORY_COLORS]}20`, color: CATEGORY_COLORS[item.category as keyof typeof CATEGORY_COLORS],
                  fontWeight: 700, fontSize: 12
                }}>
                  {item.category}
                </span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{item.usage_percentage}% porabe</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600 }}>{item.usage_quantity}</div>
                  <div style={{ fontSize: 10, color: '#888' }}>{item.unit}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div>{item.current_stock}</div>
                  <div style={{ fontSize: 10, color: '#888' }}>zaloga</div>
                </div>
                <div style={{ textAlign: 'right' }}>€{item.cost_per_unit.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stock Valuation */}
      {tab === 'valuation' && valuation && !loading && (
        <div>
          <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 20, marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: '#888' }}>Skupna vrednost zalog</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#22c55e' }}>€{valuation.total_value.toFixed(2)}</div>
          </div>

          <h3 style={{ fontSize: 14 }}>Top 5 po vrednosti</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {valuation.top_5_by_value?.map((item: any, i: number) => {
              const maxVal = valuation.top_5_by_value[0]?.total_value || 1
              return (
                <div key={i} style={{ background: 'var(--card, #fff)', borderRadius: 8, padding: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</span>
                    <span style={{ fontWeight: 700, color: '#22c55e' }}>€{item.total_value.toFixed(2)}</span>
                  </div>
                  <div style={{ background: '#f3f4f6', borderRadius: 4, height: 8 }}>
                    <div style={{ width: `${(item.total_value / maxVal) * 100}%`, background: '#22c55e', height: '100%', borderRadius: 4 }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{item.stock} {item.unit} × €{item.cost_per_unit.toFixed(2)}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Waste Report */}
      {tab === 'waste' && waste && !loading && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div style={{ background: '#fef2f2', borderRadius: 12, padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#ef4444' }}>€{waste.total_waste_cost.toFixed(2)}</div>
              <div style={{ fontSize: 11, color: '#888' }}>Strošek zavrženega</div>
            </div>
            <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{waste.total_waste_items}</div>
              <div style={{ fontSize: 11, color: '#888' }}>Artiklov zavrženih</div>
            </div>
          </div>

          {waste.items?.length > 0 && (
            <div style={{ display: 'grid', gap: 8 }}>
              {waste.items.map((item: WasteItem, i: number) => {
                const maxCost = waste.items[0]?.cost || 1
                return (
                  <div key={i} style={{ background: 'var(--card, #fff)', borderRadius: 8, padding: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600 }}>{item.name}</span>
                      <span style={{ color: '#ef4444', fontWeight: 700 }}>€{item.cost.toFixed(2)}</span>
                    </div>
                    <div style={{ background: '#fee2e2', borderRadius: 4, height: 6 }}>
                      <div style={{ width: `${(item.cost / maxCost) * 100}%`, background: '#ef4444', height: '100%', borderRadius: 4 }} />
                    </div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{item.quantity} {item.unit}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Reorder Suggestions */}
      {tab === 'reorder' && reorder && !loading && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div style={{ background: '#fef2f2', borderRadius: 12, padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#ef4444' }}>{reorder.total_suggestions}</div>
              <div style={{ fontSize: 11, color: '#888' }}>Predlogov za naročilo</div>
            </div>
            <div style={{ background: '#fefce8', borderRadius: 12, padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#f59e0b' }}>€{reorder.total_estimated_cost.toFixed(2)}</div>
              <div style={{ fontSize: 11, color: '#888' }}>Ocenjeni strošek</div>
            </div>
          </div>

          {reorder.suggestions?.map((item: ReorderItem, i: number) => (
            <div key={i} style={{
              background: 'var(--card, #fff)', borderRadius: 10, padding: 12, marginBottom: 8,
              borderLeft: `4px solid ${URGENCY_COLORS[item.urgency]}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                    background: `${URGENCY_COLORS[item.urgency]}20`, color: URGENCY_COLORS[item.urgency],
                    textTransform: 'uppercase'
                  }}>
                    {item.urgency}
                  </span>
                  <span style={{ fontWeight: 600 }}>{item.name}</span>
                </div>
                <span style={{ fontWeight: 700, color: '#f59e0b' }}>€{item.estimated_cost.toFixed(2)}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, fontSize: 12 }}>
                <div><span style={{ color: '#888' }}>Zaloga:</span> {item.current_stock} {item.unit}</div>
                <div><span style={{ color: '#888' }}>Min:</span> {item.min_stock}</div>
                <div><span style={{ color: '#888' }}>Dnevna poraba:</span> {item.daily_usage}</div>
                <div><span style={{ color: '#888' }}>Naroči:</span> <strong>{item.suggested_order_qty}</strong> {item.unit}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
