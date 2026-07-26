import { useState, useEffect } from 'react'

interface ABTest { id: number; name: string; variant_a: { name: string; open_rate?: number; click_rate?: number; conversion?: number }; variant_b: { name: string; open_rate?: number; click_rate?: number; conversion?: number }; status: string; winner: string | null; confidence: number }
interface Social { followers: Record<string, number>; engagement: Record<string, number>; posts_this_month: number; top_post: { platform: string; content: string; likes: number; comments: number; shares: number }; recent_posts: Array<{ date: string; platform: string; content: string; likes: number; reach: number }> }
interface Campaign { id: number; name: string; sent: number; opened: number; clicked: number; unsubscribed: number; open_rate: number; click_rate: number; status: string }
interface Segment { name: string; count: number; avg_spend: number; visit_freq: number; channels: string[]; retention: number }
interface CalendarItem { date: string; platform: string; content: string; type: string; status: string }
interface Attribution { channel: string; reach: number; conversions: number; revenue: number; roas: number | null }

export default function MarketingV6Page({ onNotify }: { onNotify?: (msg: string, err?: boolean) => void }) {
  const [tab, setTab] = useState<string>('ab')
  const [abTests, setAbTests] = useState<ABTest[]>([])
  const [social, setSocial] = useState<Social | null>(null)
  const [emailCampaigns, setEmailCampaigns] = useState<Campaign[]>([])
  const [segments, setSegments] = useState<Segment[]>([])
  const [calendar, setCalendar] = useState<CalendarItem[]>([])
  const [attribution, setAttribution] = useState<Attribution[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [abRes, socialRes, emailRes, segRes, calRes, attrRes] = await Promise.all([
        fetch('/api/v1/marketing-v6/ab-tests').then(r => r.json()),
        fetch('/api/v1/marketing-v6/social-media').then(r => r.json()),
        fetch('/api/v1/marketing-v6/email-campaigns').then(r => r.json()),
        fetch('/api/v1/marketing-v6/customer-segments').then(r => r.json()),
        fetch('/api/v1/marketing-v6/content-calendar').then(r => r.json()),
        fetch('/api/v1/marketing-v6/attribution').then(r => r.json()),
      ])
      setAbTests(abRes.tests || [])
      setSocial(socialRes.social || null)
      setEmailCampaigns(emailRes.campaigns || [])
      setSegments(segRes.segments || [])
      setCalendar(calRes.calendar || [])
      setAttribution(attrRes.attribution || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const statusColor = (s: string) => s === 'active' || s === 'completed' || s === 'automated' ? '#10b981' : s === 'scheduled' ? '#3b82f6' : s === 'draft' ? '#f59e0b' : '#6b7280'

  if (loading) return <div className="loading">Nalagam...</div>

  return (
    <div style={{ padding: '2rem' }}>
      <h1>📢 Marketing V6</h1>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {[
          { key: 'ab', label: '🧪 A/B Testi' },
          { key: 'social', label: '📱 Družbena omrežja' },
          { key: 'email', label: '📧 Email kampanje' },
          { key: 'segments', label: '👥 Segmentacija' },
          { key: 'calendar', label: '📅 Koledar vsebin' },
          { key: 'attribution', label: '📊 Atribucija' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: tab === t.key ? '2px solid #2563eb' : '1px solid #d1d5db', background: tab === t.key ? '#dbeafe' : 'white', cursor: 'pointer', fontSize: '0.85rem' }}>{t.label}</button>
        ))}
      </div>

      {tab === 'ab' && (
        <div>
          <h2>A/B Testiranje</h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {abTests.map(test => (
              <div key={test.id} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <strong>{test.name}</strong>
                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.8rem', background: test.status === 'completed' ? '#d1fae5' : '#fef3c7', color: test.status === 'completed' ? '#065f46' : '#92400e' }}>{test.status === 'completed' ? 'Končano' : 'V teku'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ padding: '1rem', borderRadius: '8px', background: test.winner === 'A' ? '#d1fae5' : '#f9fafb', border: test.winner === 'A' ? '2px solid #10b981' : '1px solid #e5e7eb' }}>
                    <div style={{ fontWeight: 600 }}>{test.variant_a.name} {test.winner === 'A' && '🏆'}</div>
                    {test.variant_a.open_rate != null && <div>Odpiranja: {test.variant_a.open_rate}%</div>}
                    {test.variant_a.click_rate != null && <div>Kliki: {test.variant_a.click_rate}%</div>}
                    {test.variant_a.conversion != null && <div>Pretvorba: {test.variant_a.conversion}%</div>}
                  </div>
                  <div style={{ padding: '1rem', borderRadius: '8px', background: test.winner === 'B' ? '#d1fae5' : '#f9fafb', border: test.winner === 'B' ? '2px solid #10b981' : '1px solid #e5e7eb' }}>
                    <div style={{ fontWeight: 600 }}>{test.variant_b.name} {test.winner === 'B' && '🏆'}</div>
                    {test.variant_b.open_rate != null && <div>Odpiranja: {test.variant_b.open_rate}%</div>}
                    {test.variant_b.click_rate != null && <div>Kliki: {test.variant_b.click_rate}%</div>}
                    {test.variant_b.conversion != null && <div>Pretvorba: {test.variant_b.conversion}%</div>}
                  </div>
                </div>
                <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#6b7280' }}>Zaupanje: {test.confidence}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'social' && social && (
        <div>
          <h2>Družbena omrežja</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            {Object.entries(social.followers).map(([platform, count]) => (
              <div key={platform} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.9rem', textTransform: 'capitalize', marginBottom: '0.5rem' }}>{platform}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{count.toLocaleString()}</div>
                <div style={{ fontSize: '0.8rem', color: '#10b981' }}>Engagement: {social.engagement[platform]}%</div>
              </div>
            ))}
          </div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1rem' }}>
            <h3>🏆 Najboljša objava</h3>
            <div><strong>{social.top_post.content}</strong> na {social.top_post.platform}</div>
            <div>❤️ {social.top_post.likes} · 💬 {social.top_post.comments} · 🔄 {social.top_post.shares}</div>
          </div>
          <h3>Zadnje objave</h3>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {social.recent_posts.map((post, i) => (
              <div key={i} style={{ background: 'white', borderRadius: '8px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between' }}>
                <div><strong>{post.platform}</strong> — {post.content}</div>
                <div>❤️ {post.likes} · 📊 Doseg: {post.reach.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'email' && (
        <div>
          <h2>Email kampanje</h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {emailCampaigns.map(c => (
              <div key={c.id} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <strong>{c.name}</strong>
                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.8rem', background: statusColor(c.status) + '20', color: statusColor(c.status) }}>{c.status}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <div>Pošljeno: {c.sent.toLocaleString()}</div>
                  <div>Odpri: {c.open_rate}%</div>
                  <div>Klik: {c.click_rate}%</div>
                  <div style={{ color: c.unsubscribed > 0 ? '#ef4444' : '#10b981' }}>Odjava: {c.unsubscribed}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'segments' && (
        <div>
          <h2>Strankarska segmentacija</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            {segments.map(seg => (
              <div key={seg.name} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>{seg.name} ({seg.count} strank)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem', fontSize: '0.9rem' }}>
                  <div>Povprečje: €{seg.avg_spend}</div>
                  <div>Pogostost: {seg.visit_freq}x/mesec</div>
                  <div>Retencija: {seg.retention}%</div>
                  <div>Kanali: {seg.channels.join(', ')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'calendar' && (
        <div>
          <h2>Koledar vsebin</h2>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {calendar.map((item, i) => (
              <div key={i} style={{ background: 'white', borderRadius: '8px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{item.content}</strong>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{item.date} · {item.platform} · {item.type}</div>
                </div>
                <span style={{ padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.8rem', background: statusColor(item.status) + '20', color: statusColor(item.status) }}>{item.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'attribution' && (
        <div>
          <h2>Atribucija kanalov</h2>
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {attribution.map(a => (
                <div key={a.channel} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 80px 80px 80px 60px', alignItems: 'center', padding: '0.75rem', borderRadius: '8px', background: '#f9fafb', gap: '0.5rem' }}>
                  <strong>{a.channel}</strong>
                  <div>Doseg: {a.reach.toLocaleString()}</div>
                  <div>Pretvorbe: {a.conversions}</div>
                  <div>Prihodek: €{a.revenue.toLocaleString()}</div>
                  <div>ROAS: {a.roas ? `${a.roas}x` : '—'}</div>
                  <div style={{ height: '8px', borderRadius: '4px', background: '#e5e7eb', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, (a.roas || 0) * 15)}%`, background: (a.roas || 0) >= 5 ? '#10b981' : (a.roas || 0) >= 3 ? '#f59e0b' : '#ef4444', borderRadius: '4px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
