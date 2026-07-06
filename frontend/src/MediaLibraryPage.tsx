import { useState, useEffect } from 'react'
import * as api from './api'

export default function MediaLibraryPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/v1/media/list', { headers: api.authHeader() })
      if (r.ok) setFiles(await r.json())
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) { onNotify('Samo slike so dovoljene'); return }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch('/api/v1/media/upload', {
        method: 'POST', body: fd, headers: api.authHeader(true)
      })
      if (!r.ok) { onNotify('Napaka pri nalaganju'); return }
      const d = await r.json()
      onNotify(`Slika "${d.name}" naložena (${(d.size / 1024).toFixed(0)} KB)`)
      load()
    } catch { onNotify('❌ Napaka') }
    setUploading(false)
  }

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(window.location.origin + url)
      onNotify('URL kopiran')
    } catch {
      const ta = document.createElement('textarea')
      ta.value = window.location.origin + url
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      onNotify('URL kopiran')
    }
  }

  const deleteFile = async (name: string) => {
    if (!confirm(`Izbriši "${name}"?`)) return
    try {
      await fetch(`/api/v1/media/${name}`, { method: 'DELETE', headers: api.authHeader() })
      onNotify(`"${name}" izbrisana`)
      load()
    } catch { onNotify('❌ Napaka') }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>🖼️ Medijska knjižnica</h2>
        <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer', position: 'relative' }}>
          {uploading ? 'Nalaganje...' : '+ Naloži sliko'}
          <input type="file" accept="image/*" hidden disabled={uploading}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = '' }} />
        </label>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text2)' }}>Nalaganje...</p>
      ) : files.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🖼️</div>
          <p>Ni naloženih slik. Kliknite "Naloži sliko" za začetek.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {files.map(f => (
            <div key={f.name} style={{
              border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden',
              background: 'var(--surface)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
            }}>
              <div style={{
                width: '100%', height: 140, background: 'var(--bg2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', cursor: 'pointer'
              }} onClick={() => window.open(f.url, '_blank')}>
                <img src={f.url} alt={f.name} style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                  transition: 'transform 0.2s'
                }} onMouseOver={e => (e.target as HTMLElement).style.transform = 'scale(1.05)'}
                  onMouseOut={e => (e.target as HTMLElement).style.transform = 'scale(1)'} />
              </div>
              <div style={{ padding: '8px 10px' }}>
                <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.name}>{f.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{formatSize(f.size)}</div>
                <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                  <button onClick={() => copyUrl(f.url)} className="btn btn-xs btn-ghost" title="Kopiraj URL" style={{ flex: 1, fontSize: 10 }}>📋 URL</button>
                  <button onClick={() => deleteFile(f.name)} className="btn btn-xs btn-ghost" title="Izbriši" style={{ color: '#ef4444', fontSize: 10 }}>🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 12, textAlign: 'center' }}>
          Skupaj: {files.length} {files.length === 1 ? 'datoteka' : 'datotek'} • {formatSize(files.reduce((s, f) => s + f.size, 0))}
        </div>
      )}
    </div>
  )
}
