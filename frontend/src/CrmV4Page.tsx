import React, { useState, useEffect } from 'react'
import { authHeader } from './api'
import { useTranslation } from './i18n'

export default function CrmV4Page({ onNotify }: { onNotify: (m: string) => void }) {
  const { t } = useTranslation()
  const [segments, setSegments] = useState<any[]>([])
  const [funnel, setFunnel] = useState<any[]>([])
  const [ltv, setLtv] = useState<any>(null)
  const [churn, setChurn] = useState<any>(null)
  const [engagement, setEngagement] = useState<any>(null)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [journeys, setJourneys] = useState<any[]>([])
  const [timeline, setTimeline] = useState<any[]>([])
  const [tab, setTab] = useState('segments')

  useEffect(() => {
    fetch('/api/v1/crm-v4/segments', { headers: authHeader() }).then(r => r.json()).then(d => setSegments(d.segments || [])).catch(() => {})
    fetch('/api/v1/crm-v4/funnel', { headers: authHeader() }).then(r => r.json()).then(d => setFunnel(d.funnel || [])).catch(() => {})
    fetch('/api/v1/crm-v4/lifetime-value', { headers: authHeader() }).then(r => r.json()).then(d => setLtv(d)).catch(() => {})
    fetch('/api/v1/crm-v4/churn-analysis', { headers: authHeader() }).then(r => r.json()).then(d => setChurn(d)).catch(() => {})
    fetch('/api/v1/crm-v4/engagement', { headers: authHeader() }).then(r => r.json()).then(d => setEngagement(d.engagement || null)).catch(() => {})
    fetch('/api/v1/crm-v4/campaigns', { headers: authHeader() }).then(r => r.json()).then(d => setCampaigns(d.campaigns || [])).catch(() => {})
    fetch('/api/v1/crm-v4/journey-mapping', { headers: authHeader() }).then(r => r.json()).then(d => setJourneys(d.journeys || [])).catch(() => {})
    fetch('/api/v1/crm-v4/contact-timeline', { headers: authHeader() }).then(r => r.json()).then(d => setTimeline(d.timeline || [])).catch(() => {})
  }, [])

  return (
    <div style={{ padding: 16 }}>
      <h2>👥 CRM V4</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['segments', 'funnel', 'ltv', 'churn', 'engagement', 'campaigns', 'journeys', 'timeline'] as const).map(s => (
          <button key={s} onClick={() => setTab(s)} className={`btn ${tab === s ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: 12 }}>
            {s === 'segments' ? 'Segmenti' : s === 'funnel' ? 'Lijak' : s === 'ltv' ? 'LTV' : s === 'churn' ? 'Odhod' : s === 'engagement' ? 'Vključenost' : s === 'campaigns' ? 'Kampanje' : s === 'journeys' ? 'Poti' : 'Časovnica'}
          </button>
        ))}
      </div>

      {tab === 'segments' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {segments.map((s: any) => (
            <div key={s.id} className="card" style={{ borderTop: `3px solid ${s.color}` }}>
              <h4 style={{ margin: 0 }}>{s.name}</h4>
              <p style={{ fontSize: 24, fontWeight: 700, margin: '8px 0' }}>{s.count}</p>
              <p style={{ fontSize: 12, color: 'var(--muted)' }}>{s.criteria}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'funnel' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {funnel.map((f: any, i: number) => (
            <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px' }}>
              <div style={{ width: 120, fontSize: 13, fontWeight: 600 }}>{f.stage}</div>
              <div style={{ flex: 1, background: 'var(--bg, #f1f5f9)', borderRadius: 8, overflow: 'hidden', height: 28 }}>
                <div style={{ width: `${f.conversion}%`, background: 'var(--primary, #059669)', height: '100%', borderRadius: 8, display: 'flex', alignItems: 'center', paddingLeft: 8, color: '#fff', fontSize: 12, fontWeight: 600 }}>{f.count}</div>
              </div>
              <div style={{ width: 50, textAlign: 'right', fontSize: 12, color: 'var(--muted)' }}>{f.conversion}%</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'ltv' && ltv && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div className="card" style={{ textAlign: 'center' }}><p style={{ fontSize: 12, color: 'var(--muted)' }}>Skupaj LTV</p><p style={{ fontSize: 24, fontWeight: 700 }}>€{ltv.total_ltv?.toLocaleString()}</p></div>
            <div className="card" style={{ textAlign: 'center' }}><p style={{ fontSize: 12, color: 'var(--muted)' }}>Povprečno/mesec</p><p style={{ fontSize: 24, fontWeight: 700 }}>€{ltv.avg_monthly?.toLocaleString()}</p></div>
            <div className="card" style={{ textAlign: 'center' }}><p style={{ fontSize: 12, color: 'var(--muted)' }}>Segmenti</p><p style={{ fontSize: 24, fontWeight: 700 }}>{ltv.ltv?.length || 0}</p></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {(ltv.ltv || []).map((l: any, i: number) => (
              <div key={i} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0 }}>{l.segment}</h4>
                  <span style={{ color: l.trend === 'up' ? 'var(--green)' : l.trend === 'down' ? 'var(--red)' : 'var(--muted)', fontSize: 12 }}>{l.trend === 'up' ? '↑' : l.trend === 'down' ? '↓' : '→'}</span>
                </div>
                <p style={{ fontSize: 22, fontWeight: 700, margin: '8px 0' }}>€{l.avg_ltv}</p>
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>{l.count} strank</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'churn' && churn && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div className="card" style={{ textAlign: 'center' }}><p style={{ fontSize: 12, color: 'var(--muted)' }}>Stopnja odhoda</p><p style={{ fontSize: 24, fontWeight: 700, color: 'var(--red)' }}>{churn.churn_rate}%</p></div>
            <div className="card" style={{ textAlign: 'center' }}><p style={{ fontSize: 12, color: 'var(--muted)' }}>Tvegane stranke</p><p style={{ fontSize: 24, fontWeight: 700, color: 'var(--amber)' }}>{churn.risk_customers}</p></div>
            <div className="card" style={{ textAlign: 'center' }}><p style={{ fontSize: 12, color: 'var(--muted)' }}>Retencija</p><p style={{ fontSize: 24, fontWeight: 700, color: 'var(--green)' }}>{(100 - churn.churn_rate).toFixed(1)}%</p></div>
          </div>
          <div className="card">
            <h4>Mesečni odhod</h4>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              {(churn.churn || []).map((c: any, i: number) => (
                <div key={i} style={{ flex: 1, minWidth: 80, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.month}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--red)' }}>{c.churned}</div>
                  <div style={{ fontSize: 11, color: 'var(--green)' }}>{c.retained} ostalih</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'engagement' && engagement && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {Object.entries(engagement).map(([key, val]) => (
            <div key={key} className="card" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: 'var(--muted)' }}>{key.replace(/_/g, ' ')}</p>
              <p style={{ fontSize: 22, fontWeight: 700 }}>{typeof val === 'number' ? (key.includes('rate') || key.includes('participation') ? `${val}%` : key.includes('score') ? val : key.includes('visits') || key.includes('spend') ? `€${val}`.replace('€€', '€') : val) : String(val)}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'campaigns' && (
        <div style={{ display: 'grid', gap: 12 }}>
          {campaigns.map((c: any) => (
            <div key={c.id} className="card" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.type}</div>
              </div>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: 11, color: 'var(--muted)' }}>Poslano</div><div style={{ fontWeight: 600 }}>{c.sent}</div></div>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: 11, color: 'var(--muted)' }}>Odpri</div><div style={{ fontWeight: 600 }}>{c.opened}</div></div>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: 11, color: 'var(--muted)' }}>Klik</div><div style={{ fontWeight: 600 }}>{c.clicked}</div></div>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: 11, color: 'var(--muted)' }}>Konverzija</div><div style={{ fontWeight: 600, color: 'var(--green)' }}>{c.conversion}%</div></div>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: c.status === 'active' ? 'var(--green)' : c.status === 'scheduled' ? 'var(--amber)' : 'var(--muted)', color: '#fff' }}>{c.status}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'journeys' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
          {journeys.map((j: any) => (
            <div key={j.id} className="card">
              <h4 style={{ margin: 0 }}>{j.name}</h4>
              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Tock</div><div style={{ fontWeight: 700 }}>{j.touchpoints}</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Konverzija</div><div style={{ fontWeight: 700, color: 'var(--green)' }}>{j.conversion}%</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Dni</div><div style={{ fontWeight: 700 }}>{j.avg_days}</div></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'timeline' && (
        <div className="card" style={{ padding: 16 }}>
          <h4 style={{ marginTop: 0 }}>Kontakt zgodovina</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {timeline.map((t: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'var(--bg, #f1f5f9)', borderRadius: 8 }}>
                <span style={{ fontSize: 18 }}>{t.type === 'visit' ? '🍽️' : t.type === 'email' ? '📧' : t.type === 'sms' ? '📱' : t.type === 'review' ? '⭐' : '📌'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{t.type === 'visit' ? `Obisk - €${t.amount}` : t.subject || `Ocena ${t.rating}/5`}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t.date}</div>
                </div>
                {t.items && <span style={{ fontSize: 12 }}>{t.items} postavk</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
