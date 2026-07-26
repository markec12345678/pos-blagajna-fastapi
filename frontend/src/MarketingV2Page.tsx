import { useState, useEffect } from 'react'
import * as api from './api'

export default function MarketingV2Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'campaigns' | 'automations' | 'segments' | 'social' | 'analytics'>('campaigns')
  const [campaigns, setCampaigns] = useState<any>(null)
  const [automations, setAutomations] = useState<any>(null)
  const [segments, setSegments] = useState<any>(null)
  const [social, setSocial] = useState<any>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/marketing-v3/campaigns', { headers: api.h() }).then(r => r.json()).then(setCampaigns),
      fetch('/api/v1/marketing-v3/automations', { headers: api.h() }).then(r => r.json()).then(setAutomations),
      fetch('/api/v1/marketing-v3/segments', { headers: api.h() }).then(r => r.json()).then(setSegments),
      fetch('/api/v1/marketing-v3/social', { headers: api.h() }).then(r => r.json()).then(setSocial),
      fetch('/api/v1/marketing-v3/analytics', { headers: api.h() }).then(r => r.json()).then(setAnalytics),
    ]).catch(() => onNotify('Napaka pri nalaganju')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'campaigns', label: '📢 Kampanje', count: campaigns?.active || 0 },
    { key: 'automations', label: '⚡ Avtomatizacije', count: automations?.active || 0 },
    { key: 'segments', label: '👥 Segmenti' },
    { key: 'social', label: '📱 Družbena omrežja' },
    { key: 'analytics', label: '📊 Analitika' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">📢 Marketing V2</h2>
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
          {tab === 'campaigns' && campaigns && (
            <div>
              {campaigns.campaigns?.map((c: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ background: c.type === 'email' ? '#3b82f6' : c.type === 'sms' ? '#22c55e' : '#8b5cf6', color: '#fff', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{c.type}</span>
                      <span style={{ background: c.status === 'active' ? '#dcfce7' : '#e5e7eb', color: c.status === 'active' ? '#16a34a' : '#666', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{c.status === 'active' ? 'Aktivna' : 'Zaključena'}</span>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, fontSize: 12 }}>
                    <div style={{ textAlign: 'center' }}><div style={{ color: '#888', fontSize: 10 }}>Poslanih</div><b>{c.sent}</b></div>
                    <div style={{ textAlign: 'center' }}><div style={{ color: '#888', fontSize: 10 }}>Odprtih</div><b>{c.opened}</b></div>
                    <div style={{ textAlign: 'center' }}><div style={{ color: '#888', fontSize: 10 }}>Klik</div><b>{c.clicked}</b></div>
                    <div style={{ textAlign: 'center' }}><div style={{ color: '#888', fontSize: 10 }}>Stopnja odprtja</div><b>{c.open_rate}%</b></div>
                    <div style={{ textAlign: 'center' }}><div style={{ color: '#888', fontSize: 10 }}>Konverzije</div><b style={{ color: '#22c55e' }}>{c.conversions}</b></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'automations' && automations && (
            <div>
              {automations.automations?.map((a: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontWeight: 600 }}>{a.name}</div>
                    <span style={{ background: '#dcfce7', color: '#16a34a', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>Aktivna</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
                    Sprožitev: <b>{a.trigger}</b> → {a.action}
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                    <span>Sprožena: <b>{a.triggered}×</b></span>
                    <span>Konverzije: <b style={{ color: '#22c55e' }}>{a.conversions}</b></span>
                    <span>Stopnja: <b>{a.triggered > 0 ? ((a.conversions / a.triggered) * 100).toFixed(1) : 0}%</b></span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'segments' && segments && (
            <div>
              {segments.segments?.map((s: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontWeight: 600 }}>{s.name}</div>
                    <span style={{ fontWeight: 700, color: '#3b82f6' }}>{s.count} strank</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Pogoji: {s.criteria}</div>
                  <div style={{ fontSize: 12 }}>
                    Kampanje: <b>{s.campaigns}</b> · Povp. stopnja odprtja: <b>{s.avg_open_rate}%</b>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'social' && social && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Skupaj sledilcev</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6' }}>{social.total_followers}</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Povp. angažiranost</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>{social.avg_engagement}%</div>
                </div>
              </div>
              {social.platforms?.map((p: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{p.name}</div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                    {p.followers && <span>Sledilci: <b>{p.followers}</b></span>}
                    {p.rating && <span>Ocena: <b>⭐ {p.rating}</b></span>}
                    {p.engagement && <span>Angažiranost: <b>{p.engagement}%</b></span>}
                    {p.reviews && <span>Mnenja: <b>{p.reviews}</b></span>}
                    {p.posts_this_month && <span>Objave: <b>{p.posts_this_month}</b></span>}
                    {p.rank && <span>Rang: <b>#{p.rank}</b></span>}
                    {p.reach && <span>Doseg: <b>{p.reach}</b></span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'analytics' && analytics && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Doseg', value: analytics.total_reach || 0, color: '#3b82f6' },
                  { label: 'Konverzije', value: analytics.total_conversions || 0, color: '#22c55e' },
                  { label: 'ROI', value: `${analytics.roi || 0}×`, color: '#f59e0b' },
                  { label: 'Stopnja konverzije', value: `${analytics.conversion_rate || 0}%`, color: '#8b5cf6' },
                  { label: 'Cena na pridobitev', value: `${analytics.cost_per_acquisition || 0} €`, color: '#ef4444' },
                  { label: 'Angažiranost', value: analytics.total_engagement || 0, color: '#3b82f6' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <h4 style={{ margin: '0 0 8px' }}>Po kanalih</h4>
              {analytics.by_channel?.map((ch: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>{ch.channel}</span>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                    <span>Poslano: {ch.sent}</span>
                    <span>Konverzije: <b style={{ color: '#22c55e' }}>{ch.conversions}</b></span>
                    <span>ROI: <b>{ch.roi}×</b></span>
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