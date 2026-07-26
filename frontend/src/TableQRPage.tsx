import { useState, useEffect, useRef } from 'react'

interface Table {
  id: number; name: string; is_active: boolean
}

interface QRCode {
  table_id: number; table_name: string; qr_image: string; url: string
}

export default function TableQRPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tables, setTables] = useState<Table[]>([])
  const [qrCodes, setQrCodes] = useState<QRCode[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'generate' | 'print'>('generate')
  const printRef = useRef<HTMLDivElement>(null)

  const headers = { ...JSON.parse(localStorage.getItem('auth') || '{}').headers }

  useEffect(() => { loadTables() }, [])

  const loadTables = async () => {
    try {
      const r = await fetch('/api/v1/tables', { headers }).then(r => r.json())
      setTables(Array.isArray(r) ? r : r.tables || [])
    } catch { onNotify('Napaka pri nalaganju miz') }
  }

  const generateQR = async () => {
    if (selected.size === 0) { onNotify('Izberite mize'); return }
    setLoading(true)
    try {
      const r = await fetch('/api/v1/table-qr/generate', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_ids: Array.from(selected) })
      }).then(r => r.json())
      setQrCodes(r.qr_codes || [])
      setTab('print')
      onNotify(`Generiranih ${r.count} QR kod`)
    } catch { onNotify('Napaka pri generiranju') }
    setLoading(false)
  }

  const toggleAll = () => {
    if (selected.size === tables.length) setSelected(new Set())
    else setSelected(new Set(tables.map(t => t.id)))
  }

  const printQR = () => {
    if (!printRef.current) return
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<html><head><title>QR Kode</title><style>
      body{font-family:sans-serif;padding:20px}
      .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
      .item{text-align:center;border:1px solid #ddd;border-radius:8px;padding:15px;page-break-inside:avoid}
      .name{font-size:18px;font-weight:bold;margin-bottom:8px}
      img{width:150px;height:150px}
      .num{font-size:11px;color:#999;margin-top:4px}
      @media print{.item{border:1px solid #000}}
    </style></head><body><h1>QR Kode za mize</h1><div class="grid">`)
    qrCodes.forEach(qr => {
      w.document.write(`<div class="item"><div class="name">Miza ${qr.table_name}</div><img src="${qr.qr_image}"><div class="num">#${qr.table_id}</div></div>`)
    })
    w.document.write('</div></body></html>')
    w.document.close()
    setTimeout(() => { w.print(); w.close() }, 500)
  }

  const downloadQR = (qr: QRCode) => {
    const a = document.createElement('a')
    a.href = qr.qr_image
    a.download = `qr-miza-${qr.table_name}.png`
    a.click()
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ margin: '0 0 16px' }}>📱 QR Kode za mize</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className={`btn btn-sm ${tab === 'generate' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('generate')}>
          🔧 Generiraj
        </button>
        <button className={`btn btn-sm ${tab === 'print' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('print')}
          disabled={qrCodes.length === 0}>
          🖨️ Tiskaj ({qrCodes.length})
        </button>
      </div>

      {tab === 'generate' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
            <button className="btn btn-sm btn-ghost" onClick={toggleAll}>
              {selected.size === tables.length ? '☐ Odznači vse' : '☑ Označi vse'}
            </button>
            <span style={{ fontSize: 12, color: '#888' }}>{selected.size} izbranih</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
            {tables.map(t => (
              <div key={t.id}
                onClick={() => {
                  const next = new Set(selected)
                  if (next.has(t.id)) next.delete(t.id)
                  else next.add(t.id)
                  setSelected(next)
                }}
                style={{
                  background: selected.has(t.id) ? '#e0f2fe' : 'var(--card, #fff)',
                  border: selected.has(t.id) ? '2px solid #3b82f6' : '2px solid transparent',
                  borderRadius: 10, padding: 14, textAlign: 'center', cursor: 'pointer',
                  opacity: t.is_active ? 1 : 0.5
                }}>
                <div style={{ fontSize: 28 }}>🪑</div>
                <div style={{ fontWeight: 600 }}>{t.name}</div>
                <div style={{ fontSize: 11, color: '#888' }}>ID: {t.id}</div>
              </div>
            ))}
          </div>

          <button onClick={generateQR} className="btn btn-primary" style={{ marginTop: 16 }}
            disabled={selected.size === 0 || loading}>
            {loading ? '⏳ Generiram...' : `📱 Generiraj QR za ${selected.size} miz`}
          </button>
        </div>
      )}

      {tab === 'print' && (
        <div>
          {qrCodes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
              Ni QR kod za tiskanje. Najprej generirajte.
            </div>
          ) : (
            <div ref={printRef}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                {qrCodes.map(qr => (
                  <div key={qr.table_id} style={{
                    background: 'var(--card, #fff)', borderRadius: 12, padding: 16, textAlign: 'center',
                    border: '1px solid #eee'
                  }}>
                    <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Miza {qr.table_name}</div>
                    <img src={qr.qr_image} alt={`QR miza ${qr.table_name}`}
                      style={{ width: 160, height: 160, margin: '8px 0' }} />
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>Skenirajte za naročilo</div>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      <button onClick={() => downloadQR(qr)} className="btn btn-sm btn-ghost">⬇️</button>
                      <button onClick={() => {
                        const url = `${window.location.origin}/table-order/${qr.table_id}`
                        navigator.clipboard.writeText(url)
                        onNotify('URL kopiran!')
                      }} className="btn btn-sm btn-ghost">📋</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {qrCodes.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={printQR} className="btn btn-primary">🖨️ Tiskaj vse</button>
              <button onClick={() => {
                qrCodes.forEach(qr => downloadQR(qr))
              }} className="btn btn-ghost">⬇️ Prenesi vse</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
