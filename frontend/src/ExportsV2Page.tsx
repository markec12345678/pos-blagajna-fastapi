import { useState, useEffect } from 'react'
import * as api from './api'

export default function ExportsV2Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'templates' | 'recent' | 'categories'>('templates')
  const [templates, setTemplates] = useState<any>(null)
  const [recent, setRecent] = useState<any>(null)
  const [categories, setCategories] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/exports-v2/templates', { headers: api.h() }).then(r => r.json()).then(setTemplates),
      fetch('/api/v1/exports-v2/recent', { headers: api.h() }).then(r => r.json()).then(setRecent),
      fetch('/api/v1/exports-v2/categories', { headers: api.h() }).then(r => r.json()).then(setCategories),
    ]).catch(() => onNotify('Napaka')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'templates', label: '📋 Predloge', count: templates?.total || 0 },
    { key: 'recent', label: '📤 Nedavni', count: recent?.total || 0 },
    { key: 'categories', label: '📁 Kategorije' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm"><h2 className="page-title">📤 Izvoz V2</h2></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>
            {t.label}{'count' in t && t.count !== undefined && <span style={{ marginLeft: 4, background: 'var(--primary)', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 11 }}>{t.count}</span>}
          </button>
        ))}
      </div>
      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'templates' && templates && (
            <div>
              {templates.templates?.map((t: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontWeight: 600 }}>{t.name}</div>
                    <span style={{ background: '#dbeafe', color: '#2563eb', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{t.format}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{t.description}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>Kategorija: {t.category} · Uporab: {t.uses} · Nazadnje: {t.last_used}</div>
                </div>
              ))}
            </div>
          )}
          {tab === 'recent' && recent && (
            <div>
              {recent.exports?.map((e: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontWeight: 600 }}>{e.name}</div>
                    <span style={{ background: '#dcfce7', color: '#16a34a', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{e.format}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                    <span>📦 {e.size_kb} KB</span>
                    <span>{e.created}</span>
                    <span>{e.downloaded ? '✅ Preneseno' : '⏳ Čaka'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'categories' && categories && (
            <div>
              {categories.categories?.map((c: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{c.label}</span>
                    <span style={{ color: '#888' }}>{c.count} predlog</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {c.formats?.map((f: string, j: number) => (
                      <span key={j} style={{ background: '#e5e7eb', padding: '1px 6px', borderRadius: 4, fontSize: 10 }}>{f}</span>
                    ))}
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