import { useState, useEffect, useCallback } from 'react'
import * as api from './api'
import { useWebSocket } from './useWebSocket'

export default function Dashboard({ onNotify }: { onNotify: (msg: string) => void }) {
  const [dash, setDash] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [lowStock, setLowStock] = useState<any[]>([])
  const [budgetAlerts, setBudgetAlerts] = useState<any[]>([])
  const [comparison, setComparison] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    Promise.all([
      api.getDashboard().then(setDash),
      api.getRecentOrders(10).then(setOrders),
      api.getLowStock().then(setLowStock),
      fetch('/api/v1/budgets/alerts', { headers: api.authHeader() }).then(r => r.json()).then(d => setBudgetAlerts(d.alerts || [])).catch(() => {}),
      fetch('/api/v1/analytics/sales-compare', { headers: api.authHeader() }).then(r => r.json()).then(setComparison).catch(() => {})
    ]).finally(() => setLoading(false))
  }, [])

  useEffect(() => { refresh(); const iv = setInterval(refresh, 30000); return () => clearInterval(iv) }, [refresh])
  useWebSocket((evt) => { if (['order_created', 'order_closed'].includes(evt.event)) refresh() })

  return (
    <div className="dash-page">
      <div className="dash-header">
        <h2>📊 Pregled</h2>
        <button onClick={() => { setLoading(true); refresh() }} className="btn btn-sm btn-ghost">{loading ? '⏳' : '🔄'}</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>⏳ Nalaganje...</div>
      ) : (
        <div>
          <div className="stat-grid dash-stats">
            <div className="stat-card">
              <div className="stat-value green">{dash?.today_sales?.toFixed(2)} €</div>
              <div className="stat-label">Današnja prodaja</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: 'var(--gold, #f59e0b)' }}>{dash?.today_tips?.toFixed(2)} €</div>
              <div className="stat-label">Napitnine</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{dash?.open_orders}</div>
              <div className="stat-label">Odprta naročila</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{dash?.free_tables}/{dash?.total_tables}</div>
              <div className="stat-label">Proste mize</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{dash?.today_orders || orders.length}</div>
              <div className="stat-label">Zaključena danes</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: 'var(--blue)' }}>{dash?.today_reservations || 0}</div>
              <div className="stat-label">Rezervacije danes</div>
            </div>
          </div>

          {comparison && (
            <div className="card mb-16" style={{ padding: 16 }}>
              <h4 style={{ marginBottom: 10, fontSize: 14 }}>📈 Primerjava prodaje</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  { label: 'Danes', value: comparison.today, highlight: true },
                  { label: 'Včeraj', value: comparison.yesterday, pct: comparison.vs_yesterday_pct },
                  { label: 'Prejšnji teden', value: comparison.last_week, pct: comparison.vs_last_week_pct },
                ].map(c => (
                  <div key={c.label} style={{
                    textAlign: 'center', padding: 12, borderRadius: 8,
                    background: c.highlight ? 'rgba(5,150,105,0.08)' : 'var(--surface2)'
                  }}>
                    <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>{c.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: c.highlight ? '#059669' : 'var(--text)' }}>
                      {c.value.toFixed(2)} €
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

          {dash?.top_items?.length > 0 && (
            <div className="card mb-16">
              <h4 className="mb-12">Najboljši artikli danes</h4>
              <table className="zreport-table" style={{ width: '100%' }}>
                <thead><tr><th>Artikel</th><th>Količina</th><th>Skupaj</th></tr></thead>
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
              <h3>⚠️ Nizke zaloge</h3>
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
              <h4 style={{ marginBottom: 10, fontSize: 14 }}>📊 Opozorila budgeta</h4>
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

          <h3 className="dash-section-title">Zadnja naročila</h3>
          {!orders.length ? <p className="dash-empty">Ni zaključenih naročil</p> : (
            <div className="dash-orders">
              {orders.map(o => (
                <div key={o.id} className="card dash-order-card">
                  <div className="dash-order-header">
                    <div>
                      <strong>Naročilo #{o.id}</strong>
                      <span className="dash-order-meta">{o.table_name || `Miza ${o.table_id}`} • {o.order_type === 'dine-in' ? 'Jedilnica' : o.order_type === 'takeaway' ? 'Za s seboj' : 'Dostava'}</span>
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
