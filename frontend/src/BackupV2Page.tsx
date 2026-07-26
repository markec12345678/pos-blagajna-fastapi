import { useState, useEffect } from 'react'
import * as api from './api'

export default function BackupV2Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'list' | 'schedule' | 'storage'>('list')
  const [list, setList] = useState<any>(null)
  const [schedule, setSchedule] = useState<any>(null)
  const [storage, setStorage] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/backup-v2/list', { headers: api.h() }).then(r => r.json()).then(setList),
      fetch('/api/v1/backup-v2/schedule', { headers: api.h() }).then(r => r.json()).then(setSchedule),
      fetch('/api/v1/backup-v2/storage', { headers: api.h() }).then(r => r.json()).then(setStorage),
    ]).catch(() => onNotify('Napaka')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'list', label: '💾 Backupi', count: list?.total || 0 },
    { key: 'schedule', label: '📅 Raspored' },
    { key: 'storage', label: '🗄️ Shranjevanje' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm"><h2 className="page-title">💾 Backup V2</h2></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>{t.label}</button>
        ))}
      </div>
      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'list' && list && (
            <div>
              {list.backups?.map((b: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontWeight: 600 }}>{b.name}</div>
                    <span style={{ background: '#dcfce7', color: '#16a34a', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{b.status}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                    <span>📦 {b.size_mb} MB</span>
                    <span>⏱️ {b.duration_sec}s</span>
                    <span>{b.verified ? '✅ Verificiran' : '⏳ Čaka verifikacijo'}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{b.created}</div>
                </div>
              ))}
            </div>
          )}
          {tab === 'schedule' && schedule && (
            <div>
              {schedule.schedules?.map((s: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                    <span style={{ background: s.enabled ? '#dcfce7' : '#fee2e2', color: s.enabled ? '#16a34a' : '#dc2626', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{s.enabled ? 'Vklopljen' : 'Izklopljen'}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>Frekvenca: {s.frequency} · Ob {s.time} · Retencija: {s.retention_days} dni</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Zadnji: {s.last_run}</div>
                </div>
              ))}
              <div className="card" style={{ padding: 14, marginTop: 8, textAlign: 'center' }}>Naslednji backup: <b>{schedule.next_backup}</b></div>
            </div>
          )}
          {tab === 'storage' && storage && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Skupaj', value: `${storage.total_space_gb} GB`, color: '#3b82f6' },
                  { label: 'Zasedeno', value: `${storage.used_gb} GB`, color: '#f59e0b' },
                  { label: 'Na voljo', value: `${storage.available_gb} GB`, color: '#22c55e' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div className="card" style={{ padding: 14, marginBottom: 8 }}>
                <div style={{ marginBottom: 6 }}>Zasedenost: {storage.usage_pct}%</div>
                <div style={{ background: '#e5e7eb', borderRadius: 4, height: 8 }}>
                  <div style={{ background: '#3b82f6', height: '100%', borderRadius: 4, width: `${storage.usage_pct}%` }} />
                </div>
              </div>
              <div className="card" style={{ padding: 14 }}>
                <div style={{ fontSize: 12 }}>☁️ Cloud sync: <b>{storage.cloud_sync ? 'Da' : 'Ne'}</b> · 🔒 Šifriranje: <b>{storage.encryption}</b></div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}