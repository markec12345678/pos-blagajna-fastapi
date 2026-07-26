import React, { useState, useEffect } from 'react'
import { authHeader } from './api'
import { useTranslation } from './i18n'

export default function FinanceV5Page({ onNotify }: { onNotify: (m: string) => void }) {
  const { t } = useTranslation()
  const [cashflow, setCashflow] = useState<any>(null)
  const [forecast, setForecast] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [profitability, setProfitability] = useState<any[]>([])
  const [tax, setTax] = useState<any>(null)
  const [investments, setInvestments] = useState<any[]>([])
  const [variance, setVariance] = useState<any>(null)
  const [tab, setTab] = useState('cashflow')

  useEffect(() => {
    fetch('/api/v1/finance-v5/cashflow', { headers: authHeader() }).then(r => r.json()).then(d => setCashflow(d)).catch(() => {})
    fetch('/api/v1/finance-v5/forecast', { headers: authHeader() }).then(r => r.json()).then(d => setForecast(d)).catch(() => {})
    fetch('/api/v1/finance-v5/expense-categories', { headers: authHeader() }).then(r => r.json()).then(d => setCategories(d.categories || [])).catch(() => {})
    fetch('/api/v1/finance-v5/profitability', { headers: authHeader() }).then(r => r.json()).then(d => setProfitability(d.profitability || [])).catch(() => {})
    fetch('/api/v1/finance-v5/tax-summary', { headers: authHeader() }).then(r => r.json()).then(d => setTax(d.tax || null)).catch(() => {})
    fetch('/api/v1/finance-v5/investment-roi', { headers: authHeader() }).then(r => r.json()).then(d => setInvestments(d.investments || [])).catch(() => {})
    fetch('/api/v1/finance-v5/variance-analysis', { headers: authHeader() }).then(r => r.json()).then(d => setVariance(d)).catch(() => {})
  }, [])

  return (
    <div style={{ padding: 16 }}>
      <h2>💰 Finance V5</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['cashflow', 'forecast', 'expenses', 'profitability', 'tax', 'roi', 'variance'] as const).map(s => (
          <button key={s} onClick={() => setTab(s)} className={`btn ${tab === s ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: 12 }}>
            {s === 'cashflow' ? 'Denarni tok' : s === 'forecast' ? 'Napoved' : s === 'expenses' ? 'Stroški' : s === 'profitability' ? 'Dobičkonosnost' : s === 'tax' ? 'Davki' : s === 'roi' ? 'ROI' : 'Odstopki'}
          </button>
        ))}
      </div>

      {tab === 'cashflow' && cashflow && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div className="card" style={{ textAlign: 'center' }}><p style={{ fontSize: 12, color: 'var(--muted)' }}>Vhod</p><p style={{ fontSize: 24, fontWeight: 700, color: 'var(--green)' }}>€{cashflow.total_inflow?.toLocaleString()}</p></div>
            <div className="card" style={{ textAlign: 'center' }}><p style={{ fontSize: 12, color: 'var(--muted)' }}>Izhod</p><p style={{ fontSize: 24, fontWeight: 700, color: 'var(--red)' }}>€{cashflow.total_outflow?.toLocaleString()}</p></div>
            <div className="card" style={{ textAlign: 'center' }}><p style={{ fontSize: 12, color: 'var(--muted)' }}>Neto</p><p style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary, #059669)' }}>€{cashflow.total_net?.toLocaleString()}</p></div>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <h4 style={{ marginTop: 0 }}>Mesečni denarni tok</h4>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              {(cashflow.cashflow || []).map((c: any, i: number) => (
                <div key={i} style={{ flex: 1, minWidth: 80, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.month}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
                    <div style={{ fontSize: 12, color: 'var(--green)' }}>+{c.inflow.toLocaleString()}</div>
                    <div style={{ fontSize: 12, color: 'var(--red)' }}>-{c.outflow.toLocaleString()}</div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>+{c.net.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'forecast' && forecast && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {(forecast.forecast || []).map((f: any, i: number) => (
            <div key={i} className="card">
              <h4 style={{ margin: 0 }}>{f.month}</h4>
              <p style={{ fontSize: 22, fontWeight: 700, margin: '8px 0' }}>€{f.predicted.toLocaleString()}</p>
              <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                <span style={{ color: 'var(--green)' }}>↑ €{f.high.toLocaleString()}</span>
                <span style={{ color: 'var(--red)' }}>↓ €{f.low.toLocaleString()}</span>
              </div>
              <div style={{ marginTop: 8, background: 'var(--bg, #f1f5f9)', borderRadius: 4, overflow: 'hidden', height: 6 }}>
                <div style={{ width: `${f.confidence}%`, background: 'var(--primary, #059669)', height: '100%' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Zaupanje: {f.confidence}%</div>
            </div>
          ))}
          <div className="card" style={{ gridColumn: '1 / -1' }}><p style={{ fontSize: 12, color: 'var(--muted)' }}>Metodologija: {forecast.methodology}</p></div>
        </div>
      )}

      {tab === 'expenses' && (
        <div style={{ display: 'grid', gap: 12 }}>
          {categories.map((c: any, i: number) => (
            <div key={i} className="card" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
              <div style={{ fontWeight: 600 }}>{c.name}</div>
              <div style={{ textAlign: 'right' }}><span style={{ fontSize: 16, fontWeight: 700 }}>€{c.amount.toLocaleString()}</span></div>
              <div style={{ textAlign: 'right' }}><span style={{ fontSize: 12, color: 'var(--muted)' }}>{c.percentage}%</span></div>
              <div style={{ textAlign: 'right' }}><span style={{ fontSize: 12, color: 'var(--muted)' }}>Budget: €{c.budget.toLocaleString()}</span></div>
              <span style={{ fontSize: 12, color: c.trend === 'up' ? 'var(--red)' : c.trend === 'down' ? 'var(--green)' : 'var(--muted)' }}>{c.trend === 'up' ? '↑' : c.trend === 'down' ? '↓' : '→'}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'profitability' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {profitability.map((p: any, i: number) => (
            <div key={i} className="card">
              <h4 style={{ margin: 0 }}>{p.item}</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Prihodek</span>
                <span style={{ fontSize: 14, fontWeight: 700 }}>€{p.revenue.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Strošek</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--red)' }}>€{p.cost.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Marža</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>{p.margin}%</span>
              </div>
              <div style={{ marginTop: 8, background: 'var(--bg, #f1f5f9)', borderRadius: 4, overflow: 'hidden', height: 6 }}>
                <div style={{ width: `${p.margin}%`, background: 'var(--green)', height: '100%' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'tax' && tax && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {Object.entries(tax).filter(([k]) => k !== 'filing_status' && k !== 'next_filing').map(([key, val]) => (
            <div key={key} className="card" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: 'var(--muted)' }}>{key.replace(/_/g, ' ')}</p>
              <p style={{ fontSize: 22, fontWeight: 700 }}>{typeof val === 'number' ? (key.includes('rate') ? `${val}%` : `€${val.toLocaleString()}`) : String(val)}</p>
            </div>
          ))}
          <div className="card" style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Status: <strong>{tax.filing_status}</strong></span>
            <span>Naslednja oddaja: <strong>{tax.next_filing}</strong></span>
          </div>
        </div>
      )}

      {tab === 'roi' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
          {investments.map((inv: any, i: number) => (
            <div key={i} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0 }}>{inv.name}</h4>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: inv.status === 'paid_off' ? 'var(--green)' : 'var(--amber)', color: '#fff' }}>{inv.status === 'paid_off' ? 'Odplačano' : 'Aktivno'}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 12 }}>
                <div style={{ textAlign: 'center' }}><div style={{ fontSize: 11, color: 'var(--muted)' }}>Strošek</div><div style={{ fontWeight: 700 }}>€{inv.cost.toLocaleString()}</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ fontSize: 11, color: 'var(--muted)' }}>Vpliv</div><div style={{ fontWeight: 700, color: 'var(--green)' }}>+€{inv.revenue_impact.toLocaleString()}</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ fontSize: 11, color: 'var(--muted)' }}>ROI</div><div style={{ fontWeight: 700 }}>{inv.roi_months} mesecev</div></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'variance' && variance && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div className="card" style={{ textAlign: 'center' }}><p style={{ fontSize: 12, color: 'var(--muted)' }}>Skupaj budget</p><p style={{ fontSize: 22, fontWeight: 700 }}>€{variance.total_budget?.toLocaleString()}</p></div>
            <div className="card" style={{ textAlign: 'center' }}><p style={{ fontSize: 12, color: 'var(--muted)' }}>Skupaj dejansko</p><p style={{ fontSize: 22, fontWeight: 700 }}>€{variance.total_actual?.toLocaleString()}</p></div>
            <div className="card" style={{ textAlign: 'center' }}><p style={{ fontSize: 12, color: 'var(--muted)' }}>Odstopek</p><p style={{ fontSize: 22, fontWeight: 700, color: variance.total_variance > 0 ? 'var(--red)' : 'var(--green)' }}>€{variance.total_variance?.toLocaleString()}</p></div>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {(variance.variance || []).map((v: any, i: number) => (
              <div key={i} className="card" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', alignItems: 'center', gap: 12, padding: '10px 16px' }}>
                <div style={{ fontWeight: 600 }}>{v.category}</div>
                <div style={{ textAlign: 'right' }}>€{v.budget.toLocaleString()}</div>
                <div style={{ textAlign: 'right' }}>€{v.actual.toLocaleString()}</div>
                <div style={{ textAlign: 'right', color: v.variance > 0 ? 'var(--red)' : 'var(--green)' }}>€{v.variance.toLocaleString()}</div>
                <div style={{ textAlign: 'right', color: v.pct > 0 ? 'var(--red)' : 'var(--green)' }}>{v.pct > 0 ? '+' : ''}{v.pct}%</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
