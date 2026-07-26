import { useState, useEffect } from 'react'
import * as api from './api'

export default function MarketingV4Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'campaigns' | 'sms' | 'social' | 'influencers'>('campaigns')
  const [campaigns, setCampaigns] = useState<any>(null)
  const [sms, setSms] = useState<any>(null)
  const [social, setSocial] = useState<any>(null)
  const [influencers, setInfluencers] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/marketing-v4/campaigns', { headers: api.h() }).then(r => r.json()).then(setCampaigns),
      fetch('/api/v1/marketing-v4/sms', { headers: api.h() }).then(r => r.json()).then(setSms),
      fetch('/api/v1/marketing-v4/social', { headers: api.h() }).then(r => r.json()).then(setSocial),
      fetch('/api/v1/marketing-v4/influencers', { headers: api.h() }).then(r => r.json()).then(setInfluencers),
    ]).catch(() => onNotify('Napaka')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'campaigns', label: '📧 Kampanje' },
    { key: 'sms', label: '📱 SMS' },
    { key: 'social', label: '🌐 Družbena' },
    { key: 'influencers', label: '⭐ Vplivneži' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm"><h2 className="page-title">📢 Marketing V4</h2></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>{t.label}</button>
        ))}
      </div>
      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'campaigns' && campaigns && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Aktivne', value: campaigns.active, color: '#22c55e' },
                  { label: 'Zaključene', value: campaigns.completed, color: '#3b82f6' },
                  { label: 'Skupaj poslano', value: campaigns.total_sent.toLocaleString(), color: '#8b5cf6' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {campaigns.campaigns?.map((c: any) => (
                <div key={c.id} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ background: '#e5e7eb', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{c.type}</span>
                      <span style={{ background: c.status === 'active' ? '#dcfce7' : '#dbeafe', color: c.status === 'active' ? '#16a34a' : '#2563eb', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{c.status === 'active' ? 'Aktivna' : 'Zaključena'}</span>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, fontSize: 12, color: '#666' }}>
                    <span>📤 {c.sent}</span>
                    <span>📬 {c.open_rate}%</span>
                    <span>🔗 {c.click_rate}%</span>
                    <span>💰 {c.conversions}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'sms' && sms && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Poslano', value: sms.sent_this_month, color: '#3b82f6' },
                  { label: 'Dostavljeno', value: `${sms.delivery_rate}%`, color: '#22c55e' },
                  { label: 'Strošek', value: `${sms.cost} €`, color: '#f59e0b' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {sms.campaigns?.map((c: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                    <span style={{ fontSize: 12, color: '#666' }}>{c.sent} poslanih · {c.delivered} dostavljenih · {c.replies} odgovorov</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'social' && social && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Skupni doseg</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#8b5cf6' }}>{social.total_reach?.toLocaleString()}</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Povp. engagement</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>{social.avg_engagement}%</div>
                </div>
              </div>
              {social.platforms?.map((p: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                    <span style={{ color: p.trend === 'up' ? '#22c55e' : '#888' }}>{p.trend === 'up' ? '↑' : '→'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12, color: '#666' }}>
                    <span>👥 {p.followers?.toLocaleString()}</span>
                    <span>📝 {p.posts} objav</span>
                    <span>❤️ {p.engagement_rate}%</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>📡 Doseg: {p.reach?.toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
          {tab === 'influencers' && influencers && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Skupaj strošek', value: `${influencers.total_spent} €`, color: '#f59e0b' },
                  { label: 'Konverzije', value: influencers.total_conversions, color: '#22c55e' },
                  { label: 'Povp. ROI', value: `${influencers.avg_roi}×`, color: '#8b5cf6' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {influencers.partners?.map((p: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>⭐ {p.name}</span>
                    <span style={{ color: '#8b5cf6', fontWeight: 700 }}>ROI: {p.roi}×</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, fontSize: 12, color: '#666' }}>
                    <span>📱 {p.platform}</span>
                    <span>👥 {p.followers?.toLocaleString()}</span>
                    <span>👁️ {p.impressions?.toLocaleString()}</span>
                    <span>💰 {p.conversions}</span>
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