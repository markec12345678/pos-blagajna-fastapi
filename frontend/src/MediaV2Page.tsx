import { useState, useEffect } from 'react'
import * as api from './api'

export default function MediaV2Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'gallery' | 'uploads' | 'analytics'>('gallery')
  const [gallery, setGallery] = useState<any>(null)
  const [uploads, setUploads] = useState<any>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/media-v2/gallery', { headers: api.h() }).then(r => r.json()).then(setGallery),
      fetch('/api/v1/media-v2/uploads', { headers: api.h() }).then(r => r.json()).then(setUploads),
      fetch('/api/v1/media-v2/analytics', { headers: api.h() }).then(r => r.json()).then(setAnalytics),
    ]).catch(() => onNotify('Napaka')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'gallery', label: '🖼️ Galerija', count: gallery?.total || 0 },
    { key: 'uploads', label: '📤 Nalaganja' },
    { key: 'analytics', label: '📊 Analitika' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm"><h2 className="page-title">🖼️ Mediji V2</h2></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>
            {t.label}{'count' in t && t.count !== undefined && <span style={{ marginLeft: 4, background: 'var(--primary)', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 11 }}>{t.count}</span>}
          </button>
        ))}
      </div>
      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'gallery' && gallery && (
            <div>
              {gallery.media?.map((m: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontWeight: 600 }}>{m.name}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ background: '#e5e7eb', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{m.type}</span>
                      {m.featured && <span style={{ background: '#fef3c7', color: '#d97706', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>⭐</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                    <span>📁 {m.category}</span>
                    <span>📦 {m.size_kb} KB</span>
                    <span>👁️ {m.views} ogledov</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{m.uploaded}</div>
                </div>
              ))}
            </div>
          )}
          {tab === 'uploads' && uploads && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Datoteke', value: uploads.total_files, color: '#3b82f6' },
                  { label: 'Velikost', value: `${uploads.total_size_mb} MB`, color: '#f59e0b' },
                  { label: 'Slike', value: uploads.images, color: '#22c55e' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {uploads.by_month?.map((m: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>{m.month}</span>
                  <div style={{ fontSize: 12 }}>{m.count} datotek · {m.size_mb} MB</div>
                </div>
              ))}
            </div>
          )}
          {tab === 'analytics' && analytics && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Ogledov', value: analytics.total_views, color: '#3b82f6' },
                  { label: 'Povp. na datoteko', value: analytics.avg_views_per_file, color: '#8b5cf6' },
                  { label: 'Izpostavljene', value: analytics.featured_count, color: '#f59e0b' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {analytics.by_category?.map((c: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>{c.category}</span>
                  <div style={{ fontSize: 12 }}>{c.count} datotek · {c.views} ogledov</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}