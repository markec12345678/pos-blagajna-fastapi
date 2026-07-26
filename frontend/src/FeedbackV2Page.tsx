import { useState, useEffect } from 'react'
import * as api from './api'

export default function FeedbackV2Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'surveys' | 'nps' | 'csat' | 'recent'>('surveys')
  const [surveys, setSurveys] = useState<any>(null)
  const [nps, setNps] = useState<any>(null)
  const [csat, setCsat] = useState<any>(null)
  const [recent, setRecent] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/feedback-v2/surveys', { headers: api.h() }).then(r => r.json()).then(setSurveys),
      fetch('/api/v1/feedback-v2/nps', { headers: api.h() }).then(r => r.json()).then(setNps),
      fetch('/api/v1/feedback-v2/csat', { headers: api.h() }).then(r => r.json()).then(setCsat),
      fetch('/api/v1/feedback-v2/recent', { headers: api.h() }).then(r => r.json()).then(setRecent),
    ]).catch(() => onNotify('Napaka')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'surveys', label: '📋 Ankete', count: surveys?.total || 0 },
    { key: 'nps', label: '🎯 NPS' },
    { key: 'csat', label: '⭐ CSAT' },
    { key: 'recent', label: '💬 Nedavni' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm"><h2 className="page-title">💬 Povratne informacije V2</h2></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>{t.label}</button>
        ))}
      </div>
      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'surveys' && surveys && (
            <div>
              {surveys.surveys?.map((s: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                    <span style={{ background: '#dcfce7', color: '#16a34a', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{s.type}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#666' }}>
                    <span>Odzivov: <b>{s.responses}</b></span>
                    <span>Povp.: <b>{s.avg_score || s.nps_score}</b></span>
                    <span>Dokončanje: {s.completion_rate}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'nps' && nps && (
            <div>
              <div className="card" style={{ padding: 20, marginBottom: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#888' }}>NPS Score</div>
                <div style={{ fontSize: 36, fontWeight: 700, color: nps.nps_score >= 50 ? '#22c55e' : '#f59e0b' }}>{nps.nps_score}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Promotorji', value: `${nps.promoters_pct}%`, color: '#22c55e' },
                  { label: 'Nevtralni', value: `${nps.passives_pct}%`, color: '#f59e0b' },
                  { label: 'Kritiki', value: `${nps.detractors_pct}%`, color: '#ef4444' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <h4 style={{ margin: '0 0 8px' }}>Po kategoriji</h4>
              {nps.by_category?.map((c: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>{c.category}</span>
                  <span style={{ fontWeight: 700, color: c.nps >= 50 ? '#22c55e' : '#f59e0b' }}>{c.nps}</span>
                </div>
              ))}
            </div>
          )}
          {tab === 'csat' && csat && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Povp. ocena</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b' }}>{csat.avg_score}/5</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Stopnja zadovoljstva</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>{csat.satisfaction_rate}%</div>
                </div>
              </div>
              <h4 style={{ margin: '0 0 8px' }}>Porazdelitev</h4>
              {csat.distribution && Object.entries(csat.distribution).map(([k, v]) => (
                <div key={k} className="card" style={{ padding: 8, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontWeight: 600, width: 30 }}>{'⭐'.repeat(Number(k))}</span>
                  <div style={{ flex: 1, background: '#e5e7eb', borderRadius: 4, height: 8 }}>
                    <div style={{ background: '#f59e0b', height: '100%', borderRadius: 4, width: `${((v as number) / 55) * 100}%` }} />
                  </div>
                  <span style={{ fontSize: 12, width: 30, textAlign: 'right' }}>{v as number}</span>
                </div>
              ))}
            </div>
          )}
          {tab === 'recent' && recent && (
            <div>
              {recent.feedback?.map((f: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{'⭐'.repeat(Math.min(f.score, 5))}</span>
                    <span style={{ fontSize: 11, color: '#888' }}>{f.type} · {f.category}</span>
                  </div>
                  <div style={{ fontSize: 13 }}>{f.comment}</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{f.date}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}