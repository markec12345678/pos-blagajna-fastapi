import { useState, useEffect } from 'react'
import * as api from './api'

export default function ManagerDashboard({ onNotify }: { onNotify?: (msg: string, err?: boolean) => void }) {
  const [data, setData] = useState<any>({})
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const branchId = parseInt(localStorage.getItem('selected_branch') || '0')
      const h = api.authHeader()
      const params = branchId ? `?branch_id=${branchId}` : ''
      const [salesR, ordersR, stockR, reservationsR, poR, shiftsR, healthR] = await Promise.all([
        fetch('/api/v1/analytics/sales-targets', { headers: h }),
        fetch(`/api/v1/orders?status=open${params}`, { headers: h }),
        fetch(`/api/v1/inventory/ingredients${params}`, { headers: h }),
        fetch(`/api/v1/reservations?date=${new Date().toISOString().slice(0, 10)}`, { headers: h }),
        fetch('/api/v1/suppliers/orders?status=pending', { headers: h }),
        fetch('/api/v1/shifts?active=1', { headers: h }),
        fetch('/api/v1/system/health', { headers: h })
      ])

      setData({
        sales: salesR.ok ? await salesR.json() : null,
        orders: ordersR.ok ? (await ordersR.json()).filter((o: any) => o.status === 'open') : [],
        inventory: stockR.ok ? await stockR.json() : [],
        reservations: reservationsR.ok ? await reservationsR.json() : [],
        pendingPOs: poR.ok ? await poR.json() : [],
        activeShifts: shiftsR.ok ? await shiftsR.json() : [],
        health: healthR.ok ? await healthR.json() : null
      })
    } catch { onNotify?.('Napaka pri nalaganju podatkov', true) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const lowStock = (data.inventory || []).filter((i: any) => i.stock <= i.min_stock && i.min_stock > 0)
  const overdueOrders = (data.orders || []).filter((o: any) => {
    const elapsed = (Date.now() - new Date(o.created_at).getTime()) / 60000
    return elapsed > 20
  })

  if (loading) return <div className="loading" />

  return (
    <div>
      <div className="page-header">
        <h2>📊 Nadzorna plošča</h2>
        <button className="btn" onClick={load}>🔄 Osveži</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 20 }}>
        <SummaryCard icon="💰" label="Danes" value={`€${data.sales?.daily_actual?.toFixed(2) || '0'}`}
          sub={data.sales ? `${data.sales.daily_pct}% od cilja €${data.sales.daily_target}` : ''}
          color={data.sales?.daily_pct >= 100 ? '#059669' : data.sales?.daily_pct >= 80 ? '#f59e0b' : '#ef4444'} />
        <SummaryCard icon="📋" label="Odprta naročila" value={String(data.orders?.length || 0)}
          sub={overdueOrders.length > 0 ? `${overdueOrders.length} čakajo >20min` : ''}
          color={overdueOrders.length > 0 ? '#ef4444' : '#3b82f6'} />
        <SummaryCard icon="⚠️" label="Nizke zaloge" value={String(lowStock.length)}
          sub={`od ${data.inventory?.length || 0} artiklov`}
          color={lowStock.length > 0 ? '#f59e0b' : '#059669'} />
        <SummaryCard icon="🕐" label="Današnje rezervacije" value={String(data.reservations?.length || 0)}
          sub={data.reservations?.filter((r: any) => r.status === 'confirmed').length + ' potrjenih' || ''}
          color="#8b5cf6" />
        <SummaryCard icon="📦" label="Čakajoča naročila" value={String(data.pendingPOs?.length || 0)}
          sub="Nabavna naročila" color="#f59e0b" />
        <SummaryCard icon="👤" label="Prijavljeni" value={String(data.activeShifts?.length || 0)}
          sub="zaposlenih trenutno" color="#059669" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card" style={{ padding: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{'⏳ Naročila čakajo >20 min'}</h3>
          {overdueOrders.length === 0 ? (
            <div style={{ fontSize: 13, color: '#059669' }}>✅ Vsa naročila v okviru časa</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {overdueOrders.slice(0, 10).map((o: any) => {
                const min = Math.round((Date.now() - new Date(o.created_at).getTime()) / 60000)
                return (
                  <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: '#fef2f2', borderRadius: 8, fontSize: 12 }}>
                    <span>Miza {o.table_name || o.table_id} • #{o.id}</span>
                    <span style={{ color: '#dc2626', fontWeight: 600 }}>{min} min</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>⚠️ Nizke zaloge</h3>
          {lowStock.length === 0 ? (
            <div style={{ fontSize: 13, color: '#059669' }}>✅ Vse zaloge OK</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {lowStock.slice(0, 10).map((i: any) => (
                <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: '#fffbeb', borderRadius: 6, fontSize: 12 }}>
                  <span>{i.name}</span>
                  <span>{i.stock}/{i.min_stock} {i.unit}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>📅 Današnje rezervacije</h3>
          {data.reservations?.length === 0 ? (
            <div style={{ fontSize: 13, color: '#64748b' }}>Ni rezervacij</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {data.reservations?.slice(0, 8).map((r: any) => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: '#f8fafc', borderRadius: 6, fontSize: 12 }}>
                  <span>{r.customer_name} ({r.guests}🪑)</span>
                  <span style={{
                    color: r.status === 'confirmed' ? '#059669' : r.status === 'seated' ? '#3b82f6' : '#94a3b8'
                  }}>{r.reservation_time?.slice(11, 16)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>📊 Sistem</h3>
          {data.health && (
            <div style={{ fontSize: 12, color: '#475569', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div>🟢 CPU: {data.health.cpu_percent}% • RAM: {data.health.ram_percent}%</div>
              <div>💾 Baza: {data.health.db_size_mb} MB • {data.health.record_counts?.orders || 0} naročil</div>
              <div>⏱️ Delovanje: {Math.round(data.health.uptime_hours || 0)}h</div>
              <div>📦 Backupov: {data.health.backup_count || 0}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ icon, label, value, sub, color }: { icon: string; label: string; value: string; sub: string; color: string }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 12, color: '#64748b' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color, marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}
