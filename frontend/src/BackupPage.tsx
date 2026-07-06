import { useState, useEffect } from 'react'
import * as api from './api'

export default function BackupPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [restoring, setRestoring] = useState(false)
  const [backups, setBackups] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<any>({})
  const [showSettings, setShowSettings] = useState(false)
  const [cloudTab, setCloudTab] = useState(false)
  const [cloudSettings, setCloudSettings] = useState<any>({})
  const [cloudFiles, setCloudFiles] = useState<any[]>([])
  const [cloudSaving, setCloudSaving] = useState(false)

  const load = async () => {
    try { const r = await fetch('/api/v1/backup/list', { headers: api.authHeader() }).then(r => r.json()); setBackups(r) } catch {}
    try { const s = await fetch('/api/v1/settings', { headers: api.authHeader() }).then(r => r.json()); setSettings(s) } catch {}
    try { const c = await fetch('/api/v1/backup/cloud/settings', { headers: api.authHeader() }).then(r => r.json()); setCloudSettings(c) } catch {}
    try { const f = await fetch('/api/v1/backup/cloud/list', { headers: api.authHeader() }).then(r => r.json()); setCloudFiles(f) } catch {}
  }

  useEffect(() => { load() }, [])

  const exportBackup = async () => {
    const r = await fetch('/api/v1/backup', { headers: api.authHeader() })
    const blob = await r.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `pos-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click()
    URL.revokeObjectURL(url)
    onNotify('Backup izvožen')
  }

  const createAutoBackup = async () => {
    setLoading(true)
    try { const r = await fetch('/api/v1/backup/auto', { method: 'POST', headers: api.authHeader() }).then(r => r.json()); onNotify(`✅ Backup ustvarjen: ${r.size_kb} KB`); load() }
    catch { onNotify('❌ Napaka') }
    setLoading(false)
  }

  const importBackup = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      if (!confirm('Obnovitev bo ZBRISALA vse obstoječe podatke! Nadaljujem?')) return
      setRestoring(true)
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        const r = await fetch('/api/v1/backup/restore', {
          method: 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: text
        })
        if (!r.ok) throw new Error('Napaka pri obnovitvi')
        onNotify('✅ Podatki obnovljeni!')
        window.location.reload()
      } catch (e: any) { onNotify('❌ ' + e.message) }
      setRestoring(false)
    }
    input.click()
  }

  const set = (key: string, value: string) => {
    setSettings((s: any) => ({ ...s, [key]: value }))
  }

  const saveSettings = async () => {
    try {
      await fetch('/api/v1/settings', { method: 'PUT', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({
        enable_auto_backup: settings.enable_auto_backup, backup_interval_hours: settings.backup_interval_hours, backup_retention_days: settings.backup_retention_days
      }) })
      onNotify('Nastavitve shranjene')
    } catch { onNotify('❌ Napaka') }
  }

  const downloadBackup = async (name: string) => {
    const r = await fetch(`/api/v1/backup/download/${name}`, { headers: api.authHeader() })
    const blob = await r.blob()
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url)
  }

  const saveCloudSettings = async () => {
    setCloudSaving(true)
    try {
      await fetch('/api/v1/backup/cloud/settings', { method: 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({
        cloud_provider: cloudSettings.cloud_provider,
        cloud_s3_endpoint: cloudSettings.s3_endpoint,
        cloud_s3_bucket: cloudSettings.s3_bucket,
        cloud_s3_access_key: cloudSettings.s3_access_key,
        cloud_s3_secret_key: cloudSettings.s3_secret_key,
        cloud_s3_region: cloudSettings.s3_region,
        cloud_gdrive_token: cloudSettings.gdrive_token,
        cloud_gdrive_folder: cloudSettings.gdrive_folder,
      }) })
      onNotify('☁️ Cloud nastavitve shranjene')
    } catch { onNotify('❌ Napaka') }
    setCloudSaving(false)
  }

  const cloudUpload = async () => {
    const r = await fetch('/api/v1/backup/cloud/upload', { method: 'POST', headers: api.authHeader() }).then(r => r.json())
    if (r.ok) { onNotify(`☁️ Naloženo v oblak (${r.provider})`); load() }
    else onNotify('❌ Napaka pri nalaganju')
  }

  const cloudDownload = async (key: string, name: string) => {
    const r = await fetch(`/api/v1/backup/cloud/download/${encodeURIComponent(key)}`, { method: 'POST', headers: api.authHeader() }).then(r => r.json())
    if (r.ok) { onNotify(`📥 Preneseno: ${r.name}`); load() }
    else onNotify('❌ Napaka pri prenosu')
  }

  return (
    <div className="backup-page">
      <h2 className="mb-24">💾 Backup & Obnovitev</h2>

      <div className="card mb-16" style={{ padding: 16 }}>
        <h4 className="mb-8">⏰ Samodejni backup</h4>
        <button onClick={() => setShowSettings(!showSettings)} className="btn btn-sm btn-ghost" style={{ marginBottom: 8 }}>
          {showSettings ? 'Skrij' : 'Pokaži'} nastavitve
        </button>
        {showSettings && (
          <div style={{ marginBottom: 12 }}>
            <div className="settings-field" style={{ marginBottom: 6 }}>
              <label>Omogoči samodejni backup</label>
              <select className="input" value={settings.enable_auto_backup || 'false'} onChange={e => set('enable_auto_backup', e.target.value)} style={{ width: 100 }}>
                <option value="false">Ne</option>
                <option value="true">Da</option>
              </select>
            </div>
            <div className="settings-field" style={{ marginBottom: 6 }}>
              <label>Interval (ure)</label>
              <input className="input" type="number" step="1" min="1" value={settings.backup_interval_hours || '6'} onChange={e => set('backup_interval_hours', e.target.value)} style={{ width: 80 }} />
            </div>
            <div className="settings-field" style={{ marginBottom: 6 }}>
              <label>Ohrani (dni)</label>
              <input className="input" type="number" step="1" min="1" value={settings.backup_retention_days || '30'} onChange={e => set('backup_retention_days', e.target.value)} style={{ width: 80 }} />
            </div>
            <button onClick={saveSettings} className="btn btn-sm btn-primary">Shrani nastavitve</button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={createAutoBackup} disabled={loading} className="btn btn-primary btn-sm">📦 Ustvari backup zdaj</button>
          <button onClick={exportBackup} className="btn btn-sm btn-blue">📥 Prenesi</button>
        </div>
      </div>

      <div className="card mb-16" style={{ padding: 16 }}>
        <h4 className="mb-8">📂 Shranjeni backupi ({backups.length})</h4>
        {backups.length === 0 ? (
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>Ni shranjenih backupov</p>
        ) : (
          backups.slice(0, 20).map(b => (
            <div key={b.name} className="item-row" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <div className="item-info">
                <span className="item-name" style={{ fontSize: 13 }}>{b.name}</span>
                <span className="item-desc" style={{ fontSize: 11 }}>{b.size_kb} KB • {new Date(b.created_at).toLocaleString('sl-SI')}</span>
              </div>
              <button onClick={() => downloadBackup(b.name)} className="btn btn-xs btn-ghost">📥</button>
            </div>
          ))
        )}
      </div>

      <div className="card mb-16" style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h4 style={{ margin: 0 }}>☁️ Cloud backup</h4>
          <button onClick={() => setCloudTab(!cloudTab)} className="btn btn-sm btn-ghost">
            {cloudTab ? 'Skrij' : 'Nastavitve'}
          </button>
        </div>

        {cloudTab && (
          <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <select className="input" style={{ width: 200 }}
              value={cloudSettings.cloud_provider || 'none'}
              onChange={e => setCloudSettings({ ...cloudSettings, cloud_provider: e.target.value })}>
              <option value="none">Brez oblaka</option>
              <option value="s3">S3 (AWS / MinIO)</option>
              <option value="gdrive">Google Drive</option>
            </select>

            {cloudSettings.cloud_provider === 's3' && (
              <>
                <input className="input" placeholder="Endpoint (npr. https://s3.eu-central-1.amazonaws.com)" value={cloudSettings.s3_endpoint || ''} onChange={e => setCloudSettings({ ...cloudSettings, s3_endpoint: e.target.value })} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="input" placeholder="Bucket" value={cloudSettings.s3_bucket || ''} onChange={e => setCloudSettings({ ...cloudSettings, s3_bucket: e.target.value })} style={{ flex: 1 }} />
                  <input className="input" placeholder="Region" value={cloudSettings.s3_region || 'us-east-1'} onChange={e => setCloudSettings({ ...cloudSettings, s3_region: e.target.value })} style={{ width: 120 }} />
                </div>
                <input className="input" placeholder="Access Key" value={cloudSettings.s3_access_key || ''} onChange={e => setCloudSettings({ ...cloudSettings, s3_access_key: e.target.value })} />
                <input className="input" type="password" placeholder="Secret Key" value={cloudSettings.s3_secret_key || ''} onChange={e => setCloudSettings({ ...cloudSettings, s3_secret_key: e.target.value })} />
              </>
            )}

            {cloudSettings.cloud_provider === 'gdrive' && (
              <>
                <input className="input" type="password" placeholder="Google Drive Access Token" value={cloudSettings.gdrive_token || ''} onChange={e => setCloudSettings({ ...cloudSettings, gdrive_token: e.target.value })} />
                <input className="input" placeholder="Folder ID (prazno = root)" value={cloudSettings.gdrive_folder || ''} onChange={e => setCloudSettings({ ...cloudSettings, gdrive_folder: e.target.value })} />
              </>
            )}

            {cloudSettings.cloud_provider !== 'none' && (
              <>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={saveCloudSettings} disabled={cloudSaving} className="btn btn-sm btn-primary">💾 Shrani</button>
                  <button onClick={cloudUpload} className="btn btn-sm btn-blue">☁️ Naloži backup v oblak</button>
                </div>

                {cloudFiles.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Datoteke v oblaku ({cloudFiles.length})</div>
                    {cloudFiles.slice(0, 10).map(f => (
                      <div key={f.key || f.name} className="item-row" style={{ padding: '4px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12 }}>{f.name || f.key} <span style={{ color: 'var(--text2)' }}>({f.size_kb} KB)</span></span>
                        <button onClick={() => cloudDownload(f.key || f.name, f.name || f.key)} className="btn btn-xs btn-ghost">📥</button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="card backup-warning" style={{ padding: 16 }}>
        <h4>⚠️ Obnovitev podatkov</h4>
        <p className="backup-help" style={{ fontSize: 13, marginBottom: 8 }}>
          Pozor! Obnovitev bo ZAMENJALA vse obstoječe podatke z vsebino backup datoteke.
        </p>
        <button onClick={importBackup} disabled={restoring} className="btn btn-danger">
          {restoring ? 'Obnavljam...' : '📂 Obnovi iz datoteke'}
        </button>
      </div>
    </div>
  )
}
