import { useState, useEffect } from 'react'
import * as api from './api'

interface Suggestion {
  id: number; menu_item_id: number; item_name: string; item_price: number;
  suggestion_type: string; original_price: number; suggested_price: number;
  discount_pct: number; reason: string; valid_from: string | null;
  valid_to: string | null; is_active: boolean; applied_count: number;
}
interface TrendingItem { id: number; name: string; qty_7d: number }
interface LowStockWarning { item: string; ingredient: string; stock: number; min: number }
interface Insights {
  trending: TrendingItem[]; low_stock_warnings: LowStockWarning[];
  active_suggestions: number; current_hour: number; day_of_week: number; time_category: string;
}

const TYPE_ICONS: Record<string, string> = {
  daily_special: '⭐', expiring: '⏰', overstocked: '📦', trending: '🔥', weather: '🌤️'
}
const TYPE_LABELS: Record<string, string> = {
  daily_special: 'Dnevna ponudba', expiring: 'Poteče', overstocked: 'Zaloge', trending: 'Priljubljeno', weather: 'Vreme'
}
const TIME_LABELS: Record<string, string> = {
  zajtrk: '🌅 Zajtrk', kosilo: '🍽️ Kosilo', popoldne: '☕ Popoldne', večerja: '🍷 Večerja', pozno: '🌙 Pozno'
}

export default function DynamicMenuPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [insights, setInsights] = useState<Insights | null>(null)
  const [tab, setTab] = useState<'suggestions' | 'insights' | 'settings'>('suggestions')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [settings, setSettings] = useState({ enabled: 'true', auto_generate: 'false', max_discount: '30', weather_enabled: 'false' })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [sugRes, insRes, setRes] = await Promise.all([
        fetch('/api/v1/dynamic-menu/suggestions', { headers: api.authHeader() }).then(r => r.json()),
        fetch('/api/v1/dynamic-menu/insights', { headers: api.authHeader() }).then(r => r.json()),
        fetch('/api/v1/dynamic-menu/settings', { headers: api.authHeader() }).then(r => r.json()),
      ])
      setSuggestions(sugRes)
      setInsights(insRes)
      setSettings(setRes)
    } catch { onNotify('Napaka pri nalaganju') }
    setLoading(false)
  }

  const generate = async () => {
    setGenerating(true)
    try {
      const r = await fetch('/api/v1/dynamic-menu/generate', { method: 'POST', headers: api.authHeader() }).then(r => r.json())
      onNotify(`✅ Generiranih ${r.generated} predlogov`)
      loadData()
    } catch { onNotify('Napaka pri generiranju') }
    setGenerating(false)
  }

  const applySuggestion = async (id: number) => {
    const r = await fetch(`/api/v1/dynamic-menu/apply/${id}`, { method: 'POST', headers: api.authHeader() }).then(r => r.json())
    onNotify(r.message || '✅ Predlog uporabljen')
    loadData()
  }

  const dismissSuggestion = async (id: number) => {
    await fetch(`/api/v1/dynamic-menu/dismiss/${id}`, { method: 'POST', headers: api.authHeader() })
    onNotify('🗑️ Predlog zavrnjen')
    loadData()
  }

  const resetPrices = async () => {
    if (!confirm('Povrni vse cene na izvirne?')) return
    const r = await fetch('/api/v1/dynamic-menu/reset-prices', { method: 'POST', headers: api.authHeader() }).then(r => r.json())
    onNotify(`🔄 Povrnjenih ${r.reset} cen`)
    loadData()
  }

  const saveSettings = async () => {
    await fetch('/api/v1/dynamic-menu/settings', {
      method: 'PUT', headers: { ...api.authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    })
    onNotify('✅ Nastavitve shranjene')
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>⏳ Nalaganje...</div>

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0 }}>🧠 Dinamični meni</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={generate} disabled={generating} className="btn btn-sm btn-primary">
            {generating ? '⏳' : '🔄'} Generiraj predloge
          </button>
          <button onClick={resetPrices} className="btn btn-sm btn-ghost">↩️ Ponastavi cene</button>
        </div>
      </div>

      {insights && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
          <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 14, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
            <div style={{ fontSize: 24 }}>{TIME_LABELS[insights.time_category]?.split(' ')[0] || '⏰'}</div>
            <div style={{ fontWeight: 700 }}>{TIME_LABELS[insights.time_category]?.split(' ')[1] || insights.time_category}</div>
            <div style={{ fontSize: 11, color: '#888' }}>{insights.current_hour}:00</div>
          </div>
          <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 14, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
            <div style={{ fontSize: 24 }}>🎯</div>
            <div style={{ fontWeight: 700 }}>{insights.active_suggestions}</div>
            <div style={{ fontSize: 11, color: '#888' }}>Aktivnih predlogov</div>
          </div>
          <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 14, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
            <div style={{ fontSize: 24 }}>🔥</div>
            <div style={{ fontWeight: 700 }}>{insights.trending.length}</div>
            <div style={{ fontSize: 11, color: '#888' }}>Priljubljenih</div>
          </div>
          <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 14, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,.08)', border: insights.low_stock_warnings.length > 0 ? '2px solid #f59e0b' : 'none' }}>
            <div style={{ fontSize: 24 }}>⚠️</div>
            <div style={{ fontWeight: 700 }}>{insights.low_stock_warnings.length}</div>
            <div style={{ fontSize: 11, color: '#888' }}>Nizke zaloge</div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['suggestions', 'insights', 'settings'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-ghost'}`}>
            {t === 'suggestions' ? '🎯 Predlogi' : t === 'insights' ? '📊vpogledi' : '⚙️ Nastavitve'}
          </button>
        ))}
      </div>

      {tab === 'suggestions' && (
        <div style={{ display: 'grid', gap: 10 }}>
          {suggestions.map(s => (
            <div key={s.id} style={{
              background: 'var(--card, #fff)', borderRadius: 12, padding: 14,
              border: `1px solid ${s.discount_pct >= 20 ? '#f59e0b' : 'var(--border, #e2e8f0)'}`,
              boxShadow: '0 1px 4px rgba(0,0,0,.06)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 28 }}>{TYPE_ICONS[s.suggestion_type] || '💡'}</span>
                  <div>
                    <div style={{ fontWeight: 700 }}>{s.item_name}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{TYPE_LABELS[s.suggestion_type] || s.suggestion_type} — {s.reason}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {s.applied_count === 0 && (
                    <button onClick={() => applySuggestion(s.id)} className="btn btn-sm btn-primary">✅ Uporabi</button>
                  )}
                  <button onClick={() => dismissSuggestion(s.id)} className="btn btn-sm btn-ghost">🗑️</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 13, alignItems: 'center' }}>
                {s.discount_pct > 0 && (
                  <>
                    <span style={{ textDecoration: 'line-through', color: '#999' }}>{s.original_price.toFixed(2)}€</span>
                    <span style={{ fontWeight: 700, color: '#059669' }}>{s.suggested_price?.toFixed(2)}€</span>
                    <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>-{s.discount_pct}%</span>
                  </>
                )}
                {s.discount_pct === 0 && <span style={{ fontWeight: 600 }}>{s.original_price.toFixed(2)}€</span>}
                {s.applied_count > 0 && <span style={{ fontSize: 11, color: '#059669' }}>✅ Uporabljeno {s.applied_count}×</span>}
              </div>
            </div>
          ))}
          {suggestions.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>
              Ni aktivnih predlogov. Klikni "Generiraj predloge" za analizo.
            </div>
          )}
        </div>
      )}

      {tab === 'insights' && insights && (
        <div>
          {insights.trending.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ marginTop: 0 }}>🔥 Top priljubljeni (7 dni)</h3>
              <div style={{ display: 'grid', gap: 6 }}>
                {insights.trending.map((t, i) => (
                  <div key={t.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'var(--card, #fff)', borderRadius: 8, padding: '10px 14px',
                    border: '1px solid var(--border)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontWeight: 700, color: i < 3 ? '#f59e0b' : '#888', width: 24 }}>#{i + 1}</span>
                      <span style={{ fontWeight: 600 }}>{t.name}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: '#059669' }}>{t.qty_7d}×</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {insights.low_stock_warnings.length > 0 && (
            <div>
              <h3 style={{ marginTop: 0 }}>⚠️ Opozorila o nizki zalogi</h3>
              <div style={{ display: 'grid', gap: 6 }}>
                {insights.low_stock_warnings.map((w, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between',
                    background: '#fffbeb', borderRadius: 8, padding: '10px 14px',
                    border: '1px solid #fde68a'
                  }}>
                    <span><strong>{w.item}</strong> — {w.ingredient}</span>
                    <span style={{ fontWeight: 600, color: '#92400e' }}>{w.stock} / {w.min}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'settings' && (
        <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 20, maxWidth: 400 }}>
          <h3 style={{ marginTop: 0 }}>⚙️ Nastavitve dinamičnega menija</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={settings.enabled === 'true'}
                onChange={e => setSettings(s => ({ ...s, enabled: e.target.checked ? 'true' : 'false' }))} />
              Omogoči dinamični meni
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={settings.auto_generate === 'true'}
                onChange={e => setSettings(s => ({ ...s, auto_generate: e.target.checked ? 'true' : 'false' }))} />
              Samodejno generiraj (vsako uro)
            </label>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Maks. popust (%)</label>
              <input className="input" type="number" min="0" max="50" value={settings.max_discount}
                onChange={e => setSettings(s => ({ ...s, max_discount: e.target.value }))} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={settings.weather_enabled === 'true'}
                onChange={e => setSettings(s => ({ ...s, weather_enabled: e.target.checked ? 'true' : 'false' }))} />
              Upoštevaj vreme
            </label>
            <button onClick={saveSettings} className="btn btn-primary">💾 Shrani</button>
          </div>
        </div>
      )}
    </div>
  )
}
