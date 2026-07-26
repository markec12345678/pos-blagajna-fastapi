import { useState, useEffect } from 'react'

interface DynamicPricing { name: string; condition: string; discount: number; items: string[]; active: boolean; revenue_impact: string | null }
interface LoyaltyPromo { id: number; name: string; type: string; multiplier?: number; min_order?: number; segment?: string; valid_until: string; redemptions: number; revenue: number; status: string }
interface Seasonal { id: number; name: string; season: string; start: string; end: string; budget: number; spent: number; revenue: number; roi: number; status: string }
interface Competitor { name: string; distance_km: number; avg_price: number; rating: number; strengths: string[]; weaknesses: string[] }
interface CalendarItem { date: string; name: string; type: string; channel: string; budget: number; expected_reach: number }
interface PromoROI { promotion: string; cost: number; revenue: number; roi: number | null; new_customers: number; repeat_rate: number }

export default function PromotionsV4Page({ onNotify }: { onNotify?: (msg: string, err?: boolean) => void }) {
  const [tab, setTab] = useState<string>('dynamic')
  const [pricing, setPricing] = useState<DynamicPricing[]>([])
  const [loyalty, setLoyalty] = useState<LoyaltyPromo[]>([])
  const [seasonal, setSeasonal] = useState<Seasonal[]>([])
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [calendar, setCalendar] = useState<CalendarItem[]>([])
  const [promoRoi, setPromoRoi] = useState<PromoROI[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [dRes, lRes, sRes, cRes, calRes, rRes] = await Promise.all([
        fetch('/api/v1/promotions-v4/dynamic-pricing').then(r => r.json()),
        fetch('/api/v1/promotions-v4/loyalty-promotions').then(r => r.json()),
        fetch('/api/v1/promotions-v4/seasonal-campaigns').then(r => r.json()),
        fetch('/api/v1/promotions-v4/competitor-analysis').then(r => r.json()),
        fetch('/api/v1/promotions-v4/promotion-calendar').then(r => r.json()),
        fetch('/api/v1/promotions-v4/promo-roi').then(r => r.json()),
      ])
      setPricing(dRes.pricing?.rules || [])
      setLoyalty(lRes.promotions || [])
      setSeasonal(sRes.campaigns || [])
      setCompetitors(cRes.competitors || [])
      setCalendar(calRes.calendar || [])
      setPromoRoi(rRes.roi || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  if (loading) return <div className="loading">Nalagam...</div>

  return (
    <div style={{ padding: '2rem' }}>
      <h1>🎯 Promocije V4</h1>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {[
          { key: 'dynamic', label: '💰 Dinamično cenjenje' },
          { key: 'loyalty', label: '⭐ Zvestoba' },
          { key: 'seasonal', label: '🌴 Sezonske kampanje' },
          { key: 'competitors', label: '🏢 Tekmovanje' },
          { key: 'calendar', label: '📅 Koledar promocij' },
          { key: 'roi', label: '📊 ROI' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: tab === t.key ? '2px solid #2563eb' : '1px solid #d1d5db', background: tab === t.key ? '#dbeafe' : 'white', cursor: 'pointer', fontSize: '0.85rem' }}>{t.label}</button>
        ))}
      </div>

      {tab === 'dynamic' && (
        <div>
          <h2>Dinamično cenjenje</h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {pricing.map((p, i) => (
              <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', opacity: p.active ? 1 : 0.6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <strong>{p.name}</strong>
                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.8rem', background: p.active ? '#d1fae5' : '#f3f4f6', color: p.active ? '#065f46' : '#6b7280' }}>{p.active ? 'Aktivno' : 'Neaktivno'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <div>Pogoj: {p.condition}</div>
                  <div>Popust: {p.discount}%</div>
                  <div>Artikli: {p.items.join(', ')}</div>
                </div>
                {p.revenue_impact && <div style={{ marginTop: '0.5rem', color: '#10b981', fontWeight: 600 }}>{p.revenue_impact}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'loyalty' && (
        <div>
          <h2>Zvestobne promocije</h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {loyalty.map(l => (
              <div key={l.id} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <strong>{l.name}</strong>
                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.8rem', background: l.status === 'active' ? '#d1fae5' : '#f3f4f6', color: l.status === 'active' ? '#065f46' : '#6b7280' }}>{l.status === 'active' ? 'Aktivno' : 'Končano'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <div>Tip: {l.type}</div>
                  <div>Velja do: {l.valid_until}</div>
                  <div>Rabe: {l.redemptions}</div>
                  <div>Prihodek: €{l.revenue.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'seasonal' && (
        <div>
          <h2>Sezonske kampanje</h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {seasonal.map(s => (
              <div key={s.id} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <strong>{s.name}</strong>
                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.8rem', background: s.status === 'active' ? '#d1fae5' : '#dbeafe', color: s.status === 'active' ? '#065f46' : '#1e40af' }}>{s.status === 'active' ? 'Aktivno' : 'Načrtovano'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                  <div>Sezona: {s.season}</div>
                  <div>Obdobje: {s.start} — {s.end}</div>
                  <div>ROI: {s.roi > 0 ? `${s.roi}%` : '—'}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <div>Proračun: €{s.budget}</div>
                  <div>Porabljeno: €{s.spent}</div>
                  <div>Prihodek: €{s.revenue.toLocaleString()}</div>
                </div>
                <div style={{ height: '8px', borderRadius: '4px', background: '#e5e7eb', marginTop: '0.75rem', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, (s.spent / s.budget) * 100)}%`, background: s.spent > s.budget ? '#ef4444' : '#10b981', borderRadius: '4px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'competitors' && (
        <div>
          <h2>Analiza tekmecev</h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {competitors.map(c => (
              <div key={c.name} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <strong>{c.name}</strong>
                  <span>{c.distance_km} km · ⭐ {c.rating} · €{c.avg_price}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#10b981', marginBottom: '0.25rem' }}>Prednosti</div>
                    {c.strengths.map((s, i) => <div key={i} style={{ fontSize: '0.85rem' }}>✓ {s}</div>)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#ef4444', marginBottom: '0.25rem' }}>Slabosti</div>
                    {c.weaknesses.map((w, i) => <div key={i} style={{ fontSize: '0.85rem' }}>✗ {w}</div>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'calendar' && (
        <div>
          <h2>Koledar promocij</h2>
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {calendar.map((c, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 100px 100px', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '8px', background: '#f9fafb' }}>
                  <div style={{ fontWeight: 600 }}>{c.date}</div>
                  <div>{c.name}</div>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{c.channel}</div>
                  <div style={{ fontSize: '0.85rem' }}>€{c.budget}</div>
                  <div style={{ fontSize: '0.85rem', color: '#3b82f6' }}>📊 {c.expected_reach}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'roi' && (
        <div>
          <h2>ROI promocij</h2>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {promoRoi.map(p => (
              <div key={p.promotion} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'grid', gridTemplateColumns: '140px 1fr 80px 80px 80px', alignItems: 'center', gap: '1rem' }}>
                <strong>{p.promotion}</strong>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <div>Strošek: €{p.cost}</div>
                  <div>Prihodek: €{p.revenue.toLocaleString()}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, color: (p.roi || 0) > 500 ? '#10b981' : '#f59e0b' }}>{p.roi ? `${p.roi}%` : '—'}</div>
                  <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>ROI</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 700 }}>{p.new_customers}</div>
                  <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>Novih</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 700 }}>{p.repeat_rate}%</div>
                  <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>Ponovitev</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
