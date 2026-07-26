import { useState, useEffect } from 'react'
import * as api from './api'

export default function SystemHealthPage() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    fetch('/api/v1/system/health', { headers: api.authHeader() })
      .then(r => r.json()).then(setData)
  }, [])

  if (!data) return <div className="page-container"><p>Nalaganje...</p></div>

  const fmt = (n: number) => n.toLocaleString('sl-SI')

  return (
    <div className="page-container" style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
      <h2 className="page-title">🩺 Sistemsko zdravje</h2>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {/* Server */}
        <div className="card" style={{ flex: '1 0 280px', padding: 16 }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 14 }}>🖥️ Strežnik</h3>
          <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Row label="Delovanje" value={data.server.uptime} />
            <Row label="Zagnan" value={new Date(data.server.started_at).toLocaleString('sl-SI')} />
            <Row label="CPU" value={`${data.server.cpu_percent}%`} color={data.server.cpu_percent > 80 ? '#ef4444' : undefined} />
            <Row label="Pomnilnik" value={`${data.server.memory_percent}%`} color={data.server.memory_percent > 80 ? '#ef4444' : undefined} />
            <Row label="Platforma" value={data.server.platform} />
            <Row label="Python" value={data.server.python_version} />
          </div>
        </div>

        {/* Database */}
        <div className="card" style={{ flex: '1 0 280px', padding: 16 }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 14 }}>🗄️ Podatkovna baza</h3>
          <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Row label="Tip" value={data.database.type} />
            <Row label="Velikost" value={`${data.database.size_mb} MB`} color={data.database.size_mb > 100 ? '#f59e0b' : undefined} />
            <Row label="Pot" value={data.database.path} />
          </div>
        </div>

        {/* Records */}
        <div className="card" style={{ flex: '1 0 280px', padding: 16 }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 14 }}>📊 Zapiski</h3>
          <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Row label="Naročila" value={fmt(data.records.orders)} />
            <Row label="Odprta naročila" value={fmt(data.records.open_orders)} color={data.records.open_orders > 0 ? '#f59e0b' : undefined} />
            <Row label="Stranke" value={fmt(data.records.customers)} />
            <Row label="Artikli" value={fmt(data.records.menu_items)} />
            <Row label="Sestavine" value={fmt(data.records.ingredients)} />
            <Row label="Plačila" value={fmt(data.records.payments)} />
            <Row label="Uporabniki" value={fmt(data.records.users)} />
          </div>
        </div>

        {/* Backups */}
        <div className="card" style={{ flex: '1 0 280px', padding: 16 }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 14 }}>💾 Varnostne kopije</h3>
          <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Row label="Število" value={fmt(data.backups.count)} />
            <Row label="Skupna velikost" value={`${data.backups.total_size_mb} MB`} />
            <Row label="Mapa" value={data.backups.directory} />
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--text2)' }}>{label}</span>
      <span style={{ fontWeight: 600, color: color || 'inherit' }}>{value}</span>
    </div>
  )
}
