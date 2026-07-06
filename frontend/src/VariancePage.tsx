import { useState, useEffect } from 'react'
import * as api from './api'

export default function VariancePage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [data, setData] = useState<any>(null)
  const [days, setDays] = useState(7)

  useEffect(() => {
    fetch(`/api/v1/inventory/variance?days=${days}`, { headers: api.authHeader() })
      .then(r => r.json()).then(setData)
  }, [days])

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">📊 Inventurna odstopanja</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {[1, 7, 14, 30].map(d => (
            <button key={d} onClick={() => setDays(d)} className={`btn btn-sm ${days === d ? 'btn-primary' : 'btn-ghost'}`}>
              {d} dni
            </button>
          ))}
        </div>
      </div>

      <div className="stat-grid mb-16" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-value">{data?.items?.length || 0}</div>
          <div className="stat-label">Sestavin s prodajo</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--red)' }}>{data?.total_cost_impact?.toFixed(2)} €</div>
          <div className="stat-label">Vrednost odstopanj</div>
        </div>
      </div>

      <div className="card">
        {!data?.items?.length ? (
          <p style={{ color: 'var(--text2)', padding: 16, textAlign: 'center' }}>Ni dovolj podatkov za izračun odstopanj</p>
        ) : (
          <table className="zreport-table" style={{ width: '100%', fontSize: 13 }}>
            <thead>
              <tr>
                <th>Sestavina</th>
                <th>Teoretična</th>
                <th>Dejanska</th>
                <th>Odstopanje</th>
                <th>%</th>
                <th>Strošek</th>
              </tr>
            </thead>
            <tbody>
              {data.items.filter((r: any) => r.variance !== 0).map((r: any) => (
                <tr key={r.ingredient_id}>
                  <td>{r.ingredient_name}</td>
                  <td>{r.theoretical} {r.unit}</td>
                  <td>{r.actual} {r.unit}</td>
                  <td style={{ color: r.variance > 0 ? 'var(--red)' : 'var(--green)', fontWeight: 600 }}>
                    {r.variance > 0 ? '+' : ''}{r.variance} {r.unit}
                  </td>
                  <td style={{ color: r.variance_pct > 10 ? 'var(--red)' : 'var(--green)' }}>
                    {r.variance_pct > 0 ? '+' : ''}{r.variance_pct}%
                  </td>
                  <td>{r.cost_impact.toFixed(2)} €</td>
                </tr>
              ))}
              {data.items.filter((r: any) => r.variance !== 0).length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text2)' }}>Vse sestavine se ujemajo</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
