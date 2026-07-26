import { useState, useEffect } from 'react'
import * as api from './api'

export default function CrmV3Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'pipeline' | 'leads' | 'activities' | 'forecast'>('pipeline')
  const [pipeline, setPipeline] = useState<any>(null)
  const [leads, setLeads] = useState<any>(null)
  const [activities, setActivities] = useState<any>(null)
  const [forecast, setForecast] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/crm-v3/pipeline', { headers: api.h() }).then(r => r.json()).then(setPipeline),
      fetch('/api/v1/crm-v3/leads', { headers: api.h() }).then(r => r.json()).then(setLeads),
      fetch('/api/v1/crm-v3/activities', { headers: api.h() }).then(r => r.json()).then(setActivities),
      fetch('/api/v1/crm-v3/forecast', { headers: api.h() }).then(r => r.json()).then(setForecast),
    ]).catch(() => onNotify('Napaka')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'pipeline', label: '🔄 Pipeline' },
    { key: 'leads', label: '👤 Vodje' },
    { key: 'activities', label: '📅 Aktivnosti' },
    { key: 'forecast', label: '🔮 Napoved' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm"><h2 className="page-title">👤 CRM V3</h2></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>{t.label}</button>
        ))}
      </div>
      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'pipeline' && pipeline && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                {[
                  { label: 'Pipeline', value: `${pipeline.total_pipeline?.toLocaleString()} €`, color: '#3b82f6' },
                  { label: 'Tehtano', value: `${pipeline.weighted_pipeline?.toLocaleString()} €`, color: '#8b5cf6' },
                  { label: 'Win rate', value: `${pipeline.win_rate}%`, color: '#22c55e' },
                  { label: 'Povp. posel', value: `${pipeline.avg_deal_size} €`, color: '#f59e0b' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: '#888' }}>{s.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {pipeline.stages?.map((s: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                    <span style={{ fontWeight: 700, color: s.color }}>{s.count} poslov</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: 4, height: 6, marginBottom: 4 }}>
                    <div style={{ background: s.color, height: '100%', borderRadius: 4, width: `${(s.count / 25) * 100}%` }} />
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>{s.value?.toLocaleString()} €</div>
                </div>
              ))}
            </div>
          )}
          {tab === 'leads' && leads && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Vroče', value: leads.hot, color: '#ef4444' },
                  { label: 'Toplice', value: leads.warm, color: '#f59e0b' },
                  { label: 'Mrzle', value: leads.cold, color: '#3b82f6' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {leads.leads?.map((l: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{l.name}</span>
                    <span style={{ background: l.score > 70 ? '#fef2f2' : l.score > 50 ? '#fef3c7' : '#dbeafe', color: l.score > 70 ? '#dc2626' : l.score > 50 ? '#d97706' : '#2563eb', padding: '1px 6px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>Score: {l.score}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12, color: '#666' }}>
                    <span>🔄 {l.stage}</span>
                    <span>💰 {l.value?.toLocaleString()} €</span>
                    <span>📞 {l.source}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'activities' && activities && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                {[
                  { label: 'Klici', value: activities.today?.calls, color: '#3b82f6', icon: '📞' },
                  { label: 'Emaili', value: activities.today?.emails, color: '#8b5cf6', icon: '📧' },
                  { label: 'Sestanki', value: activities.today?.meetings, color: '#22c55e', icon: '🤝' },
                  { label: 'Naloge', value: activities.today?.tasks, color: '#f59e0b', icon: '📋' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 16, marginBottom: 4 }}>{s.icon}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: '#888' }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <h4 style={{ margin: '0 0 8px' }}>📅 Prihajajoče</h4>
              {activities.upcoming?.map((a: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 6, borderLeft: `3px solid ${a.type === 'meeting' ? '#22c55e' : a.type === 'call' ? '#3b82f6' : '#8b5cf6'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{a.contact}</span>
                    <span style={{ fontSize: 12, color: '#888' }}>{a.time}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>{a.topic}</div>
                </div>
              ))}
              {activities.overdue_tasks > 0 && (
                <div className="card" style={{ padding: 12, marginTop: 12, background: '#fef2f2', textAlign: 'center' }}>
                  <span style={{ color: '#ef4444', fontWeight: 700 }}>⚠️ {activities.overdue_tasks} zamudnih nalog</span>
                </div>
              )}
            </div>
          )}
          {tab === 'forecast' && forecast && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Ta mesec</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#3b82f6' }}>{forecast.this_month?.actual?.toLocaleString()} / {forecast.this_month?.target?.toLocaleString()} €</div>
                  <div style={{ fontSize: 12, color: forecast.this_month?.probability > 70 ? '#22c55e' : '#f59e0b' }}>{forecast.this_month?.probability}% verjetnost</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Naslednji mesec</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#8b5cf6' }}>{forecast.next_month?.forecast?.toLocaleString()} €</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{forecast.next_month?.confidence}% zaupanje</div>
                </div>
              </div>
              <h4 style={{ margin: '0 0 8px' }}>📊 Po virih</h4>
              {forecast.by_source?.map((s: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{s.source}</span>
                    <span style={{ fontWeight: 700, color: '#22c55e' }}>{s.value?.toLocaleString()} €</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                    <span>📋 {s.deals} poslov</span>
                    <span>✅ {s.conversion}% konverzija</span>
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