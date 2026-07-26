import { useState, useEffect } from 'react'
import * as api from './api'

export default function AuditV2Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'logs' | 'compliance' | 'search'>('logs')
  const [logs, setLogs] = useState<any>(null)
  const [compliance, setCompliance] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/audit-v2/logs', { headers: api.h() }).then(r => r.json()).then(setLogs),
      fetch('/api/v1/audit-v2/compliance', { headers: api.h() }).then(r => r.json()).then(setCompliance),
    ]).catch(() => onNotify('Napaka pri nalaganju')).finally(() => setLoading(false))
  }, [])

  const doSearch = () => {
    if (!searchQuery) return
    fetch(`/api/v1/audit-v2/search?query=${encodeURIComponent(searchQuery)}`, { headers: api.h() })
      .then(r => r.json()).then(setSearchResults).catch(() => onNotify('Napaka pri iskanju'))
  }

  const tabs = [
    { key: 'logs', label: '📋 Dnevnik', count: logs?.total || 0 },
    { key: 'compliance', label: '✅ Skladnost' },
    { key: 'search', label: '🔍 Iskanje' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">📋 Revizija V2</h2>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>
            {t.label}{'count' in t && t.count !== undefined && <span style={{ marginLeft: 4, background: 'var(--primary)', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 11 }}>{t.count}</span>}
          </button>
        ))}
      </div>

      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'logs' && logs && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Visoko tveganje', value: logs.high_risk, color: '#ef4444' },
                  { label: 'Srednje', value: logs.medium_risk, color: '#f59e0b' },
                  { label: 'Nizko', value: logs.low_risk, color: '#22c55e' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {logs.logs?.map((l: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8, borderLeft: `4px solid ${l.risk === 'high' ? '#ef4444' : l.risk === 'medium' ? '#f59e0b' : '#22c55e'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{l.action}</span>
                    <span style={{ background: l.risk === 'high' ? '#fee2e2' : l.risk === 'medium' ? '#fef3c7' : '#dcfce7', color: l.risk === 'high' ? '#dc2626' : l.risk === 'medium' ? '#d97706' : '#16a34a', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{l.risk}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>{l.details}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{l.user} · {l.timestamp} · {l.ip}</div>
                </div>
              ))}
            </div>
          )}

          {tab === 'compliance' && compliance && (
            <div>
              <div className="card" style={{ padding: 14, marginBottom: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#888' }}>Ocena skladnosti</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: compliance.score >= 90 ? '#22c55e' : '#f59e0b' }}>{compliance.score}/100</div>
              </div>
              {compliance.checks?.map((c: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>{c.name}</span>
                  <span style={{ background: c.status === 'pass' ? '#dcfce7' : c.status === 'warning' ? '#fef3c7' : '#fee2e2', color: c.status === 'pass' ? '#16a34a' : c.status === 'warning' ? '#d97706' : '#dc2626', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{c.status === 'pass' ? '✓ V redu' : c.status === 'warning' ? '⚠ Opozorilo' : '✗ Neuspeh'}</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'search' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} placeholder="Iskanje po dnevniku..." style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }} />
                <button onClick={doSearch} className="btn btn-primary btn-sm">🔍</button>
              </div>
              {searchResults?.results?.map((r: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8, borderLeft: `4px solid ${r.risk === 'high' ? '#ef4444' : '#f59e0b'}` }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{r.action}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>{r.details}</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{r.user} · {r.timestamp}</div>
                </div>
              ))}
              {searchResults && searchResults.results?.length === 0 && <div className="card" style={{ padding: 16, textAlign: 'center', color: '#888' }}>Ni rezultatov</div>}
            </div>
          )}
        </>
      )}
    </div>
  )
}