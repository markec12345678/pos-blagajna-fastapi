import { useState, useEffect } from 'react'
import * as api from './api'

export default function SystemV2Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'overview' | 'api' | 'database' | 'logs'>('overview')
  const [overview, setOverview] = useState<any>(null)
  const [apiStats, setApiStats] = useState<any>(null)
  const [database, setDatabase] = useState<any>(null)
  const [logs, setLogs] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/system-v2/overview', { headers: api.h() }).then(r => r.json()).then(setOverview),
      fetch('/api/v1/system-v2/api-stats', { headers: api.h() }).then(r => r.json()).then(setApiStats),
      fetch('/api/v1/system-v2/database', { headers: api.h() }).then(r => r.json()).then(setDatabase),
      fetch('/api/v1/system-v2/logs', { headers: api.h() }).then(r => r.json()).then(setLogs),
    ]).catch(() => onNotify('Napaka')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'overview', label: '🏥 Sistem' },
    { key: 'api', label: '🌐 API' },
    { key: 'database', label: '🗄️ Baza' },
    { key: 'logs', label: '📋 Dnevniki' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm"><h2 className="page-title">🏥 Sistem V2</h2></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>{t.label}</button>
        ))}
      </div>
      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'overview' && overview && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'CPU', value: `${overview.cpu?.usage_pct}%`, color: overview.cpu?.usage_pct > 80 ? '#ef4444' : '#22c55e', sub: `${overview.cpu?.cores} jeder` },
                  { label: 'RAM', value: `${overview.memory?.usage_pct}%`, color: overview.memory?.usage_pct > 80 ? '#ef4444' : '#22c55e', sub: `${overview.memory?.used_gb}/${overview.memory?.total_gb} GB` },
                  { label: 'Disk', value: `${overview.disk?.usage_pct}%`, color: overview.disk?.usage_pct > 80 ? '#ef4444' : '#22c55e', sub: `${overview.disk?.used_gb}/${overview.disk?.total_gb} GB` },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{s.sub}</div>
                  </div>
                ))}
              </div>
              <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                <span style={{ fontSize: 11, color: '#888' }}>Status: </span>
                <span style={{ fontWeight: 700, color: '#22c55e' }}>{overview.status}</span>
                <span style={{ marginLeft: 12, fontSize: 11, color: '#888' }}>Uptime: {overview.uptime_hours}h</span>
              </div>
            </div>
          )}
          {tab === 'api' && apiStats && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Zahtevkov', value: apiStats.total_requests, color: '#3b82f6' },
                  { label: 'Povp. odziv', value: `${apiStats.avg_response_ms}ms`, color: '#22c55e' },
                  { label: 'Napake', value: `${apiStats.error_rate_pct}%`, color: '#ef4444' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <h4 style={{ margin: '0 0 8px' }}>🐌 Počasni endpointi</h4>
              {apiStats.slowest_endpoints?.map((e: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontFamily: 'monospace' }}>{e.endpoint}</span>
                  <span style={{ fontWeight: 600, color: '#f59e0b' }}>{e.avg_ms}ms</span>
                </div>
              ))}
            </div>
          )}
          {tab === 'database' && database && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Velikost', value: `${database.size_mb} MB`, color: '#3b82f6' },
                  { label: 'Tabele', value: database.tables, color: '#8b5cf6' },
                  { label: 'Vrstice', value: database.total_rows.toLocaleString(), color: '#22c55e' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div className="card" style={{ padding: 14 }}>
                <div style={{ fontSize: 12 }}>Motor: <b>{database.engine}</b> · WAL: <b>{database.wal_mode ? 'Da' : 'Ne'}</b> · Integriteta: <b style={{ color: '#22c55e' }}>{database.integrity_check}</b></div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Cache: {database.cache_hit_rate}% · Počasne: {database.slow_queries}</div>
              </div>
            </div>
          )}
          {tab === 'logs' && logs && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Napake', value: logs.errors, color: '#ef4444' },
                  { label: 'Opozorila', value: logs.warnings, color: '#f59e0b' },
                  { label: 'Vse', value: logs.total, color: '#3b82f6' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {logs.logs?.map((l: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 4, borderLeft: `4px solid ${l.level === 'ERROR' ? '#ef4444' : l.level === 'WARNING' ? '#f59e0b' : '#22c55e'}`, fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600 }}>[{l.level}]</span>
                    <span style={{ color: '#888' }}>{l.timestamp}</span>
                  </div>
                  <div>{l.message} <span style={{ color: '#888' }}>({l.module})</span></div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}