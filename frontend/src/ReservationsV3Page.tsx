import { useState, useEffect } from 'react'
import * as api from './api'

export default function ReservationsV3Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'calendar' | 'preferences' | 'requests' | 'analytics'>('calendar')
  const [calendar, setCalendar] = useState<any>(null)
  const [preferences, setPreferences] = useState<any>(null)
  const [requests, setRequests] = useState<any>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/reservations-v3/calendar', { headers: api.h() }).then(r => r.json()).then(setCalendar),
      fetch('/api/v1/reservations-v3/preferences', { headers: api.h() }).then(r => r.json()).then(setPreferences),
      fetch('/api/v1/reservations-v3/special-requests', { headers: api.h() }).then(r => r.json()).then(setRequests),
      fetch('/api/v1/reservations-v3/analytics', { headers: api.h() }).then(r => r.json()).then(setAnalytics),
    ]).catch(() => onNotify('Napaka')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'calendar', label: '📅 Koledar' },
    { key: 'preferences', label: '⭐ Preference' },
    { key: 'requests', label: '📝 Posebne zahteve' },
    { key: 'analytics', label: '📊 Analitika' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm"><h2 className="page-title">📅 Rezervacije V3</h2></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>{t.label}</button>
        ))}
      </div>
      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'calendar' && calendar && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                {[
                  { label: 'Kapaciteta', value: calendar.capacity.total, color: '#3b82f6' },
                  { label: 'Rezervirano', value: calendar.capacity.reserved, color: '#f59e0b' },
                  { label: 'Prosto', value: calendar.capacity.available, color: '#22c55e' },
                  { label: 'Zasedenost', value: `${calendar.capacity.utilization_pct}%`, color: '#8b5cf6' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888' }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {calendar.today?.map((r: any) => (
                <div key={r.id} className="card" style={{ padding: 14, marginBottom: 8, borderLeft: `4px solid ${r.status === 'seated' ? '#22c55e' : r.vip ? '#f59e0b' : '#3b82f6'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontWeight: 600 }}>{r.time} · {r.name}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {r.vip && <span style={{ background: '#fef3c7', color: '#d97706', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>⭐ VIP</span>}
                      <span style={{ background: r.status === 'seated' ? '#dcfce7' : '#dbeafe', color: r.status === 'seated' ? '#16a34a' : '#2563eb', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{r.status === 'seated' ? 'Sedi' : 'Potrjeno'}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                    <span>👥 {r.party} oseb</span>
                    <span>🪑 {r.table}</span>
                    <span>📝 {r.notes}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'preferences' && preferences && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>VIP stranke</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b' }}>{preferences.vip_customers?.length}</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Redne stranke</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6' }}>{preferences.regular_customers}</div>
                </div>
              </div>
              {preferences.vip_customers?.map((c: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>⭐ {c.name}</span>
                    <span style={{ color: '#f59e0b' }}>💰 {c.avg_spend} €/obisk</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                    <span>🚪 {c.visits} obiskov</span>
                    <span>🪑 {c.favorite_table}</span>
                    <span>📅 {c.last_visit}</span>
                  </div>
                  {c.dietary?.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                      {c.dietary.map((d: string, j: number) => (
                        <span key={j} style={{ background: '#fef3c7', color: '#d97706', padding: '1px 6px', borderRadius: 4, fontSize: 10 }}>🍽️ {d}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {tab === 'requests' && requests && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Čakajoče</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b' }}>{requests.pending}</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Danes zaključene</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>{requests.completed_today}</div>
                </div>
              </div>
              {requests.requests?.map((r: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8, borderLeft: `4px solid ${r.handled ? '#22c55e' : '#f59e0b'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>Rezervacija #{r.reservation_id}</span>
                    <span style={{ background: r.handled ? '#dcfce7' : '#fef3c7', color: r.handled ? '#16a34a' : '#d97706', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{r.handled ? 'Opravljeno' : 'Čaka'}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>📋 {r.type}: {r.description}</div>
                </div>
              ))}
            </div>
          )}
          {tab === 'analytics' && analytics && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Stopnja ne-prikazov', value: `${analytics.no_show_rate}%`, color: '#ef4444' },
                  { label: 'Povp. velikost', value: `${analytics.avg_party_size} oseb`, color: '#3b82f6' },
                  { label: 'Stopnja ponovitev', value: `${analytics.repeat_rate}%`, color: '#22c55e' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Najboljši dan', value: analytics.peak_day, color: '#f59e0b' },
                  { label: 'Najboljši čas', value: analytics.peak_time, color: '#8b5cf6' },
                  { label: 'Povp. vodstvo', value: `${analytics.avg_lead_time_days} dni`, color: '#666' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div className="card" style={{ padding: 14 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>📱 Online vs Telefon</div>
                <div style={{ background: '#e5e7eb', borderRadius: 4, height: 12 }}>
                  <div style={{ background: '#3b82f6', height: '100%', borderRadius: 4, width: `${analytics.online_vs_phone?.online}%`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontWeight: 700 }}>{analytics.online_vs_phone?.online}%</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666', marginTop: 4 }}>
                  <span>📱 Online: {analytics.online_vs_phone?.online}%</span>
                  <span>📞 Telefon: {analytics.online_vs_phone?.phone}%</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}