import { useState, useEffect } from 'react'
import * as api from './api'

export default function ZReport({ onNotify }: { onNotify: (msg: string) => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo, setDateTo] = useState(today)
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    fetch(`/api/v1/analytics/report?date_from=${dateFrom}&date_to=${dateTo}`, { headers: api.authHeader() })
      .then(r => r.json())
      .then(setReport)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const print = () => {
    if (!report) return
    const w = window.open('', '', 'width=380,height=600')
    if (!w) return
    const isSingle = dateFrom === dateTo
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Courier New', monospace; font-size: 13px; padding: 20px; color: #000; }
      h1 { font-size: 18px; text-align: center; }
      h2 { font-size: 14px; text-align: center; }
      .center { text-align: center; margin-bottom: 4px; }
      hr { border: none; border-top: 1px dashed #999; margin: 10px 0; }
      .row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 12px; }
      .bold { font-weight: bold; }
      .total { font-size: 16px; font-weight: bold; display: flex; justify-content: space-between; margin-top: 8px; }
      .footer { text-align: center; margin-top: 16px; font-size: 11px; color: #666; }
    </style></head><body>
      <h1>${isSingle ? '📊 DNEVNO POROČILO' : '📊 POROČILO ZA OBDOBJE'}</h1>
      <div class="center">${dateFrom}${isSingle ? '' : ` – ${dateTo}`}</div>
      <hr>
      <div class="row bold"><span>Skupaj prodaja:</span><span>${report.total_sales.toFixed(2)} €</span></div>
      <div class="row"><span>Napitnine:</span><span>${report.total_tips.toFixed(2)} €</span></div>
      <div class="row"><span>Število naročil:</span><span>${report.order_count}</span></div>
      <div class="row"><span>Povprečje:</span><span>${report.avg_order.toFixed(2)} €</span></div>
      <hr><h2>Po načinu</h2>
      ${Object.entries(report.by_method).map(([m, v]) => `<div class="row"><span>${m === 'cash' ? '💵 Gotovina' : m === 'card' ? '💳 Kartica' : m === 'mobile' ? '📱 Mobilno' : m}</span><span>${(v as number).toFixed(2)} €</span></div>`).join('')}
      <hr><h2>Najboljši artikli</h2>
      ${report.top_items.slice(0, 5).map((i: any) => `<div class="row"><span>${i.name}</span><span>${i.quantity}x / ${i.total.toFixed(2)} €</span></div>`).join('')}
      <hr>
      <div class="footer">Hvala za obisk!</div>
      <script>window.print();window.close();</script>
    </body></html>`)
    w.document.close()
  }

  const exportCSV = () => {
    if (!report) return
    const rows = [
      ['POROČILO', dateFrom === dateTo ? `Danes: ${dateFrom}` : `Od ${dateFrom} do ${dateTo}`],
      [],
      ['Skupaj prodaja', report.total_sales],
      ['Napitnine', report.total_tips],
      ['Število naročil', report.order_count],
      ['Povprečje', report.avg_order],
      [],
      ['Način plačila', 'Znesek'],
      ...Object.entries(report.by_method).map(([m, v]: [string, any]) => [m, v]),
      [],
      ['Artikel', 'Količina', 'Znesek'],
      ...report.top_items.map((i: any) => [i.name, i.quantity, i.total])
    ]
    const csv = rows.map((r: any[]) => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `porocilo-${dateFrom}${dateTo !== dateFrom ? '-' + dateTo : ''}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const currency = (v: number | undefined | null) => `${(v || 0).toFixed(2)} €`

  return (
    <div className="page-container-sm zreport-page">
      <div className="page-header-sm">
        <h2 className="page-title">📊 Poročilo</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={print} className="btn btn-primary btn-sm" disabled={!report}>🖨️ Natisni</button>
          <button onClick={exportCSV} className="btn btn-sm btn-ghost" disabled={!report}>💾 CSV</button>
        </div>
      </div>

      <div className="card mb-16" style={{ padding: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text2)', display: 'block', marginBottom: 2 }}>Od</label>
            <input type="date" className="input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: 150 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text2)', display: 'block', marginBottom: 2 }}>Do</label>
            <input type="date" className="input" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: 150 }} />
          </div>
          <button onClick={load} className="btn btn-primary btn-sm">{loading ? '⏳' : 'Prikaži'}</button>
          <button onClick={() => { setDateFrom(today); setDateTo(today); setTimeout(load, 0) }} className="btn btn-sm btn-ghost">Danes</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>⏳ Nalaganje...</div>
      ) : !report ? null : (
        <>
          <div className="stat-grid mb-20">
            <div className="stat-card">
              <div className="stat-value green">{currency(report.total_sales)}</div>
              <div className="stat-label">Prodaja</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: 'var(--gold)' }}>{currency(report.total_tips)}</div>
              <div className="stat-label">Napitnine</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{report.order_count}</div>
              <div className="stat-label">Naročil</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: 'var(--blue)' }}>{currency(report.avg_order)}</div>
              <div className="stat-label">Povprečje</div>
            </div>
          </div>

          <div className="card mb-16">
            <h4 className="mb-12">Prodaja po načinu</h4>
            {Object.entries(report.by_method).length === 0 ? (
              <p style={{ color: 'var(--text2)', fontSize: 13 }}>Ni podatkov</p>
            ) : (
              Object.entries(report.by_method).map(([m, v]) => (
                <div key={m} className="zreport-row">
                  <span>{m === 'cash' ? '💵 Gotovina' : m === 'card' ? '💳 Kartica' : '📱 Mobilno'}</span>
                  <span className="zreport-row-label">{(v as number).toFixed(2)} €</span>
                </div>
              ))
            )}
          </div>

          <div className="card mb-16">
            <h4 className="mb-12">Top artikli</h4>
            <table className="zreport-table">
              <thead><tr><th>Artikel</th><th>Količina</th><th>Skupaj</th></tr></thead>
              <tbody>
                {report.top_items.map((item: any, i: number) => (
                  <tr key={i}>
                    <td>{item.name}</td>
                    <td>{item.quantity}</td>
                    <td>{currency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
