import { useState, useEffect } from 'react'
import * as api from './api'

export default function GiftCardsV2Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'list' | 'analytics'>('list')
  const [cards, setCards] = useState<any>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/gift-cards-v2/list', { headers: api.h() }).then(r => r.json()).then(setCards),
      fetch('/api/v1/gift-cards-v2/analytics', { headers: api.h() }).then(r => r.json()).then(setAnalytics),
    ]).catch(() => onNotify('Napaka pri nalaganju')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'list', label: '🎁 Boni', count: cards?.total || 0 },
    { key: 'analytics', label: '📊 Analitika' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">🎁 Darilni boni V2</h2>
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
          {tab === 'list' && cards && (
            <div>
              {cards.cards?.map((c: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8, borderLeft: `4px solid ${c.status === 'active' ? '#22c55e' : '#94a3b8'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontWeight: 600 }}>{c.code}</div>
                    <span style={{ background: c.status === 'active' ? '#dcfce7' : '#e5e7eb', color: c.status === 'active' ? '#16a34a' : '#666', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{c.status === 'active' ? 'Aktiven' : 'Porabljen'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 13, marginBottom: 4 }}>
                    <span>Začetek: <b>{c.initial_amount.toFixed(0)} €</b></span>
                    <span>Stanje: <b style={{ color: c.balance > 0 ? '#22c55e' : '#ef4444' }}>{c.balance.toFixed(0)} €</b></span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>Kupil: {c.buyer} → {c.recipient}</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Izdan: {c.issued} · Poteče: {c.expires} · {c.transactions} transakcij</div>
                </div>
              ))}
            </div>
          )}

          {tab === 'analytics' && analytics && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Prodanih', value: analytics.total_sold, color: '#3b82f6' },
                  { label: 'Vrednost', value: `${analytics.total_value.toFixed(0)} €`, color: '#22c55e' },
                  { label: 'Neizkoriščeno', value: `${analytics.total_outstanding.toFixed(0)} €`, color: '#f59e0b' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div className="card" style={{ padding: 14, marginBottom: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#888' }}>Stopnja neizkoriščenega</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b' }}>{analytics.breakage_rate}%</div>
              </div>
              {analytics.by_month?.map((m: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>{m.month}</span>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                    <span>Prodanih: {m.sold}</span>
                    <span>Vrednost: {m.value} €</span>
                    <span>Porabljenih: {m.redeemed} €</span>
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