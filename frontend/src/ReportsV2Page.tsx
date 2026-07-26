import { useState, useEffect } from 'react'
import * as api from './api'

export default function ReportsV2Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'templates' | 'scheduled' | 'recent'>('templates')
  const [templates, setTemplates] = useState<any[]>([])
  const [scheduled, setScheduled] = useState<any[]>([])
  const [recent, setRecent] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/reports-v3/templates', { headers: api.h() }).then(r => r.json()).then(d => setTemplates(d.templates || [])),
      fetch('/api/v1/reports-v3/scheduled', { headers: api.h() }).then(r => r.json()).then(d => setScheduled(d.scheduled || [])),
      fetch('/api/v1/reports-v3/recent', { headers: api.h() }).then(r => r.json()).then(d => setRecent(d.reports || [])),
    ]).catch(() => onNotify('Napaka pri nalaganju')).finally(() => setLoading(false))
  }, [])

  const freqColor = (f: string) => ({ daily: '#3b82f6', weekly: '#f59e0b', monthly: '#8b5cf6' }[f] || '#6b7280')
  const freqLabel = (f: string) => ({ daily: 'Dnevno', weekly: 'Tedensko', monthly: 'Mesečno' }[f] || f)

  const tabs = [
    { key: 'templates', label: '📋 Predloge', count: templates.length },
    { key: 'scheduled', label: '⏰ Načrtovana', count: scheduled.length },
    { key: 'recent', label: '📄 Nedavna', count: recent.length },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">📊 Poročila V2</h2>
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
          {tab === 'templates' && (
            <div>
              {templates.map((t, i) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{t.description}</div>
                    </div>
                    <span style={{ background: freqColor(t.frequency), color: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>{freqLabel(t.frequency)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#888' }}>Zadnji: {t.last_run}</span>
                    <button className="btn btn-sm btn-primary" onClick={() => onNotify(`Generiram ${t.name}...`)}>Generiraj</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'scheduled' && (
            <div>
              {scheduled.map((s, i) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{s.template}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{s.recipients?.join(', ')}</div>
                    </div>
                    <span style={{
                      padding: '2px 8px', borderRadius: 12, fontSize: 11,
                      background: s.active ? '#dcfce7' : '#fee2e2',
                      color: s.active ? '#16a34a' : '#dc2626',
                    }}>{s.active ? 'Aktivno' : 'Pavza'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#666' }}>
                    <span style={{ background: freqColor(s.frequency), color: '#fff', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{freqLabel(s.frequency)}</span>
                    <span>Naslednji: {s.next_run}</span>
                    <span>Format: {s.format}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'recent' && (
            <div>
              {recent.map((r, i) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{r.generated} · {r.generated_by}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 12, color: '#666' }}>{r.format} · {r.size}</span>
                    <button className="btn btn-sm btn-ghost">⬇️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}