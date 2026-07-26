import { useState, useEffect } from 'react'
import * as api from './api'

export default function UsersV2Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'list' | 'permissions' | 'activity' | 'security'>('list')
  const [users, setUsers] = useState<any>(null)
  const [permissions, setPermissions] = useState<any>(null)
  const [activity, setActivity] = useState<any>(null)
  const [security, setSecurity] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/users-v2/list', { headers: api.h() }).then(r => r.json()).then(setUsers),
      fetch('/api/v1/users-v2/permissions', { headers: api.h() }).then(r => r.json()).then(setPermissions),
      fetch('/api/v1/users-v2/activity', { headers: api.h() }).then(r => r.json()).then(setActivity),
      fetch('/api/v1/users-v2/security', { headers: api.h() }).then(r => r.json()).then(setSecurity),
    ]).catch(() => onNotify('Napaka pri nalaganju')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'list', label: '👥 Uporabniki', count: users?.total || 0 },
    { key: 'permissions', label: '🔐 Dovoljenja' },
    { key: 'activity', label: '📊 Aktivnost' },
    { key: 'security', label: '🔒 Varnost' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">👥 Uporabniki V2</h2>
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
          {tab === 'list' && users && (
            <div>
              {users.users?.map((u: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontWeight: 600 }}>{u.name}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ background: u.role === 'admin' ? '#fee2e2' : u.role === 'manager' ? '#fef3c7' : '#dcfce7', color: u.role === 'admin' ? '#dc2626' : u.role === 'manager' ? '#d97706' : '#16a34a', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{u.role}</span>
                      {u.mfa && <span style={{ background: '#dcfce7', color: '#16a34a', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>MFA</span>}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>Zadnji prijava: {u.last_login} · {u.login_count} prijav</div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                    {u.permissions?.map((p: string, j: number) => (
                      <span key={j} style={{ background: '#e5e7eb', padding: '1px 4px', borderRadius: 4, fontSize: 10 }}>{p}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'permissions' && permissions && (
            <div>
              {permissions.roles?.map((r: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{r.role}</span>
                    <span style={{ color: '#888', fontSize: 12 }}>{r.users} uporabnikov</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {r.permissions?.map((p: string, j: number) => (
                      <span key={j} style={{ background: '#dbeafe', color: '#2563eb', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{p}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'activity' && activity && (
            <div>
              {activity.activity?.map((a: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>{a.user}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, fontSize: 12 }}>
                    <div style={{ textAlign: 'center' }}><div style={{ color: '#888', fontSize: 10 }}>Prijave</div><b>{a.logins}</b></div>
                    <div style={{ textAlign: 'center' }}><div style={{ color: '#888', fontSize: 10 }}>Naročila</div><b>{a.orders_created}</b></div>
                    <div style={{ textAlign: 'center' }}><div style={{ color: '#888', fontSize: 10 }}>Spremembe</div><b>{a.orders_modified}</b></div>
                    <div style={{ textAlign: 'center' }}><div style={{ color: '#888', fontSize: 10 }}>Poročila</div><b>{a.reports_viewed}</b></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'security' && security && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'MFA omogočen', value: security.mfa_enabled, color: '#22c55e' },
                  { label: 'MFA onemogočen', value: security.mfa_disabled, color: '#ef4444' },
                  { label: 'Neuspeli prijave', value: security.failed_logins_today, color: '#f59e0b' },
                  { label: 'Aktivne seje', value: security.sessions_active, color: '#3b82f6' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <h4 style={{ margin: '0 0 8px' }}>💡 Priporočila</h4>
              {security.recommendations?.map((r: string, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 4, borderLeft: '4px solid #3b82f6' }}>💡 {r}</div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}