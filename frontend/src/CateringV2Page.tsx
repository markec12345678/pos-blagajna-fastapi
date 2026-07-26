import { useState, useEffect } from 'react'
import * as api from './api'

export default function CateringV2Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'events' | 'menus' | 'logistics'>('events')
  const [events, setEvents] = useState<any>(null)
  const [menus, setMenus] = useState<any>(null)
  const [logistics, setLogistics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/catering-v2/events', { headers: api.h() }).then(r => r.json()).then(setEvents),
      fetch('/api/v1/catering-v2/menus', { headers: api.h() }).then(r => r.json()).then(setMenus),
      fetch('/api/v1/catering-v2/logistics', { headers: api.h() }).then(r => r.json()).then(setLogistics),
    ]).catch(() => onNotify('Napaka pri nalaganju')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'events', label: '🎉 Dogodki', count: events?.total || 0 },
    { key: 'menus', label: '🍽️ Meniji' },
    { key: 'logistics', label: '🚛 Logistika' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">🎉 Catering V2</h2>
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
          {tab === 'events' && events && (
            <div>
              {events.events?.map((e: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8, borderLeft: `4px solid ${e.status === 'confirmed' ? '#22c55e' : '#f59e0b'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontWeight: 600 }}>{e.name}</div>
                    <span style={{ background: e.status === 'confirmed' ? '#dcfce7' : '#fef3c7', color: e.status === 'confirmed' ? '#16a34a' : '#d97706', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{e.status === 'confirmed' ? 'Potrjeno' : 'V čakanju'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666', marginBottom: 4 }}>
                    <span>📅 {e.date}</span>
                    <span>👥 {e.guests} gostov</span>
                    <span>📍 {e.venue}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
                    <span>Skupaj: <b>{e.total.toFixed(0)} €</b></span>
                    <span>Depozit: <b style={{ color: '#22c55e' }}>{e.deposit_paid.toFixed(0)} €</b></span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'menus' && menus && (
            <div>
              {menus.menus?.map((m: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{m.name}</span>
                    <span style={{ fontWeight: 700, color: '#22c55e' }}>{m.price_pp.toFixed(0)} €/osebo</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>
                    {m.items?.map((item: string, j: number) => (
                      <span key={j} style={{ background: '#e5e7eb', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>{item}</span>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>Priljubljenost: {m.popularity}% · Marža: {m.margin}%</div>
                </div>
              ))}
            </div>
          )}

          {tab === 'logistics' && logistics && (
            <div>
              {logistics.upcoming?.map((e: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>{e.event} — {e.date}</div>
                  {e.tasks?.map((t: any, j: number) => (
                    <div key={j} className="card" style={{ padding: 8, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13 }}>{t.task}</span>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: '#666' }}>{t.assigned}</span>
                        <span style={{ background: t.status === 'completed' ? '#dcfce7' : t.status === 'in_progress' ? '#fef3c7' : '#e5e7eb', color: t.status === 'completed' ? '#16a34a' : t.status === 'in_progress' ? '#d97706' : '#666', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{t.status === 'completed' ? '✓' : t.status === 'in_progress' ? '...' : '○'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              <h4 style={{ margin: '16px 0 8px' }}>📦 Oprema</h4>
              <div className="card" style={{ padding: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12 }}>
                  {Object.entries(logistics.equipment_available || {}).map(([k, v]) => (
                    <div key={k} style={{ textAlign: 'center' }}><div style={{ color: '#888' }}>{k}</div><b>{v as number}</b></div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}