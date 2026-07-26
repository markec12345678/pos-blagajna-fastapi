import { useState, useEffect } from 'react'
import * as api from './api'

export default function ReportsV5Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'templates' | 'scheduled' | 'distribution' | 'custom'>('templates')
  const [templates, setTemplates] = useState<any>(null)
  const [scheduled, setScheduled] = useState<any>(null)
  const [distribution, setDistribution] = useState<any>(null)
  const [custom, setCustom] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/reports-v5/templates', { headers: api.h() }).then(r => r.json()).then(setTemplates),
      fetch('/api/v1/reports-v5/scheduled', { headers: api.h() }).then(r => r.json()).then(setScheduled),
      fetch('/api/v1/reports-v5/distribution', { headers: api.h() }).then(r => r.json()).then(setDistribution),
      fetch('/api/v1/reports-v5/custom', { headers: api.h() }).then(r => r.json()).then(setCustom),
    ]).catch(() => onNotify('Napaka')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'templates', label: '📋 Predloge' },
    { key: 'scheduled', label: '⏰ Razpored' },
    { key: 'distribution', label: '📤 Distribucija' },
    { key: 'custom', label: '🛠️ Po meri' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm"><h2 className="page-title">📊 Poročila V5</h2></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>{t.label}</button>
        ))}
      </div>
      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'templates' && templates && (
            <div>
              {templates.templates?.map((t: any) => (
                <div key={t.id} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{t.name}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ background: '#e5e7eb', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{t.category}</span>
                      <span style={{ background: '#dbeafe', color: '#2563eb', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{t.format}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                    <span>⏰ {t.frequency}</span>
                    <span>📅 {t.last_run}</span>
                    <span>📧 {t.recipients?.length} prejemnikov</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'scheduled' && scheduled && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Aktivni</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6' }}>{scheduled.active}</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Danes zaključeno</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>{scheduled.completed_today}</div>
                </div>
              </div>
              <h4 style={{ margin: '0 0 8px' }}>⏰ Naslednji teki</h4>
              {scheduled.upcoming?.map((u: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>{u.name}</span>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    <span>📅 {u.next_run}</span>
                    <span style={{ marginLeft: 8, background: '#dbeafe', color: '#2563eb', padding: '1px 6px', borderRadius: 4, fontSize: 10 }}>{u.format}</span>
                  </div>
                </div>
              ))}
              <h4 style={{ margin: '16px 0 8px' }}>📋 Dnevnik dostave</h4>
              {scheduled.delivery_log?.map((l: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12 }}>{l.report}</span>
                  <div style={{ fontSize: 11, color: '#666' }}>
                    <span style={{ color: '#22c55e' }}>✅ {l.status}</span>
                    <span style={{ marginLeft: 8 }}>→ {l.recipient}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'distribution' && distribution && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Skupaj poročil', value: distribution.total_reports_sent, color: '#3b82f6' },
                  { label: 'Povp. čas', value: `${distribution.avg_delivery_time_sec}s`, color: '#f59e0b' },
                  { label: 'Uspešnost', value: `${distribution.success_rate}%`, color: '#22c55e' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {distribution.channels?.map((c: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{c.channel}</span>
                    <span>{c.count} poročil ({c.pct}%)</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: 4, height: 6 }}>
                    <div style={{ background: '#3b82f6', height: '100%', borderRadius: 4, width: `${c.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'custom' && custom && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Poročila po meri</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#8b5cf6' }}>{custom.total_custom}</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Najpogostejša tabela</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b' }}>{custom.most_used_table}</div>
                </div>
              </div>
              <h4 style={{ margin: '0 0 8px' }}>🛠️ Nedavna poročila</h4>
              {custom.recent?.map((r: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{r.name}</span>
                    <span style={{ fontSize: 12, color: '#666' }}>{r.author}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                    <span>📅 {r.created}</span>
                    <span>📊 {r.tables} tabel</span>
                    <span>📋 {r.rows} vrstic</span>
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