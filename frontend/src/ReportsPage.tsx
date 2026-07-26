import { useState, useEffect } from 'react'

interface DailyReport {
  date: string; generated_at: string;
  summary: { total_revenue: number; total_orders: number; avg_order: number };
  payment_methods: Record<string, number>;
  top_items: { name: string; quantity: number }[];
  hourly_breakdown: Record<string, { orders: number; revenue: number }>;
}

interface WeeklyReport {
  period: string; generated_at: string;
  summary: { total_revenue: number; total_orders: number; avg_order: number; growth_pct: number; prev_week_revenue: number };
  daily_breakdown: Record<string, { orders: number; revenue: number }>;
  best_day: [string, { orders: number; revenue: number }] | null;
  worst_day: [string, { orders: number; revenue: number }] | null;
}

interface MonthlyReport {
  period: string; generated_at: string;
  summary: { total_revenue: number; total_orders: number; avg_order: number; days_in_month: number };
  daily_breakdown: Record<string, number>;
  best_day: { day: number; revenue: number } | null;
  avg_daily_revenue: number;
}

const TABS = [
  { key: 'daily', label: '📅 Dnevno', icon: '📅' },
  { key: 'weekly', label: '📆 Tedensko', icon: '📆' },
  { key: 'monthly', label: '🗓️ Mesečno', icon: '🗓️' },
]

export default function ReportsPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'daily'|'weekly'|'monthly'>('daily')
  const [daily, setDaily] = useState<DailyReport | null>(null)
  const [weekly, setWeekly] = useState<WeeklyReport | null>(null)
  const [monthly, setMonthly] = useState<MonthlyReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1)
    return d.toISOString().split('T')[0]
  })
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)

  const headers = { ...JSON.parse(localStorage.getItem('auth') || '{}').headers }

  const loadDaily = async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/v1/reports/daily?date=${date}`, { headers }).then(r => r.json())
      setDaily(r)
    } catch { onNotify('Napaka') }
    setLoading(false)
  }

  const loadWeekly = async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/v1/reports/weekly?start_date=${weekStart}`, { headers }).then(r => r.json())
      setWeekly(r)
    } catch { onNotify('Napaka') }
    setLoading(false)
  }

  const loadMonthly = async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/v1/reports/monthly?year=${year}&month=${month}`, { headers }).then(r => r.json())
      setMonthly(r)
    } catch { onNotify('Napaka') }
    setLoading(false)
  }

  useEffect(() => {
    if (tab === 'daily') loadDaily()
    else if (tab === 'weekly') loadWeekly()
    else loadMonthly()
  }, [tab, date, weekStart, year, month])

  const printReport = (data: any) => {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<html><head><title>Poročilo</title><style>
      body{font-family:sans-serif;padding:20px;max-width:600px;margin:0 auto}
      h1{font-size:20px;border-bottom:2px solid #333;padding-bottom:8px}
      .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee}
      .label{color:#666}.value{font-weight:600}
      .total{font-size:18px;font-weight:700;color:#22c55e;border-top:2px solid #333;padding-top:8px;margin-top:12px}
      .section{margin:16px 0}
      .section h3{font-size:14px;color:#555;margin-bottom:8px}
      @media print{body{padding:10px}}
    </style></head><body>`)
    w.document.write(`<h1>📊 Poročilo</h1>`)
    if (data.summary) {
      w.document.write(`<div class="section"><h3>Povzetek</div>`)
      Object.entries(data.summary).forEach(([k, v]) => {
        w.document.write(`<div class="row"><span class="label">${k}</span><span class="value">${v}</span></div>`)
      })
      w.document.write(`</div>`)
    }
    w.document.write(`<div style="margin-top:20px;font-size:11px;color:#888">Generirano: ${data.generated_at || new Date().toLocaleString('sl-SI')}</div>`)
    w.document.write(`</body></html>`)
    w.document.close()
    w.print()
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ margin: '0 0 16px' }}>📊 Poročila</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Date pickers */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        {tab === 'daily' && (
          <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} style={{ fontSize: 13 }} />
        )}
        {tab === 'weekly' && (
          <input type="date" className="input" value={weekStart} onChange={e => setWeekStart(e.target.value)} style={{ fontSize: 13 }} />
        )}
        {tab === 'monthly' && (
          <>
            <select className="input" value={month} onChange={e => setMonth(parseInt(e.target.value))} style={{ width: 120, fontSize: 13 }}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{new Date(2024, i).toLocaleDateString('sl-SI', { month: 'long' })}</option>
              ))}
            </select>
            <select className="input" value={year} onChange={e => setYear(parseInt(e.target.value))} style={{ width: 80, fontSize: 13 }}>
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </>
        )}
        <button className="btn btn-sm btn-primary" onClick={tab === 'daily' ? loadDaily : tab === 'weekly' ? loadWeekly : loadMonthly}>
          🔄 Naloži
        </button>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40 }}>⏳ Nalaganje...</div>}

      {/* Daily Report */}
      {tab === 'daily' && daily && !loading && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Promet', value: `€${daily.summary.total_revenue.toFixed(2)}`, icon: '💰' },
              { label: 'Naročila', value: daily.summary.total_orders.toString(), icon: '📋' },
              { label: 'Povprečje', value: `€${daily.summary.avg_order.toFixed(2)}`, icon: '📊' },
            ].map((s, i) => (
              <div key={i} style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 24 }}>{s.icon}</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#888' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {Object.keys(daily.payment_methods).length > 0 && (
            <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <h3 style={{ marginTop: 0 }}>💳 Način plačila</h3>
              {Object.entries(daily.payment_methods).map(([method, amount], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eee' }}>
                  <span style={{ textTransform: 'capitalize' }}>{method}</span>
                  <span style={{ fontWeight: 600 }}>€{amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {daily.top_items.length > 0 && (
            <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <h3 style={{ marginTop: 0 }}>🏆 Top artikli</h3>
              {daily.top_items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eee' }}>
                  <span>{i + 1}. {item.name}</span>
                  <span style={{ fontWeight: 600 }}>{item.quantity}×</span>
                </div>
              ))}
            </div>
          )}

          {Object.keys(daily.hourly_breakdown).length > 0 && (
            <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 16 }}>
              <h3 style={{ marginTop: 0 }}>⏰ Po urah</h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 100 }}>
                {Object.entries(daily.hourly_breakdown).map(([hour, data], i) => {
                  const maxRev = Math.max(...Object.values(daily.hourly_breakdown).map(d => d.revenue), 1)
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ fontSize: 9, color: '#888' }}>{data.orders}</div>
                      <div style={{ width: '100%', height: `${Math.max(4, (data.revenue / maxRev) * 80)}px`, background: '#3b82f6', borderRadius: 2, opacity: 0.7 }} />
                      <div style={{ fontSize: 8, color: '#888' }}>{hour}h</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <button onClick={() => printReport(daily)} className="btn btn-sm btn-primary" style={{ marginTop: 16 }}>
            🖨️ Tiskaj poročilo
          </button>
        </div>
      )}

      {/* Weekly Report */}
      {tab === 'weekly' && weekly && !loading && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
            <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 11, color: '#888' }}>Tedenski promet</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>€{weekly.summary.total_revenue.toFixed(2)}</div>
            </div>
            <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 11, color: '#888' }}>Rast</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: weekly.summary.growth_pct >= 0 ? '#22c55e' : '#ef4444' }}>
                {weekly.summary.growth_pct >= 0 ? '+' : ''}{weekly.summary.growth_pct}%
              </div>
            </div>
          </div>

          {weekly.best_day && (
            <div style={{ background: '#f0fdf4', borderRadius: 10, padding: 12, marginBottom: 12 }}>
              🏆 Najboljši dan: <strong>{weekly.best_day[0]}</strong> — €{weekly.best_day[1].revenue.toFixed(2)}
            </div>
          )}

          {Object.keys(weekly.daily_breakdown).length > 0 && (
            <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 16 }}>
              <h3 style={{ marginTop: 0 }}>📈 Dnevni promet</h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }}>
                {Object.entries(weekly.daily_breakdown).map(([day, data], i) => {
                  const maxRev = Math.max(...Object.values(weekly.daily_breakdown).map(d => d.revenue), 1)
                  const dayName = new Date(day).toLocaleDateString('sl-SI', { weekday: 'short' })
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ fontSize: 9, color: '#888' }}>€{data.revenue.toFixed(0)}</div>
                      <div style={{ width: '100%', height: `${Math.max(4, (data.revenue / maxRev) * 90)}px`, background: '#22c55e', borderRadius: 3, opacity: 0.7 }} />
                      <div style={{ fontSize: 9, color: '#888' }}>{dayName}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <button onClick={() => printReport(weekly)} className="btn btn-sm btn-primary" style={{ marginTop: 16 }}>
            🖨️ Tiskaj poročilo
          </button>
        </div>
      )}

      {/* Monthly Report */}
      {tab === 'monthly' && monthly && !loading && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
            <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 11, color: '#888' }}>Mesečni promet</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>€{monthly.summary.total_revenue.toFixed(2)}</div>
            </div>
            <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 11, color: '#888' }}>Povprečno dnevno</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>€{monthly.avg_daily_revenue.toFixed(2)}</div>
            </div>
          </div>

          {monthly.best_day && (
            <div style={{ background: '#f0fdf4', borderRadius: 10, padding: 12, marginBottom: 12 }}>
              🏆 Najboljši dan: {monthly.best_day.day}. — €{monthly.best_day.revenue.toFixed(2)}
            </div>
          )}

          {Object.keys(monthly.daily_breakdown).length > 0 && (
            <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 16 }}>
              <h3 style={{ marginTop: 0 }}>📊 Dnevni promet</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', gap: 4 }}>
                {Object.entries(monthly.daily_breakdown).map(([day, revenue], i) => (
                  <div key={i} style={{
                    textAlign: 'center', borderRadius: 6, padding: 6,
                    background: revenue > monthly.avg_daily_revenue ? '#f0fdf4' : '#fef2f2',
                    border: revenue > monthly.avg_daily_revenue ? '1px solid #22c55e' : '1px solid #ef4444'
                  }}>
                    <div style={{ fontSize: 10, color: '#888' }}>{day}</div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>€{revenue.toFixed(0)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={() => printReport(monthly)} className="btn btn-sm btn-primary" style={{ marginTop: 16 }}>
            🖨️ Tiskaj poročilo
          </button>
        </div>
      )}
    </div>
  )
}
