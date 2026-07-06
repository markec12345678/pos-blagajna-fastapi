import { useState, useEffect } from 'react'
import * as api from './api'

export default function PopularityPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [days, setDays] = useState(30)
  const [topItems, setTopItems] = useState<any[]>([])
  const [bottomItems, setBottomItems] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [hourly, setHourly] = useState<any[]>([])
  const [dow, setDow] = useState<any[]>([])
  const [tab, setTab] = useState<'top' | 'bottom' | 'hourly' | 'dow' | 'categories'>('top')

  const load = () => {
    fetch(`/api/v1/analytics/top-items?limit=15&days=${days}`, { headers: api.authHeader() }).then(r => r.json()).then(setTopItems).catch(() => {})
    fetch(`/api/v1/analytics/popularity/bottom?limit=10&days=${days}`, { headers: api.authHeader() }).then(r => r.json()).then(setBottomItems).catch(() => {})
    fetch(`/api/v1/analytics/categories?days=${days}`, { headers: api.authHeader() }).then(r => r.json()).then(setCategories).catch(() => {})
    fetch(`/api/v1/analytics/popularity/hourly?days=${days}`, { headers: api.authHeader() }).then(r => r.json()).then(setHourly).catch(() => {})
    fetch(`/api/v1/analytics/popularity/dow?days=${days}`, { headers: api.authHeader() }).then(r => r.json()).then(setDow).catch(() => {})
  }

  useEffect(() => { load() }, [days])

  const maxVal = (arr: any[], key: string) => Math.max(...arr.map(i => i[key]), 1)

  return (
    <div className="page">
      <div className="page-header">
        <h2>📊 Priljubljenost jedi</h2>
        <select className="input" value={days} onChange={e => setDays(parseInt(e.target.value))} style={{ width: 120 }}>
          <option value={7}>Zadnjih 7 dni</option>
          <option value={30}>Zadnjih 30 dni</option>
          <option value={90}>Zadnjih 90 dni</option>
          <option value={365}>Zadnje leto</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={() => setTab('top')} className={`btn btn-sm ${tab === 'top' ? 'btn-primary' : 'btn-ghost'}`}>🏆 Top</button>
        <button onClick={() => setTab('bottom')} className={`btn btn-sm ${tab === 'bottom' ? 'btn-primary' : 'btn-ghost'}`}>📉 Dno</button>
        <button onClick={() => setTab('categories')} className={`btn btn-sm ${tab === 'categories' ? 'btn-primary' : 'btn-ghost'}`}>📁 Kategorije</button>
        <button onClick={() => setTab('hourly')} className={`btn btn-sm ${tab === 'hourly' ? 'btn-primary' : 'btn-ghost'}`}>🕐 Po urah</button>
        <button onClick={() => setTab('dow')} className={`btn btn-sm ${tab === 'dow' ? 'btn-primary' : 'btn-ghost'}`}>📅 Po dnevih</button>
      </div>

      {tab === 'top' && (
        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ marginBottom: 12 }}>🏆 Najbolj prodajane jedi</h3>
          {topItems.map((item, i) => {
            const pct = (item.total / maxVal(topItems, 'total')) * 100
            return (
              <div key={item.name} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 2 }}>
                  <span>{i + 1}. {item.name}</span>
                  <span style={{ fontWeight: 600 }}>{item.total.toFixed(2)} € ({item.quantity}x)</span>
                </div>
                <div style={{ background: 'var(--surface2)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: 'var(--green)', borderRadius: 4, transition: 'width 0.3s' }} />
                </div>
              </div>
            )
          })}
          {topItems.length === 0 && <p style={{ color: 'var(--text2)' }}>Ni podatkov</p>}
        </div>
      )}

      {tab === 'bottom' && (
        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ marginBottom: 12 }}>📉 Najmanj prodajane jedi</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '1px solid var(--border)' }}><th style={{ textAlign: 'left', padding: 8 }}>Jed</th><th style={{ textAlign: 'right', padding: 8 }}>Količina</th><th style={{ textAlign: 'right', padding: 8 }}>Prihodek</th></tr></thead>
            <tbody>
              {bottomItems.map(item => (
                <tr key={item.name} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: 8 }}>{item.name}</td>
                  <td style={{ textAlign: 'right', padding: 8, color: '#f97316' }}>{item.quantity}x</td>
                  <td style={{ textAlign: 'right', padding: 8, fontWeight: 600, color: '#ef4444' }}>{item.total.toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
          {bottomItems.length === 0 && <p style={{ color: 'var(--text2)' }}>Ni podatkov</p>}
        </div>
      )}

      {tab === 'categories' && (
        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ marginBottom: 12 }}>📁 Prodaja po kategorijah</h3>
          {categories.map(c => {
            const pct = (c.sales / maxVal(categories, 'sales')) * 100
            return (
              <div key={c.category} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 2 }}>
                  <span>{c.category}</span>
                  <span style={{ fontWeight: 600 }}>{c.sales.toFixed(2)} € ({c.quantity}x)</span>
                </div>
                <div style={{ display: 'flex', gap: 0, borderRadius: 4, overflow: 'hidden', height: 10 }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: '#8b5cf6', transition: 'width 0.3s' }} />
                </div>
              </div>
            )
          })}
          {categories.length === 0 && <p style={{ color: 'var(--text2)' }}>Ni podatkov</p>}
        </div>
      )}

      {tab === 'hourly' && (
        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ marginBottom: 12 }}>🕐 Prodaja po urah</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 150, padding: '0 8px' }}>
            {hourly.map(h => {
              const pct = (h.sales / maxVal(hourly, 'sales')) * 100
              return (
                <div key={h.hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 9, color: 'var(--text2)', marginBottom: 2 }}>{h.sales > 0 ? `${h.sales.toFixed(0)}€` : ''}</span>
                  <div style={{ width: '100%', height: `${Math.max(pct, 2)}%`, background: '#3b82f6', borderRadius: '3px 3px 0 0', transition: 'height 0.3s', minHeight: 2 }} title={`${h.hour}:00 — ${h.quantity}x (${h.sales.toFixed(2)} €)`} />
                  <span style={{ fontSize: 9, color: 'var(--text2)', marginTop: 2 }}>{h.hour}</span>
                </div>
              )
            })}
          </div>
          {hourly.length === 0 && <p style={{ color: 'var(--text2)' }}>Ni podatkov</p>}
        </div>
      )}

      {tab === 'dow' && (
        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ marginBottom: 12 }}>📅 Prodaja po dnevih v tednu</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 150, padding: '0 8px' }}>
            {dow.map(d => {
              const pct = (d.sales / maxVal(dow, 'sales')) * 100
              return (
                <div key={d.dow} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 9, color: 'var(--text2)', marginBottom: 2 }}>{d.sales > 0 ? `${d.sales.toFixed(0)}€` : ''}</span>
                  <div style={{ width: '100%', height: `${Math.max(pct, 2)}%`, background: '#10b981', borderRadius: '3px 3px 0 0', transition: 'height 0.3s', minHeight: 2 }} title={`${d.day} — ${d.quantity}x (${d.sales.toFixed(2)} €)`} />
                  <span style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2, fontWeight: d.dow === 0 || d.dow === 6 ? 600 : 400 }}>{d.day}</span>
                </div>
              )
            })}
          </div>
          {dow.length === 0 && <p style={{ color: 'var(--text2)' }}>Ni podatkov</p>}
        </div>
      )}
    </div>
  )
}
