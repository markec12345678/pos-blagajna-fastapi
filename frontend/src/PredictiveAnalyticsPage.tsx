import { useState, useEffect } from 'react'
import * as api from './api'

interface ForecastPoint { date: string; revenue: number; orders: number; confidence: number }
interface WasteItem {
  ingredient_id: number; name: string; current_stock: number; unit: string;
  daily_usage: number; days_remaining: number; predicted_waste: number;
  cost_at_risk: number; urgency: string; suggestion: string;
}
interface StaffSuggestion {
  date: string; predicted_revenue: number;
  recommended_staff: { waiters: number; chefs: number; total: number };
  peak_hours: { hour: number; orders: number }[]; notes: string;
}
interface RevenuePrediction {
  forecast: number; daily_average: number; growth_vs_last_month: number;
  scenarios: { optimistic: number; base: number; pessimistic: number };
  confidence: number; factors: string[];
}
interface Summary {
  forecast_7d: any; waste_warnings: number; waste_total_cost_at_risk: number;
  revenue_prediction: number; revenue_growth: number;
  reorder_needed: number; reorder_urgent: number; confidence: number;
}

const DOW = ['Ned', 'Pon', 'Tor', 'Sre', 'Čet', 'Pet', 'Sob']
const URGENCY_COLORS: Record<string, string> = { critical: '#ef4444', warning: '#f59e0b', normal: '#22c55e' }

export default function PredictiveAnalyticsPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'overview' | 'forecast' | 'waste' | 'staffing' | 'revenue'>('overview')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [forecast, setForecast] = useState<ForecastPoint[]>([])
  const [waste, setWaste] = useState<WasteItem[]>([])
  const [staffing, setStaffing] = useState<StaffSuggestion | null>(null)
  const [revenue, setRevenue] = useState<RevenuePrediction | null>(null)
  const [loading, setLoading] = useState(true)
  const [forecastDays, setForecastDays] = useState(7)

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [sumRes, fcRes, wRes, stRes, revRes] = await Promise.all([
        fetch('/api/v1/predictive/summary', { headers: api.authHeader() }).then(r => r.json()),
        fetch(`/api/v1/predictive/demand-forecast?days_ahead=${forecastDays}`, { headers: api.authHeader() }).then(r => r.json()),
        fetch('/api/v1/predictive/waste-prediction', { headers: api.authHeader() }).then(r => r.json()),
        fetch('/api/v1/predictive/staffing-suggestion', { headers: api.authHeader() }).then(r => r.json()),
        fetch('/api/v1/predictive/revenue-prediction', { headers: api.authHeader() }).then(r => r.json()),
      ])
      setSummary(sumRes)
      setForecast(fcRes.forecast || [])
      setWaste(wRes)
      setStaffing(stRes)
      setRevenue(revRes)
    } catch { onNotify('Napaka pri nalaganju') }
    setLoading(false)
  }

  const loadForecast = async () => {
    const fcRes = await fetch(`/api/v1/predictive/demand-forecast?days_ahead=${forecastDays}`, { headers: api.authHeader() }).then(r => r.json())
    setForecast(fcRes.forecast || [])
  }

  useEffect(() => { if (!loading) loadForecast() }, [forecastDays])

  const maxRevenue = Math.max(...forecast.map(f => f.revenue), 1)

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>⏳ Nalaganje prediktivne analitike...</div>

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ margin: '0 0 16px' }}>🔮 Prediktivna analitika</h2>

      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
          {[
            { icon: '📈', value: `${summary.revenue_prediction.toFixed(0)}€`, label: 'Napoved 7 dni', color: '#3b82f6' },
            { icon: '📊', value: `${summary.revenue_growth > 0 ? '+' : ''}${summary.revenue_growth.toFixed(1)}%`, label: 'Rast L/L', color: summary.revenue_growth > 0 ? '#22c55e' : '#ef4444' },
            { icon: '🗑️', value: summary.waste_warnings.toString(), label: 'Opozorila odpadkov', color: summary.waste_warnings > 0 ? '#f59e0b' : '#22c55e' },
            { icon: '💰', value: `${summary.waste_total_cost_at_risk.toFixed(0)}€`, label: 'Tveganje odpadkov', color: summary.waste_total_cost_at_risk > 20 ? '#ef4444' : '#22c55e' },
            { icon: '📦', value: summary.reorder_needed.toString(), label: 'Potrebno naročilo', color: summary.reorder_urgent > 0 ? '#ef4444' : '#3b82f6' },
            { icon: '🎯', value: `${(summary.confidence * 100).toFixed(0)}%`, label: 'Zaupanje', color: '#8b5cf6' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 14, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
              <div style={{ fontSize: 24 }}>{s.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#888' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {([
          { key: 'overview', label: '📊 Pregled' },
          { key: 'forecast', label: '📈 Napoved' },
          { key: 'waste', label: '🗑️ Odpadki' },
          { key: 'staffing', label: '👥 Osebje' },
          { key: 'revenue', label: '💰 Prihodek' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'forecast' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Napoved za:</span>
            {[3, 7, 14, 30].map(d => (
              <button key={d} onClick={() => setForecastDays(d)} className={`btn btn-sm ${forecastDays === d ? 'btn-primary' : 'btn-ghost'}`}>{d} dni</button>
            ))}
          </div>

          <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>📈 Dnevna napoved prometa</h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 200, padding: '10px 0' }}>
              {forecast.map((f, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                  <div style={{ fontSize: 9, color: '#888', marginBottom: 2 }}>{f.revenue.toFixed(0)}€</div>
                  <div style={{
                    width: '100%', maxWidth: 40, borderRadius: '4px 4px 0 0',
                    height: `${Math.max(4, (f.revenue / maxRevenue) * 100)}%`,
                    background: `rgba(59,130,246,${0.3 + f.confidence * 0.7})`,
                    transition: 'height 0.3s'
                  }} />
                  <div style={{ fontSize: 8, color: '#888', marginTop: 4 }}>
                    {new Date(f.date).getDate()}/{new Date(f.date).getMonth() + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {revenue && (
            <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 16 }}>
              <h3 style={{ marginTop: 0 }}>🔮 Scenariji</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  { label: 'Pesimističen', value: revenue.scenarios.pessimistic, color: '#ef4444', icon: '📉' },
                  { label: 'Osnovni', value: revenue.scenarios.base, color: '#3b82f6', icon: '📊' },
                  { label: 'Optimističen', value: revenue.scenarios.optimistic, color: '#22c55e', icon: '📈' },
                ].map((s, i) => (
                  <div key={i} style={{ textAlign: 'center', padding: 12, background: `${s.color}10`, borderRadius: 8 }}>
                    <div style={{ fontSize: 20 }}>{s.icon}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value.toFixed(0)}€</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {revenue.factors.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Deavniki vpliva:</div>
                  {revenue.factors.map((f, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#666', padding: '2px 0' }}>{f}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'waste' && (
        <div>
          <h3 style={{ marginTop: 0 }}>🗑️ Napoved odpadkov</h3>
          {waste.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#22c55e' }}>✅ Ni opozoril o odpadkih</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {waste.map((w, i) => (
                <div key={i} style={{
                  background: 'var(--card, #fff)', borderRadius: 10, padding: 14,
                  borderLeft: `4px solid ${URGENCY_COLORS[w.urgency]}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{w.name}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>
                        Zaloga: {w.current_stock} {w.unit} | Dnevna poraba: {w.daily_usage} | Preostalo: {w.days_remaining} dni
                      </div>
                    </div>
                    <span style={{
                      padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                      background: `${URGENCY_COLORS[w.urgency]}20`, color: URGENCY_COLORS[w.urgency]
                    }}>
                      {w.urgency === 'critical' ? '🔴 Kriticno' : w.urgency === 'warning' ? '🟡 Opozorilo' : '🟢 V redu'}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>{w.suggestion}</div>
                  {w.cost_at_risk > 0 && (
                    <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>Tveganje: {w.cost_at_risk.toFixed(2)}€</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'staffing' && staffing && (
        <div>
          <h3 style={{ marginTop: 0 }}>👥 Priporočilo za osebje — {new Date(staffing.date).toLocaleDateString('sl-SI', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
            <div style={{ background: '#eff6ff', borderRadius: 12, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 28 }}>👨‍🍳</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#3b82f6' }}>{staffing.recommended_staff.chefs}</div>
              <div style={{ fontSize: 12, color: '#888' }}>Kuharji</div>
            </div>
            <div style={{ background: '#f0fdf4', borderRadius: 12, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 28 }}>🧑‍🍳</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#059669' }}>{staffing.recommended_staff.waiters}</div>
              <div style={{ fontSize: 12, color: '#888' }}>Natakarji</div>
            </div>
            <div style={{ background: '#fdf4ff', borderRadius: 12, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 28 }}>💰</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#8b5cf6' }}>{staffing.predicted_revenue.toFixed(0)}€</div>
              <div style={{ fontSize: 12, color: '#888' }}>Napoved prometa</div>
            </div>
          </div>

          {staffing.peak_hours.length > 0 && (
            <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
              <h4 style={{ marginTop: 0 }}>⏰ Konice</h4>
              <div style={{ display: 'flex', gap: 12 }}>
                {staffing.peak_hours.map((p, i) => (
                  <div key={i} style={{ textAlign: 'center', padding: '8px 16px', background: '#fef3c7', borderRadius: 8 }}>
                    <div style={{ fontWeight: 700, color: '#92400e' }}>{p.hour}:00</div>
                    <div style={{ fontSize: 11, color: '#92400e' }}>{p.orders} naročil</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 16 }}>
            <h4 style={{ marginTop: 0 }}>📝 Opombe</h4>
            <p style={{ fontSize: 13, color: '#666', margin: 0 }}>{staffing.notes}</p>
          </div>
        </div>
      )}

      {tab === 'revenue' && revenue && (
        <div>
          <h3 style={{ marginTop: 0 }}>💰 Napoved prihodka</h3>
          <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 20, textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 14, color: '#888' }}>Napoved za naslednjih 30 dni</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#3b82f6', margin: '8px 0' }}>{revenue.forecast.toFixed(0)}€</div>
            <div style={{ fontSize: 14, color: '#888' }}>{revenue.daily_average.toFixed(0)}€/dan povprečno</div>
            <div style={{ fontSize: 13, marginTop: 8, color: revenue.growth_vs_last_month > 0 ? '#22c55e' : '#ef4444' }}>
              {revenue.growth_vs_last_month > 0 ? '📈' : '📉'} {revenue.growth_vs_last_month > 0 ? '+' : ''}{revenue.growth_vs_last_month.toFixed(1)}% primerjano z prejšnjim mesecem
            </div>
          </div>

          <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 16 }}>
            <h4 style={{ marginTop: 0 }}>🎯 Scenariji</h4>
            {[
              { label: '🟢 Optimističen', value: revenue.scenarios.optimistic, desc: 'Če se trend nadaljuje' },
              { label: '🔵 Osnovni', value: revenue.scenarios.base, desc: 'Najverjetnejši scenarij' },
              { label: '🔴 Pesimističen', value: revenue.scenarios.pessimistic, desc: 'V slabšem primeru' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{s.label}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{s.desc}</div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{s.value.toFixed(0)}€</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
