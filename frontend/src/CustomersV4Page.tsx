import { useState, useEffect } from 'react'
import * as api from './api'

export default function CustomersV4Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'sentiment' | 'ltv' | 'churn' | 'personalization'>('sentiment')
  const [sentiment, setSentiment] = useState<any>(null)
  const [ltv, setLtv] = useState<any>(null)
  const [churn, setChurn] = useState<any>(null)
  const [personalization, setPersonalization] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/customers-v4/sentiment', { headers: api.h() }).then(r => r.json()).then(setSentiment),
      fetch('/api/v1/customers-v4/ltv-prediction', { headers: api.h() }).then(r => r.json()).then(setLtv),
      fetch('/api/v1/customers-v4/churn', { headers: api.h() }).then(r => r.json()).then(setChurn),
      fetch('/api/v1/customers-v4/personalization', { headers: api.h() }).then(r => r.json()).then(setPersonalization),
    ]).catch(() => onNotify('Napaka')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'sentiment', label: '💬 Sentiment' },
    { key: 'ltv', label: '💰 LTV' },
    { key: 'churn', label: '⚠️ Odhod' },
    { key: 'personalization', label: '🎯 Osebno' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm"><h2 className="page-title">👥 Stranke V4</h2></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>{t.label}</button>
        ))}
      </div>
      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'sentiment' && sentiment && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Povp. sentiment</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b' }}>⭐ {sentiment.overall_sentiment}</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Skupaj ocen</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6' }}>{sentiment.total_reviews}</div>
                </div>
              </div>
              <h4 style={{ margin: '0 0 8px' }}>📊 Po tematiki</h4>
              {sentiment.topics?.map((t: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{t.topic}</span>
                    <span style={{ color: t.sentiment > 4 ? '#22c55e' : t.sentiment > 3.5 ? '#f59e0b' : '#ef4444', fontWeight: 700 }}>⭐ {t.sentiment}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>{t.mentions} omemb · {t.trend === 'up' ? '📈' : t.trend === 'down' ? '📉' : '➡️'}</div>
                </div>
              ))}
              <h4 style={{ margin: '16px 0 8px' }}>💬 Nedavne ocene</h4>
              {sentiment.recent_reviews?.map((r: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{r.customer}</span>
                    <span style={{ color: '#f59e0b' }}>{'⭐'.repeat(r.rating)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666', fontStyle: 'italic' }}>"{r.text}"</div>
                </div>
              ))}
            </div>
          )}
          {tab === 'ltv' && ltv && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Povp. napovedan LTV</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6' }}>{ltv.avg_predicted_ltv} €</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Visoka vrednost</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>{ltv.high_value?.count} ({ltv.high_value?.pct_revenue}%)</div>
                </div>
              </div>
              {ltv.segments?.map((s: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 6, borderLeft: `4px solid ${i === 0 ? '#f59e0b' : i === 1 ? '#22c55e' : i === 2 ? '#3b82f6' : i === 3 ? '#ef4444' : '#94a3b8'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                    <span style={{ fontWeight: 700, color: '#3b82f6' }}>{s.count} strank</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                    <span>LTV: {s.predicted_ltv} €</span>
                    <span>Retencija: {s.retention}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'churn' && churn && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Mesečni odhod</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#ef4444' }}>{churn.churn_rate_monthly}%</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Tvegani</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b' }}>{churn.customers_at_risk}</div>
                </div>
              </div>
              <h4 style={{ margin: '0 0 8px' }}>⚠️ Dejavniki tveganja</h4>
              {churn.risk_factors?.map((f: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{f.factor}</span>
                    <span style={{ fontWeight: 700, color: '#ef4444' }}>{f.count} strank</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: 4, height: 6 }}>
                    <div style={{ background: '#ef4444', height: '100%', borderRadius: 4, width: `${f.weight * 100}%` }} />
                  </div>
                </div>
              ))}
              <h4 style={{ margin: '16px 0 8px' }}>🛡️ Kampanje za preprečitev</h4>
              {churn.prevention_campaigns?.map((c: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 6 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{c.name}</div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                    <span>👥 {c.target} ciljnih</span>
                    <span>📈 {c.conversion_pred}% predvidena konverzija</span>
                    <span>💰 {c.cost} € strošek</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'personalization' && personalization && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Pravila', value: personalization.rules_active, color: '#3b82f6' },
                  { label: 'Poslane', value: personalization.personalized_offers_sent, color: '#8b5cf6' },
                  { label: 'Konverzija', value: `${personalization.conversion_rate}%`, color: '#22c55e' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {personalization.rules?.map((r: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Sprožilo: {r.trigger}</div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                    <span style={{ color: '#8b5cf6' }}>Akcija: {r.action}</span>
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>{r.conversions} konverzij</span>
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