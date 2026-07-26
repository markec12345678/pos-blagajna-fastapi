import { useState, useEffect } from 'react'
import * as api from './api'

export default function AnalyticsV4Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'predictive' | 'anomalies' | 'dashboards' | 'export'>('predictive')
  const [predictive, setPredictive] = useState<any>(null)
  const [anomalies, setAnomalies] = useState<any>(null)
  const [dashboards, setDashboards] = useState<any>(null)
  const [exportData, setExportData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/analytics-v4/predictive', { headers: api.h() }).then(r => r.json()).then(setPredictive),
      fetch('/api/v1/analytics-v4/anomalies', { headers: api.h() }).then(r => r.json()).then(setAnomalies),
      fetch('/api/v1/analytics-v4/dashboards', { headers: api.h() }).then(r => r.json()).then(setDashboards),
      fetch('/api/v1/analytics-v4/export', { headers: api.h() }).then(r => r.json()).then(setExportData),
    ]).catch(() => onNotify('Napaka')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'predictive', label: '🔮 Napovedi' },
    { key: 'anomalies', label: '⚠️ Anomalije' },
    { key: 'dashboards', label: '📊 Nadzorne plošče' },
    { key: 'export', label: '📤 Izvoz podatkov' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm"><h2 className="page-title">📈 Analitika V4</h2></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>{t.label}</button>
        ))}
      </div>
      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'predictive' && predictive && (
            <div>
              {predictive.models?.map((m: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{m.name}</span>
                    <span style={{ color: m.accuracy > 85 ? '#22c55e' : '#f59e0b', fontWeight: 700 }}>{m.accuracy}% natančnost</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>Napoved: <b>{m.next_prediction || m.items_at_risk || m.peak_today}</b></div>
                </div>
              ))}
              <h4 style={{ margin: '16px 0 8px' }}>🔮 Napovedi</h4>
              {predictive.predictions?.map((p: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{p.metric}</span>
                    <span style={{ fontWeight: 700, color: '#3b82f6' }}>{p.value?.toLocaleString()}</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: 4, height: 6, position: 'relative', marginBottom: 4 }}>
                    <div style={{ background: '#3b82f6', height: '100%', borderRadius: 4, width: `${p.confidence}%` }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#666' }}>Razpon: {p.range_low?.toLocaleString()} — {p.range_high?.toLocaleString()} · Zaupanje: {p.confidence}%</div>
                </div>
              ))}
            </div>
          )}
          {tab === 'anomalies' && anomalies && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Danes zaznane', value: anomalies.detected_today, color: '#ef4444' },
                  { label: 'Odpravljene', value: anomalies.resolved, color: '#22c55e' },
                  { label: 'Pravila', value: anomalies.rules_active, color: '#3b82f6' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {anomalies.anomalies?.map((a: any) => (
                <div key={a.id} className="card" style={{ padding: 14, marginBottom: 8, borderLeft: `4px solid ${a.severity === 'medium' ? '#f59e0b' : '#ef4444'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{a.type}</span>
                    <span style={{ background: a.status === 'resolved' ? '#dcfce7' : '#fef3c7', color: a.status === 'resolved' ? '#16a34a' : '#d97706', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{a.status === 'resolved' ? 'Odpravljeno' : 'Preiskovanje'}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{a.description}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>⏰ {a.time} · Resnost: {a.severity}</div>
                </div>
              ))}
            </div>
          )}
          {tab === 'dashboards' && dashboards && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Skupaj plošč</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6' }}>{dashboards.total_dashboards}</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Deljenih</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#8b5cf6' }}>{dashboards.shared}</div>
                </div>
              </div>
              {dashboards.dashboards?.map((d: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>📊 {d.name}</span>
                    {d.shared && <span style={{ background: '#dcfce7', color: '#16a34a', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>🌍 Deljeno</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                    <span>📈 {d.widgets} widgetov</span>
                    <span>👤 {d.owner}</span>
                    <span>📅 {d.last_viewed}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'export' && exportData && (
            <div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                {exportData.formats?.map((f: string, i: number) => (
                  <span key={i} style={{ background: '#e5e7eb', padding: '4px 12px', borderRadius: 16, fontSize: 12, fontWeight: 600 }}>{f}</span>
                ))}
              </div>
              {exportData.recent_exports?.map((e: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{e.name}</span>
                    <span style={{ background: '#dbeafe', color: '#2563eb', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{e.format}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                    <span>📋 {e.rows} vrstic</span>
                    <span>📦 {e.size_kb} KB</span>
                    <span>📅 {e.date}</span>
                  </div>
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
                <div className="card" style={{ padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>API ključi</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#8b5cf6' }}>{exportData.api_keys}</div>
                </div>
                <div className="card" style={{ padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Webhook</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: exportData.webhook_active ? '#22c55e' : '#ef4444' }}>{exportData.webhook_active ? '✅ Aktiven' : '❌ Neaktiven'}</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}