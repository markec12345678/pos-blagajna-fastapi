import { useState, useEffect, useCallback } from 'react'
import * as api from './api'
import { useWebSocket } from './useWebSocket'
import { useTranslation } from './i18n'
import { BarChart, LineChart, DonutChart } from './Charts'
import FeedbackPanel from './FeedbackPanel'

export default function Dashboard({ onNotify }: { onNotify: (msg: string) => void }) {
  const { t } = useTranslation()
  const [dash, setDash] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [lowStock, setLowStock] = useState<any[]>([])
  const [budgetAlerts, setBudgetAlerts] = useState<any[]>([])
  const [comparison, setComparison] = useState<any>(null)
  const [dailySales, setDailySales] = useState<any[]>([])
  const [hourlySales, setHourlySales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [birthdays, setBirthdays] = useState<any[]>([])

  const refresh = useCallback(() => {
    const branchId = parseInt(localStorage.getItem('selected_branch') || '0')
    const params = branchId ? `?branch_id=${branchId}` : ''
    const h = api.authHeader()
    Promise.all([
      api.getDashboard().then(setDash),
      api.getRecentOrders(10).then(setOrders),
      api.getLowStock().then(setLowStock),
      fetch('/api/v1/budgets/alerts', { headers: h }).then(r => r.ok ? r.json() : null).then(d => d && setBudgetAlerts(d.alerts || [])).catch(() => {}),
      fetch('/api/v1/analytics/sales-compare', { headers: h }).then(r => r.ok ? r.json() : null).then(d => d && setComparison(d)).catch(() => {}),
      fetch(`/api/v1/analytics/sales/daily?days=7${params}`, { headers: h }).then(r => r.ok ? r.json() : null).then(d => d && setDailySales(d)).catch(() => {}),
      fetch(`/api/v1/analytics/sales/hourly?days=1${params}`, { headers: h }).then(r => r.ok ? r.json() : null).then(d => d && setHourlySales(d)).catch(() => {}),
      api.getBirthdayMembers().then(setBirthdays).catch(() => {})
    ]).finally(() => setLoading(false))
  }, [])

  useEffect(() => { refresh(); const iv = setInterval(refresh, 30000); return () => clearInterval(iv) }, [refresh])
  useWebSocket((evt) => {
    if (['order_created', 'order_closed'].includes(evt.event)) refresh()
    if (evt.event === 'low_stock_alert' && evt.data?.items) {
      setLowStock(prev => {
        const existing = new Map(prev.map((i: any) => [i.id, i]))
        for (const item of evt.data.items) existing.set(item.id, item)
        return Array.from(existing.values())
      })
    }
  })

  // Stat configuration
  const stats = [
    { label: t('today_sales'), value: `${dash?.today_sales?.toFixed(2) || '0.00'} €`, emoji: '💰', color: 'green' },
    { label: t('tips'), value: `${dash?.today_tips?.toFixed(2) || '0.00'} €`, emoji: '💵', color: 'amber' },
    { label: t('open_orders'), value: `${dash?.open_orders || 0}`, emoji: '📋', color: 'blue' },
    { label: t('free_tables'), value: `${dash?.free_tables || 0}/${dash?.total_tables || 0}`, emoji: '🪑', color: 'teal' },
    { label: t('completed_today'), value: `${dash?.today_orders || orders.length}`, emoji: '✅', color: 'purple' },
    { label: t('reservations_today'), value: `${dash?.today_reservations || 0}`, emoji: '📅', color: 'orange' },
    { label: 'e-Računi', value: `${dash?.sent_eracuni || 0}/${dash?.total_invoices || 0}`, emoji: '📨', color: 'blue' },
    { label: 'Compliance', value: `${dash?.eracun_compliance_rate || 0}%`, emoji: '✅', color: 'green' },
  ]

  return (
    <div className="dash-page" style={{ padding: '20px', background: 'var(--surface2)' }}>
      <div className="dash-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', padding: '0 4px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0' }}>📊 {t('dash.title')}</h2>
        <button onClick={() => { setLoading(true); refresh() }} className="btn btn-sm btn-ghost">{loading ? '⏳' : '🔄'}</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text2)', fontSize: '18px' }}>⏳ Nalaganje...</div>
      ) : (
        <div>
          {/* Modern Stat Cards Grid */}
          <div className="dashboard-grid">
            {stats.map((stat, idx) => (
              <div key={idx} className="stat-card">
                <div className={`stat-icon ${stat.color}`}>{stat.emoji}</div>
                <div className="stat-content">
                  <p className="stat-value">{stat.value}</p>
                  <p className="stat-label">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {comparison && (
            <div className="card mb-16" style={{ padding: 16 }}>
              <h4 style={{ marginBottom: 10, fontSize: 14 }}>📈 {t('sales_comparison')}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  { label: t('today'), value: comparison.today, highlight: true },
                  { label: t('yesterday'), value: comparison.yesterday, pct: comparison.vs_yesterday_pct },
                  { label: t('last_week'), value: comparison.last_week, pct: comparison.vs_last_week_pct },
                ].map(c => (
                  <div key={c.label} style={{
                    textAlign: 'center', padding: 12, borderRadius: 8,
                    background: c.highlight ? 'rgba(5,150,105,0.08)' : 'var(--surface2)'
                  }}>
                    <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>{c.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: c.highlight ? '#059669' : 'var(--text)' }}>
                      {(c.value ?? 0).toFixed(2)} €
                    </div>
                    {c.pct !== null && c.pct !== undefined && (
                      <div style={{
                        fontSize: 12, fontWeight: 600, marginTop: 4,
                        color: c.pct >= 0 ? '#059669' : '#ef4444'
                      }}>
                        {c.pct >= 0 ? '▲' : '▼'} {Math.abs(c.pct).toFixed(1)}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Charts Section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {dailySales.length > 0 && (
              <div className="card" style={{ padding: 16 }}>
                <LineChart
                  label={`📈 ${t('sales_last_7_days')}`}
                  data={dailySales.map(d => ({
                    label: new Date(d.date).toLocaleDateString('sl-SI', { weekday: 'short' }),
                    value: d.sales
                  }))}
                  height={130}
                  color="#059669"
                />
              </div>
            )}
            {hourlySales.length > 0 && (
              <div className="card" style={{ padding: 16 }}>
                <BarChart
                  label={`🕐 ${t('sales_by_hour_today')}`}
                  data={hourlySales.map(d => ({
                    label: `${d.hour}:00`,
                    value: d.total
                  }))}
                  height={130}
                  color="#3b82f6"
                />
              </div>
            )}
          </div>

          {orders.length > 0 && (() => {
            const typeCounts: Record<string, number> = {}
            orders.forEach(o => { const t = o.order_type || 'unknown'; typeCounts[t] = (typeCounts[t] || 0) + 1 })
            const pieData = [
              { label: t('dine_in'), value: typeCounts['dine-in'] || 0, color: '#059669' },
              { label: t('takeaway'), value: typeCounts['takeaway'] || 0, color: '#3b82f6' },
              { label: t('delivery'), value: typeCounts['delivery'] || 0, color: '#f59e0b' },
            ]
            if (pieData.some(d => d.value > 0)) {
              return (
                <div className="card mb-16" style={{ padding: 16 }}>
                  <DonutChart label={`🍽️ ${t('order_types_today')}`} data={pieData} size={120} />
                </div>
              )
            }
            return null
          })()}

          {dash?.top_items?.length > 0 && (
            <div className="card mb-16">
              <h4 className="mb-12">{t('top_items_today')}</h4>
              <table className="zreport-table" style={{ width: '100%' }}>
                <thead><tr><th>{t('item')}</th><th>{t('qty')}</th><th>{t('total')}</th></tr></thead>
                <tbody>
                  {dash.top_items.map((i: any, idx: number) => (
                    <tr key={idx}>
                      <td>{i.name}</td>
                      <td>{i.quantity}x</td>
                      <td>{i.total.toFixed(2)} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {lowStock.length > 0 && (
            <div className="card low-stock-card">
              <h3>⚠️ {t('low_stock')}</h3>
              {lowStock.map((i: any) => (
                <div key={i.id} className="low-stock-row">
                  <span>{i.name}</span>
                  <span className="low-stock-qty">{i.stock} / {i.min_stock}</span>
                </div>
              ))}
            </div>
          )}

          {budgetAlerts.length > 0 && budgetAlerts.filter(a => a.level !== 'info').slice(0, 5).length > 0 && (
            <div className="card" style={{ marginBottom: 16, padding: 16 }}>
              <h4 style={{ marginBottom: 10, fontSize: 14 }}>📊 {t('budget_alerts')}</h4>
              {budgetAlerts.filter(a => a.level !== 'info').slice(0, 5).map((a, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 10px', marginBottom: 6, borderRadius: 6,
                  background: a.level === 'critical' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                  borderLeft: a.level === 'critical' ? '3px solid #ef4444' : '3px solid #f59e0b'
                }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{a.label}</span>
                    <span style={{ fontSize: 11, color: 'var(--text2)', marginLeft: 6 }}>{a.month_name} {a.year}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: a.level === 'critical' ? '#ef4444' : '#f59e0b' }}>
                      {a.actual.toFixed(2)} / {a.budgeted.toFixed(2)} € ({a.pct}%)
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text2)' }}>razlika: {a.diff >= 0 ? '+' : ''}{a.diff.toFixed(2)} €</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {birthdays.length > 0 && (
            <div className="card" style={{ marginBottom: 16, padding: 16 }}>
              <h4 style={{ marginBottom: 10, fontSize: 14 }}>🎂 Rojstni dnevi</h4>
              {birthdays.map(b => (
                <div key={b.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 10px', marginBottom: 6, borderRadius: 6,
                  background: b.status === 'today' ? 'rgba(236,72,153,0.1)' : 'rgba(139,92,246,0.06)',
                  borderLeft: b.status === 'today' ? '3px solid #ec4899' : '3px solid #8b5cf6'
                }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{b.name}</span>
                    {b.phone && <span style={{ fontSize: 11, color: 'var(--text2)', marginLeft: 6 }}>{b.phone}</span>}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: b.status === 'today' ? '#ec4899' : '#8b5cf6' }}>
                    {b.status === 'today' ? '🎂 Danes!' : '📅 ' + b.birthday.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <FeedbackPanel onNotify={onNotify} />
            <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 16 }}>
              <h3 style={{ margin: 0, fontSize: 14 }}>📈 Hitri pregled</h3>
              <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                  <span style={{ fontSize: 13 }}>Današnji promet</span>
                  <strong>{dash?.today_sales?.toFixed(2) || '0.00'} €</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                  <span style={{ fontSize: 13 }}>Naročila</span>
                  <strong>{dash?.today_orders || 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                  <span style={{ fontSize: 13 }}>Povprečje/naročilo</span>
                  <strong>{dash?.today_orders ? (dash.today_sales / dash.today_orders).toFixed(2) : '0.00'} €</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                  <span style={{ fontSize: 13 }}>Napitnina</span>
                  <strong>{dash?.today_tips?.toFixed(2) || '0.00'} €</strong>
                </div>
              </div>
            </div>
          </div>

          <h3 className="dash-section-title">{t('recent_orders')}</h3>
          {!orders.length ? <p className="dash-empty">{t('no_completed_orders')}</p> : (
            <div className="dash-orders">
              {orders.map(o => (
                <div key={o.id} className="card dash-order-card">
                  <div className="dash-order-header">
                    <div>
                      <strong>{t('order')} #{o.id}</strong>
                      <span className="dash-order-meta">{o.table_name || `${t('table')} ${o.table_id}`} • {o.order_type === 'dine-in' ? t('dine_in') : o.order_type === 'takeaway' ? t('takeaway') : t('delivery')}</span>
                    </div>
                    <div className="dash-order-total">{o.total.toFixed(2)} €</div>
                  </div>
                  {o.customer_name && <div className="dash-order-meta">👤 {o.customer_name}</div>}
                  <div className="dash-order-time">{o.closed_at ? new Date(o.closed_at).toLocaleString('sl-SI') : new Date(o.created_at).toLocaleString('sl-SI')}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
