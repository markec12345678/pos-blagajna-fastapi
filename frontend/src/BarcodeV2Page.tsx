import { useState, useEffect } from 'react'
import * as api from './api'

export default function BarcodeV2Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'scan' | 'products' | 'analytics'>('scan')
  const [scanCode, setScanCode] = useState('')
  const [scanResult, setScanResult] = useState<any>(null)
  const [products, setProducts] = useState<any>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/barcode-v2/products', { headers: api.h() }).then(r => r.json()).then(setProducts),
      fetch('/api/v1/barcode-v2/analytics', { headers: api.h() }).then(r => r.json()).then(setAnalytics),
    ]).catch(() => onNotify('Napaka')).finally(() => setLoading(false))
  }, [])

  const doScan = () => {
    if (!scanCode) return
    fetch(`/api/v1/barcode-v2/scan?code=${encodeURIComponent(scanCode)}`, { headers: api.h() })
      .then(r => r.json()).then(setScanResult).catch(() => onNotify('Napaka'))
  }

  const tabs = [
    { key: 'scan', label: '📱 Skeniraj' },
    { key: 'products', label: '📦 Izdelki', count: products?.total || 0 },
    { key: 'analytics', label: '📊 Analitika' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm"><h2 className="page-title">📱 Črtna koda V2</h2></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>{t.label}</button>
        ))}
      </div>
      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'scan' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input value={scanCode} onChange={e => setScanCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && doScan()} placeholder="Vnesite črno kodo..." style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }} />
                <button onClick={doScan} className="btn btn-primary btn-sm">📱 Skeniraj</button>
              </div>
              {scanResult && (
                <div className={`card`} style={{ padding: 16, borderLeft: `4px solid ${scanResult.found ? '#22c55e' : '#ef4444'}` }}>
                  {scanResult.found ? (
                    <>
                      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>{scanResult.name}</div>
                      <div style={{ fontSize: 13, marginBottom: 4 }}>Kategorija: {scanResult.category}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                        <div>Zaloge: <b style={{ color: scanResult.stock <= scanResult.min_stock ? '#ef4444' : '#22c55e' }}>{scanResult.stock}</b></div>
                        <div>Cena: <b>{scanResult.price} €</b></div>
                        <div>Dobavitelj: {scanResult.supplier}</div>
                        <div>Zadnja dostava: {scanResult.last_received}</div>
                      </div>
                      {scanResult.stock <= scanResult.min_stock && <div style={{ marginTop: 8, color: '#ef4444', fontWeight: 600 }}>⚠️ Nizke zaloge!</div>}
                    </>
                  ) : (
                    <div style={{ color: '#ef4444' }}>❌ {scanResult.message}</div>
                  )}
                </div>
              )}
            </div>
          )}
          {tab === 'products' && products && (
            <div>
              {products.products?.map((p: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                    <span style={{ fontWeight: 600, color: '#22c55e' }}>{p.price} €</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>{p.category} · {p.code}</div>
                  <div style={{ fontSize: 12 }}>Zaloge: <b style={{ color: p.stock <= p.min_stock ? '#ef4444' : '#22c55e' }}>{p.stock}</b> (min: {p.min_stock})</div>
                </div>
              ))}
            </div>
          )}
          {tab === 'analytics' && analytics && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Skeniranj', value: analytics.total_scans, color: '#3b82f6' },
                  { label: 'Izdelkov', value: analytics.unique_products, color: '#22c55e' },
                  { label: 'Opozorila', value: analytics.low_stock_alerts, color: '#ef4444' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <h4 style={{ margin: '0 0 8px' }}>🏆 Najbolj skenirani</h4>
              {analytics.top_products?.map((p: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>#{i + 1} {p.name}</span>
                  <span style={{ color: '#3b82f6' }}>{p.scans}×</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}