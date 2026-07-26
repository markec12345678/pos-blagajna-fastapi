import { useState, useEffect } from 'react'
import * as api from './api'

export default function ReservationsV2Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'calendar' | 'availability' | 'waitlist' | 'requests' | 'stats'>('calendar')
  const [calendar, setCalendar] = useState<any>(null)
  const [availability, setAvailability] = useState<any>(null)
  const [waitlist, setWaitlist] = useState<any>(null)
  const [requests, setRequests] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/reservations-v2/calendar', { headers: api.h() }).then(r => r.json()).then(setCalendar),
      fetch('/api/v1/reservations-v2/availability', { headers: api.h() }).then(r => r.json()).then(setAvailability),
      fetch('/api/v1/reservations-v2/waitlist', { headers: api.h() }).then(r => r.json()).then(setWaitlist),
      fetch('/api/v1/reservations-v2/special-requests', { headers: api.h() }).then(r => r.json()).then(setRequests),
      fetch('/api/v1/reservations-v2/stats', { headers: api.h() }).then(r => r.json()).then(setStats),
    ]).catch(() => onNotify('Napaka pri nalaganju')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'calendar', label: '📅 Koledar', count: calendar?.total || 0 },
    { key: 'availability', label: '🕐 Razpoložljivost' },
    { key: 'waitlist', label: '⏳ Čakalna lista', count: waitlist?.total || 0 },
    { key: 'requests', label: '⭐ Posebne zahteve', count: requests?.pending || 0 },
    { key: 'stats', label: '📊 Statistika' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">📅 Rezervacije V2</h2>
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
          {tab === 'calendar' && calendar && (
            <div>
              {calendar.reservations?.map((r: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8, borderLeft: `4px solid ${r.status === 'confirmed' ? '#22c55e' : '#f59e0b'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontWeight: 600 }}>{r.time} — {r.name}</div>
                    <span style={{ background: r.status === 'confirmed' ? '#dcfce7' : '#fef3c7', color: r.status === 'confirmed' ? '#16a34a' : '#d97706', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{r.status === 'confirmed' ? 'Potrjena' : 'V čakanju'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#666', marginBottom: 4 }}>
                    <span>👥 {r.guests} gostov</span>
                    <span>🪑 {r.table}</span>
                    {r.deposit > 0 && <span>💰 {r.deposit} € depozit</span>}
                  </div>
                  {r.special_requests && <div style={{ fontSize: 12, color: '#8b5cf6', fontStyle: 'italic' }}>📝 {r.special_requests}</div>}
                </div>
              ))}
            </div>
          )}

          {tab === 'availability' && availability && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Datum', value: availability.date },
                  { label: 'Ura', value: availability.time },
                  { label: 'Gostov', value: availability.party_size },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888' }}>{s.label}</div>
                    <div style={{ fontWeight: 600 }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {availability.available_slots?.map((slot: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>{slot.time}</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {slot.tables?.map((t: string, j: number) => (
                      <span key={j} style={{ background: '#e5e7eb', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>{t}</span>
                    ))}
                    <span style={{ background: slot.available ? '#dcfce7' : '#fee2e2', color: slot.available ? '#16a34a' : '#dc2626', padding: '2px 8px', borderRadius: 8, fontSize: 10 }}>{slot.available ? 'Na voljo' : 'Zasedeno'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'waitlist' && waitlist && (
            <div>
              {waitlist.waitlist?.map((w: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontWeight: 600 }}>{w.name}</div>
                    <span style={{ background: w.priority === 'high' ? '#fee2e2' : w.priority === 'medium' ? '#fef3c7' : '#e5e7eb', color: w.priority === 'high' ? '#dc2626' : w.priority === 'medium' ? '#d97706' : '#666', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{w.priority}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    {w.guests} gostov · {w.preferred_date} {w.preferred_time} · {w.phone}
                  </div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Čaka od: {w.waitlisted_since}</div>
                </div>
              ))}
            </div>
          )}

          {tab === 'requests' && requests && (
            <div>
              {requests.requests?.map((r: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8, borderLeft: `4px solid ${r.status === 'completed' ? '#22c55e' : r.status === 'in_progress' ? '#f59e0b' : '#3b82f6'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontWeight: 600 }}>{r.guest_name}</div>
                    <span style={{ background: r.status === 'completed' ? '#dcfce7' : r.status === 'in_progress' ? '#fef3c7' : '#dbeafe', color: r.status === 'completed' ? '#16a34a' : r.status === 'in_progress' ? '#d97706' : '#2563eb', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{r.status === 'completed' ? 'Končano' : r.status === 'in_progress' ? 'V teku' : 'Čaka'}</span>
                  </div>
                  <div style={{ fontSize: 13, marginBottom: 4 }}>📝 {r.request}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>Datum: {r.date} · {r.assigned_to}</div>
                </div>
              ))}
            </div>
          )}

          {tab === 'stats' && stats && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Rezervacij', value: stats.total_reservations, color: '#3b82f6' },
                  { label: 'Povp. gostov', value: stats.avg_party_size, color: '#8b5cf6' },
                  { label: 'Prikaz stopnja', value: `${stats.show_rate}%`, color: '#22c55e' },
                  { label: 'No-show', value: `${stats.no_show_rate}%`, color: '#ef4444' },
                  { label: 'Odpovedi', value: `${stats.cancellation_rate}%`, color: '#f59e0b' },
                  { label: 'Depoziti', value: `${stats.deposits_collected} €`, color: '#22c55e' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <h4 style={{ margin: '0 0 8px' }}>📅 Po dnevih</h4>
              {stats.by_day?.map((d: any, i: number) => (
                <div key={i} className="card" style={{ padding: 8, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: 13, width: 100 }}>{d.day}</span>
                  <div style={{ flex: 1, margin: '0 12px', background: '#e5e7eb', borderRadius: 4, height: 8 }}>
                    <div style={{ background: '#3b82f6', height: '100%', borderRadius: 4, width: `${(d.count / 52) * 100}%` }} />
                  </div>
                  <span style={{ fontSize: 12, width: 40, textAlign: 'right' }}>{d.count}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}