import { useState, useEffect } from 'react'
import * as api from './api'

export default function RatingsPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [data, setData] = useState<any>(null)
  const [days, setDays] = useState(30)

  const load = async () => {
    try {
      const r = await fetch(`/api/v1/ratings?days=${days}`, { headers: api.authHeader() }).then(r => r.json())
      setData(r)
    } catch {}
  }

  useEffect(() => { load() }, [days])

  const Star = ({ n }: { n: number }) => (
    <span style={{ color: '#f59e0b' }}>{n >= 1 ? '★' : '☆'}</span>
  )

  return (
    <div className="ratings-page">
      <div className="page-header">
        <h2>⭐ Ocene gostov</h2>
        <select className="input" style={{ width: 120 }} value={days} onChange={e => setDays(parseInt(e.target.value))}>
          <option value={7}>Zadnjih 7 dni</option>
          <option value={30}>Zadnjih 30 dni</option>
          <option value={90}>Zadnjih 90 dni</option>
          <option value={365}>Vse leto</option>
        </select>
      </div>

      {data && (
        <div className="ratings-overview">
          <div className="card" style={{ padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 700 }}>{data.average}</div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>Povprečje</div>
            <div>{[1, 2, 3, 4, 5].map(n => <Star key={n} n={n <= Math.round(data.average) ? 1 : 0} />)}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>{data.total} ocen</div>
          </div>
          <div className="card" style={{ padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{data.avg_food}</div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>Hrana</div>
          </div>
          <div className="card" style={{ padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{data.avg_service}</div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>Postrežba</div>
          </div>
          <div className="card" style={{ padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{data.avg_ambiance}</div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>Vzdušje</div>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 16, marginTop: 16 }}>
        <h4 className="mb-8">Porazdelitev ocen</h4>
        {data && [5, 4, 3, 2, 1].map(s => {
          const count = data.distribution[s] || 0
          const pct = data.total > 0 ? (count / data.total * 100) : 0
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ width: 30, fontSize: 13 }}>{s}★</span>
              <div style={{ flex: 1, height: 16, background: 'var(--bg3)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: '#f59e0b', borderRadius: 8 }} />
              </div>
              <span style={{ width: 40, fontSize: 12, textAlign: 'right', color: 'var(--text2)' }}>{count}</span>
            </div>
          )
        })}
      </div>

      <div className="card" style={{ padding: 16, marginTop: 16 }}>
        <h4 className="mb-8">Zadnje ocene</h4>
        {data?.recent.length === 0 && <p style={{ color: 'var(--text2)', fontSize: 13 }}>Ni ocen</p>}
        {data?.recent.map((r: any) => (
          <div key={r.id} className="item-row" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <div className="item-info">
              <span className="item-name">
                {[1, 2, 3, 4, 5].map(n => <Star key={n} n={n <= r.score ? 1 : 0} />)}
                {' '}{r.customer_name || 'Anonimno'}
              </span>
              <span className="item-desc">{r.comment || '—'}</span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>{new Date(r.created_at).toLocaleDateString('sl-SI')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
