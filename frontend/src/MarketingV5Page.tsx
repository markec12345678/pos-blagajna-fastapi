import { useState, useEffect } from 'react'
import * as api from './api'

export default function MarketingV5Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'ai' | 'journey' | 'attribution' | 'automation'>('ai')
  const [ai, setAi] = useState<any>(null)
  const [journey, setJourney] = useState<any>(null)
  const [attribution, setAttribution] = useState<any>(null)
  const [automation, setAutomation] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/marketing-v5/ai-content', { headers: api.h() }).then(r => r.json()).then(setAi),
      fetch('/api/v1/marketing-v5/journey', { headers: api.h() }).then(r => r.json()).then(setJourney),
      fetch('/api/v1/marketing-v5/attribution', { headers: api.h() }).then(r => r.json()).then(setAttribution),
      fetch('/api/v1/marketing-v5/automation', { headers: api.h() }).then(r => r.json()).then(setAutomation),
    ]).catch(() => onNotify('Napaka')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'ai', label: '🧠 AI Vsebina' },
    { key: 'journey', label: '🗺️ Pot stranke' },
    { key: 'attribution', label: '📊 Atribucija' },
    { key: 'automation', label: '⚡ Avtomatizacija' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm"><h2 className="page-title">📢 Marketing V5</h2></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>{t.label}</button>
        ))}
      </div>
      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'ai' && ai && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Generirano', value: ai.generated_this_month, color: '#8b5cf6' },
                  { label: 'AI open rate', value: `${ai.performance?.ai_open_rate}%`, color: '#22c55e' },
                  { label: 'Lift', value: `+${ai.performance?.lift}%`, color: '#f59e0b' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {ai.suggestions?.map((s: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{s.title}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ background: '#e5e7eb', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{s.type}</span>
                      <span style={{ background: s.status === 'ready' ? '#dcfce7' : '#fef3c7', color: s.status === 'ready' ? '#16a34a' : '#d97706', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{s.status === 'ready' ? 'Pripravljeno' : 'Osnutek'}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{s.preview}</div>
                  <div style={{ fontSize: 12, color: '#8b5cf6', fontWeight: 600 }}>Predvidena udeležba: {s.engagement_pred}%</div>
                </div>
              ))}
            </div>
          )}
          {tab === 'journey' && journey && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>V poteku</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6' }}>{journey.total_in_journeys}</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Povp. dokončanje</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>{journey.avg_completion_rate}%</div>
                </div>
              </div>
              {journey.journeys?.map((j: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{j.name}</span>
                    <span style={{ fontWeight: 700, color: '#22c55e' }}>{j.conversion}% konverzija</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12, color: '#666' }}>
                    <span>📋 {j.steps} korakov</span>
                    <span>👥 {j.active_users} aktivnih</span>
                    <span>📅 {j.avg_days} dni</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'attribution' && attribution && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Konverzije', value: attribution.total_conversions, color: '#3b82f6' },
                  { label: 'Prihodki', value: `${attribution.total_revenue?.toLocaleString()} €`, color: '#22c55e' },
                  { label: 'Stroški', value: `${attribution.total_cost} €`, color: '#ef4444' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {attribution.channels?.map((c: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                    <span style={{ fontWeight: 700, color: '#22c55e' }}>ROI: {c.roi}×</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: 4, height: 6, marginBottom: 4 }}>
                    <div style={{ background: '#3b82f6', height: '100%', borderRadius: 4, width: `${c.pct}%` }} />
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                    <span>{c.conversions} konverzij</span>
                    <span>{c.revenue?.toLocaleString()} €</span>
                    <span>{c.cost} € strošek</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'automation' && automation && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Aktivni poteki</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6' }}>{automation.active_flows}</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Danes sproženih</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#8b5cf6' }}>{automation.triggered_today}</div>
                </div>
              </div>
              {automation.flows?.map((f: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{f.name}</span>
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>{f.revenue} €</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Sprožilo: {f.trigger}</div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                    <span>👥 {f.active_users} aktivnih</span>
                    <span>✅ {f.completion_rate}% dokončanje</span>
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