import { useState, useEffect, useRef } from 'react'

export default function NotificationsBell() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const load = async () => {
    const result: any[] = []
    try {
      const [invR, poR, srR, salesR] = await Promise.all([
        fetch('/api/v1/inventory/ingredients?branch_id=0'),
        fetch('/api/v1/suppliers/orders?status=pending'),
        fetch('/api/v1/service-requests?status=pending'),
        fetch('/api/v1/analytics/sales-targets'),
      ])

      if (invR.ok) {
        const inv = await invR.json()
        const low = inv.filter((i: any) => i.stock <= i.min_stock && i.min_stock > 0)
        low.forEach((i: any) => result.push({
          type: 'stock', label: `⚠️ Nizka zaloga: ${i.name}`,
          detail: `${i.stock}/${i.min_stock} ${i.unit}`
        }))
      }

      if (poR.ok) {
        const pos = await poR.json()
        if (pos.length) result.push({
          type: 'po', label: `📦 ${pos.length} čakajočih naročil`,
          detail: `Skupaj: €${pos.reduce((s: number, p: any) => s + (p.total || 0), 0).toFixed(2)}`
        })
      }

      if (srR.ok) {
        const srs = await srR.json()
        if (srs.length) result.push({
          type: 'service', label: `🔔 ${srs.length} zahtev strank`,
          detail: `Čakajo na prevzem`
        })
      }

      if (salesR.ok) {
        const s = await salesR.json()
        if (s.daily_target > 0 && s.daily_pct < 50) {
          result.push({
            type: 'target', label: `🎯 Prodaja: ${s.daily_pct}% cilja`,
            detail: `€${s.daily_actual?.toFixed(2)} / €${s.daily_target?.toFixed(2)}`
          })
        }
        if (s.daily_target > 0 && s.daily_pct >= 100) {
          result.push({
            type: 'target-hit', label: `🎯 Dnevni cilj dosežen!`,
            detail: `€${s.daily_actual?.toFixed(2)}`
          })
        }
      }
    } catch {}
    setAlerts(result)
  }

  useEffect(() => {
    load()
    const iv = setInterval(load, 30000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={() => setOpen(!open)} style={{
        background: 'none', border: 'none', cursor: 'pointer', position: 'relative',
        fontSize: 18, padding: '4px 8px'
      }}>
        🔔
        {alerts.length > 0 && (
          <span style={{
            position: 'absolute', top: 0, right: 0,
            background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700,
            borderRadius: '50%', width: 16, height: 16, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            transform: 'translate(25%, -25%)'
          }}>
            {alerts.length > 9 ? '9+' : alerts.length}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, minWidth: 280,
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
          boxShadow: '0 10px 40px rgba(0,0,0,0.15)', zIndex: 1001,
          marginTop: 8, overflow: 'hidden'
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
            Opozorila {alerts.length > 0 ? `(${alerts.length})` : ''}
          </div>
          {alerts.length === 0 ? (
            <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 13, color: '#94a3b8' }}>
              ✅ Vse v redu
            </div>
          ) : (
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {alerts.map((a, i) => (
                <div key={i} style={{
                  padding: '10px 16px', borderBottom: '1px solid #f1f5f9', fontSize: 13
                }}>
                  <div style={{ fontWeight: 500, color: '#0f172a' }}>{a.label}</div>
                  {a.detail && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{a.detail}</div>}
                </div>
              ))}
            </div>
          )}
          <button onClick={() => { load(); setOpen(false) }}
            style={{ width: '100%', padding: '8px', background: '#f8fafc', border: 'none', fontSize: 12, color: '#64748b', cursor: 'pointer' }}>
            🔄 Osveži
          </button>
        </div>
      )}
    </div>
  )
}
