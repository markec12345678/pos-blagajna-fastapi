import { useState, useEffect } from 'react'
import * as api from './api'

export default function ReportsV6Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'widgets' | 'builder' | 'exports' | 'visualization'>('widgets')
  const [widgets, setWidgets] = useState<any>(null)
  const [builder, setBuilder] = useState<any>(null)
  const [exports, setExports] = useState<any>(null)
  const [visualization, setVisualization] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/reports-v6/widgets', { headers: api.h() }).then(r => r.json()).then(setWidgets),
      fetch('/api/v1/reports-v6/builder', { headers: api.h() }).then(r => r.json()).then(setBuilder),
      fetch('/api/v1/reports-v6/scheduled-exports', { headers: api.h() }).then(r => r.json()).then(setExports),
      fetch('/api/v1/reports-v6/visualization', { headers: api.h() }).then(r => r.json()).then(setVisualization),
    ]).catch(() => onNotify('Napaka')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'widgets', label: '🧩 Widgeti' },
    { key: 'builder', label: '🛠️ Graditelj' },
    { key: 'exports', label: '📤 Izvozi' },
    { key: 'visualization', label: '📊 Vizualizacija' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm"><h2 className="page-title">📊 Poročila V6</h2></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>{t.label}</button>
        ))}
      </div>
      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'widgets' && widgets && (
            <div>
              <div className="card" style={{ padding: 14, marginBottom: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#888' }}>Aktivni widgeti</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6' }}>{widgets.active_widgets}</div>
              </div>
              {widgets.available_widgets?.map((w: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 24 }}>{w.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600 }}>{w.name}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>{w.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'builder' && builder && (
            <div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                {builder.filters_available?.map((f: string, i: number) => (
                  <span key={i} style={{ background: '#e5e7eb', padding: '4px 10px', borderRadius: 16, fontSize: 11 }}>{f}</span>
                ))}
              </div>
              {builder.templates?.map((t: any) => (
                <div key={t.id} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>📊 {t.name}</span>
                    <span style={{ background: '#dbeafe', color: '#2563eb', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{t.layout}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                    <span>🧩 {t.widgets} widgetov</span>
                    <span>📅 {t.last_modified}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'exports' && exports && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Aktivni izvozi</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6' }}>{exports.active_exports}</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Uspešnost</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>{exports.delivery_stats ? ((exports.delivery_stats.delivered / exports.delivery_stats.sent) * 100).toFixed(1) : 0}%</div>
                </div>
              </div>
              {exports.exports?.map((e: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{e.name}</span>
                    <span style={{ background: '#dbeafe', color: '#2563eb', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{e.format}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                    <span>⏰ {e.frequency}</span>
                    <span>📧 {e.recipients} prejemnikov</span>
                    <span>📅 Zadnji tek: {e.last_run}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'visualization' && visualization && (
            <div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                {visualization.chart_types?.map((c: string, i: number) => (
                  <span key={i} style={{ background: '#e5e7eb', padding: '4px 10px', borderRadius: 16, fontSize: 11 }}>{c}</span>
                ))}
              </div>
              <h4 style={{ margin: '0 0 8px' }}>📈 Nedavni grafi</h4>
              {visualization.recent_charts?.map((c: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                    <span style={{ background: '#e5e7eb', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{c.type}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                    <span>📊 {c.data_points} podatkov</span>
                    <span>📅 {c.last_viewed}</span>
                  </div>
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
                <div className="card" style={{ padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Vgradnja</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: visualization.embed_support ? '#22c55e' : '#ef4444' }}>{visualization.embed_support ? '✅ Da' : '❌ Ne'}</div>
                </div>
                <div className="card" style={{ padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Real-time</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: visualization.real_time ? '#22c55e' : '#ef4444' }}>{visualization.real_time ? '✅ Da' : '❌ Ne'}</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}