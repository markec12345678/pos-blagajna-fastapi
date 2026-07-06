import { useState, useEffect } from 'react'
import * as api from './api'

export default function QRCodePage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tables, setTables] = useState<any[]>([])
  const baseUrl = window.location.origin

  useEffect(() => {
    api.getTables().then(t => setTables(t.filter((x: any) => x.name))).catch(() => {})
  }, [])

  const printQr = () => {
    const styles = document.querySelector('style')?.innerHTML || ''
    const title = document.title
    const html = tables.map(t => `
      <div style="display:inline-block;margin:16px;text-align:center;border:1px solid #ddd;border-radius:8px;padding:12px;page-break-inside:avoid;">
        <div style="font-size:14px;font-weight:700;margin-bottom:8px;">${t.name}</div>
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(baseUrl + '/menu/' + t.id)}" style="width:180px;height:180px;" />
        <div style="font-size:11px;color:#666;margin-top:6px;">${baseUrl}/menu/${t.id}</div>
      </div>
    `).join('')
    const win = window.open('', '_blank')
    if (win) {
      win.document.write(`<html><head><title>QR kode - mize</title><style>${styles}body{padding:24px;background:#fff;}</style></head><body><div style="display:flex;flex-wrap:wrap;">${html}</div></body></html>`)
      win.document.close()
      win.print()
    }
  }

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">🖨️ QR kode za mize</h2>
        <button onClick={printQr} className="btn btn-primary btn-sm" disabled={!tables.length}>🖨️ Natisni vse</button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
        {tables.map(t => (
          <div key={t.id} style={{
            border: '1px solid var(--border)', borderRadius: 12, padding: 16,
            textAlign: 'center', background: 'var(--bg)', width: 220
          }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{t.name}</div>
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(baseUrl + '/menu/' + t.id)}`}
              alt={`QR ${t.name}`} style={{ width: 180, height: 180, borderRadius: 8 }} loading="lazy" />
            <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 8, wordBreak: 'break-all' }}>
              {baseUrl}/menu/{t.id}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
