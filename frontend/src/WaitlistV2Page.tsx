import { useState, useEffect } from 'react'
import * as api from './api'

export default function WaitlistV2Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'queue' | 'analytics' | 'notifications'>('queue')
  const [queue, setQueue] = useState<any>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [notifications, setNotifications] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/waitlist-v2/queue', { headers: api.h() }).then(r => r.json()).then(setQueue),
      fetch('/api/v1/waitlist-v2/analytics', { headers: api.h() }).then(r => r.json()).then(setAnalytics),
      fetch('/api/v1/waitlist-v2/notifications', { headers: api.h() }).then(r => r.json()).then(setNotifications),
    ]).catch(() => onNotify('Napaka')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'queue', label: '⏳ Vrsta', count: queue?.total || 0 },
    { key: 'analytics', label: '📊 Analitika' },
    { key: 'notifications', label: '📱 Obvestila' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm"><h2 className="page-title">⏳ Čakalna lista V2</h2></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>
            {t.label}{'count' in t && t.count !== undefined && <span style={{ marginLeft: 4, background: 'var(--primary)', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 11 }}>{t.count}</span>}
          </button>
        ))}
      </div>
      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'queue' && queue && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'V vrsti', value: queue.total, color: '#3b82f6' },
                  { label: 'Povp. čakanje', value: `${queue.avg_wait_minutes} min`, color: '#f59e0b' },
                  { label: 'Naslednja prostost', value: queue.estimated_next_available, color: '#22c55e' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {queue.queue?.map((q: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8, borderLeft: `4px solid ${q.status === 'notified' ? '#22c55e' : '#f59e0b'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontWeight: 600 }}>{q.name}</div>
                    <span style={{ background: q.status === 'notified' ? '#dcfce7' : '#fef3c7', color: q.status === 'notified' ? '#16a34a' : '#d97706', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{q.status === 'notified' ? 'Obveščen' : 'Čaka'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                    <span>👥 {q.party_size} gostov</span>
                    <span>⏱️ {q.wait_minutes} min</span>
                    <span>📞 {q.phone}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'analytics' && analytics && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Skupaj gostov', value: analytics.total_guests, color: '#3b82f6' },
                  { label: 'Povp. čakanje', value: `${analytics.avg_wait_minutes} min`, color: '#f59e0b' },
                  { label: 'Prikaz stopnja', value: `${analytics.show_rate}%`, color: '#22c55e' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <h4 style={{ margin: '0 0 8px' }}>⏰ Konverzija po prioritetah</h4>
              {analytics.by_priority?.map((p: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{p.priority}</span>
                    <span>{p.count} gostov</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: 4, height: 6 }}>
                    <div style={{ background: '#3b82f6', height: '100%', borderRadius: 4, width: `${(p.avg_wait / 30) * 100}%` }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Povp. čakanje: {p.avg_wait} min</div>
                </div>
              ))}
            </div>
          )}
          {tab === 'notifications' && notifications && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Poslano', value: notifications.sent_today, color: '#3b82f6' },
                  { label: 'Dostavljeno', value: notifications.delivered, color: '#22c55e' },
                  { label: 'Stopnja', value: `${notifications.delivery_rate}%`, color: '#8b5cf6' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <h4 style={{ margin: '0 0 8px' }}>📱 Po tipu</h4>
              {notifications.by_type?.map((n: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>{n.type}</span>
                  <div style={{ fontSize: 12 }}>
                    {n.count} poslanih · {n.delivery_rate}% dostava
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