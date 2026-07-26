import { useState, useEffect } from 'react'

interface Lead { id: number; name: string; type: string; score: number; value: number; stage: string; last_contact: string; probability: number; owner: string; activities: Array<{ date: string; action: string; result: string }> }
interface Campaign { id: number; name: string; type: string; sent: number; opened: number; clicked: number; converted: number; revenue: number; cost: number; roi: number | null; status: string }
interface HealthScore { customer_id: number; name: string; health_score: number; factors: Record<string, number>; status: string; next_action: string }

export default function CrmV5Page({ onNotify }: { onNotify?: (msg: string, err?: boolean) => void }) {
  const [tab, setTab] = useState<string>('leads')
  const [leads, setLeads] = useState<Lead[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [pipeline, setPipeline] = useState<any[]>([])
  const [health, setHealth] = useState<HealthScore[]>([])
  const [tags, setTags] = useState<any[]>([])
  const [timeline, setTimeline] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [lRes, cRes, pRes, hRes, tRes, tiRes] = await Promise.all([
        fetch('/api/v1/crm-v5/lead-scoring').then(r => r.json()),
        fetch('/api/v1/crm-v5/campaign-performance').then(r => r.json()),
        fetch('/api/v1/crm-v5/sales-pipeline').then(r => r.json()),
        fetch('/api/v1/crm-v5/customer-health').then(r => r.json()),
        fetch('/api/v1/crm-v5/customer-tags').then(r => r.json()),
        fetch('/api/v1/crm-v5/interaction-timeline').then(r => r.json()),
      ])
      setLeads(lRes.leads || [])
      setCampaigns(cRes.campaigns || [])
      setPipeline(pRes.pipeline || [])
      setHealth(hRes.health || [])
      setTags(tRes.tags || [])
      setTimeline(tiRes.timeline || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  if (loading) return <div className="loading">Nalagam...</div>

  return (
    <div style={{ padding: '2rem' }}>
      <h1>🤝 CRM V5</h1>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {[
          { key: 'leads', label: '🎯 Vodje' },
          { key: 'campaigns', label: '📣 Kampanje' },
          { key: 'pipeline', label: '📊 Cevovod' },
          { key: 'health', label: '💚 Zdravje strank' },
          { key: 'tags', label: '🏷️ Oznake' },
          { key: 'timeline', label: '📅 Časovnica' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: tab === t.key ? '2px solid #2563eb' : '1px solid #d1d5db', background: tab === t.key ? '#dbeafe' : 'white', cursor: 'pointer', fontSize: '0.85rem' }}>{t.label}</button>
        ))}
      </div>

      {tab === 'leads' && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {leads.map(l => (
            <div key={l.id} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div>
                  <strong>{l.name}</strong>
                  <span style={{ marginLeft: '0.5rem', padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.7rem', background: '#dbeafe', color: '#1e40af' }}>{l.type}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontWeight: 700, color: l.score >= 80 ? '#10b981' : l.score >= 60 ? '#f59e0b' : '#ef4444' }}>{l.score}</span>
                  <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>{l.stage}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>€{l.value.toLocaleString()}</span>
                </div>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem' }}>Verjetnost: {l.probability}% · Lastnik: {l.owner} · Zadnji stik: {l.last_contact}</div>
              <div style={{ display: 'grid', gap: '0.25rem' }}>
                {l.activities.map((a, i) => (
                  <div key={i} style={{ fontSize: '0.8rem', color: '#6b7280' }}>• {a.date}: {a.action} ({a.result})</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'campaigns' && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {campaigns.map(c => (
            <div key={c.id} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div><strong>{c.name}</strong> <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{c.type}</span></div>
                <span style={{ padding: '0.2rem 0.6rem', borderRadius: '8px', fontSize: '0.75rem', background: c.status === 'active' ? '#d1fae5' : c.status === 'completed' ? '#dbeafe' : '#f3f4f6', color: c.status === 'active' ? '#065f46' : '#1e40af' }}>{c.status}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', fontSize: '0.85rem' }}>
                <div>Pošljeno: {c.sent.toLocaleString()}</div>
                <div>Odpri: {((c.opened / c.sent) * 100).toFixed(1)}%</div>
                <div>Klik: {((c.clicked / c.sent) * 100).toFixed(1)}%</div>
                <div>Pretvorba: {c.converted}</div>
                <div style={{ fontWeight: 600, color: '#10b981' }}>€{c.revenue.toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'pipeline' && (
        <div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            {pipeline.map((p, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 80px 80px 60px', alignItems: 'center', gap: '1rem', padding: '0.75rem', borderRadius: '8px', background: '#f9fafb', marginBottom: '0.5rem' }}>
                <strong>{p.stage}</strong>
                <div style={{ height: '20px', borderRadius: '4px', background: '#e5e7eb', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${p.conversion}%`, background: '#3b82f6', borderRadius: '4px' }} />
                </div>
                <div style={{ textAlign: 'center' }}>{p.count}</div>
                <div style={{ textAlign: 'center', fontWeight: 600 }}>€{p.value.toLocaleString()}</div>
                <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.85rem' }}>{p.avg_days}d</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'health' && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {health.map(h => (
            <div key={h.customer_id} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: `4px solid ${h.status === 'excellent' ? '#10b981' : h.status === 'good' ? '#3b82f6' : h.status === 'at_risk' ? '#f59e0b' : '#ef4444'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <strong>{h.name}</strong>
                <span style={{ fontWeight: 700, fontSize: '1.2rem', color: h.health_score >= 80 ? '#10b981' : h.health_score >= 60 ? '#f59e0b' : '#ef4444' }}>{h.health_score}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                {Object.entries(h.factors).map(([k, v]) => (
                  <div key={k}>{k.replace(/_/g, ' ')}: {v}%</div>
                ))}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#f59e0b' }}>Naslednje: {h.next_action}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'tags' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {tags.map(t => (
            <div key={t.tag} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderTop: `4px solid ${t.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <strong>{t.tag}</strong>
                <span style={{ fontWeight: 700 }}>{t.count}</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Kriterij: {t.criteria}</div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>{t.auto_applied ? '🤖 Samodejno' : '👤 Ročno'}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'timeline' && (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {timeline.map(t => (
            <div key={t.customer_id} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <strong>{t.customer}</strong>
                <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>{t.total_interactions} interakcij · €{t.total_value}</span>
              </div>
              <div style={{ borderLeft: '2px solid #e5e7eb', paddingLeft: '1rem' }}>
                {t.interactions.map((i: any, idx: number) => (
                  <div key={idx} style={{ marginBottom: '0.75rem', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-1.35rem', top: '0.25rem', width: '10px', height: '10px', borderRadius: '50%', background: i.sentiment === 'positive' ? '#10b981' : '#f59e0b' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>{i.date} · {i.type} ({i.channel})</span>
                      {i.value > 0 && <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>€{i.value}</span>}
                    </div>
                    <div style={{ fontSize: '0.9rem' }}>{i.summary}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
