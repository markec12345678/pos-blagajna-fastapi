import { useState, useEffect } from 'react'
import * as api from './api'

export default function FinanceV4Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'currency' | 'tax' | 'audit' | 'planning'>('currency')
  const [currency, setCurrency] = useState<any>(null)
  const [tax, setTax] = useState<any>(null)
  const [audit, setAudit] = useState<any>(null)
  const [planning, setPlanning] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/finance-v4/multi-currency', { headers: api.h() }).then(r => r.json()).then(setCurrency),
      fetch('/api/v1/finance-v4/tax', { headers: api.h() }).then(r => r.json()).then(setTax),
      fetch('/api/v1/finance-v4/audit', { headers: api.h() }).then(r => r.json()).then(setAudit),
      fetch('/api/v1/finance-v4/planning', { headers: api.h() }).then(r => r.json()).then(setPlanning),
    ]).catch(() => onNotify('Napaka')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'currency', label: '💱 Valute' },
    { key: 'tax', label: '🏛️ Davek' },
    { key: 'audit', label: '📋 Revizija' },
    { key: 'planning', label: '📊 Načrtovanje' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm"><h2 className="page-title">💰 Finance V4</h2></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>{t.label}</button>
        ))}
      </div>
      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'currency' && currency && (
            <div>
              <div className="card" style={{ padding: 14, marginBottom: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>💱 Tečaji</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                  {Object.entries(currency.rates || {}).map(([k, v], i) => (
                    <div key={i} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 12, color: '#888' }}>1 EUR =</div>
                      <div style={{ fontWeight: 700, color: '#3b82f6' }}>{v as number} {k}</div>
                    </div>
                  ))}
                </div>
              </div>
              <h4 style={{ margin: '0 0 8px' }}>📋 Transakcije</h4>
              {currency.transactions?.map((t: any) => (
                <div key={t.id} className="card" style={{ padding: 12, marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600 }}>{t.amount} {t.currency}</span>
                    <span style={{ color: '#888' }}>≈ {t.eur_value} EUR</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>📅 {t.date} · {t.type}</div>
                </div>
              ))}
              <div className="card" style={{ padding: 14, marginTop: 12, background: '#f0f9ff' }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>📊 Izpostavljenost</div>
                <div style={{ fontSize: 12, color: '#666' }}>Skupaj: {currency.exposure?.total_eur?.toLocaleString()} EUR</div>
              </div>
            </div>
          )}
          {tab === 'tax' && tax && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Davek</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#ef4444' }}>{tax.current_tax_rate}%</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Ocena letnega</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6' }}>{tax.estimated_annual_tax?.toLocaleString()} €</div>
                </div>
              </div>
              <h4 style={{ margin: '0 0 8px' }}>💡 Optimizacije</h4>
              {tax.optimizations?.map((o: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 6, borderLeft: `4px solid ${o.status === 'izkoriščeno' ? '#22c55e' : '#f59e0b'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{o.title}</span>
                    <span style={{ background: o.status === 'izkoriščeno' ? '#dcfce7' : '#fef3c7', color: o.status === 'izkoriščeno' ? '#16a34a' : '#d97706', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{o.status}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>+{o.saving} €</span>
                    <span>Kompleksnost: {o.complexity}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'audit' && audit && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Skupaj vnosov</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6' }}>{audit.total_entries?.toLocaleString()}</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Danes</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#8b5cf6' }}>{audit.today}</div>
                </div>
              </div>
              <h4 style={{ margin: '0 0 8px' }}>📋 Nedavni vpisi</h4>
              {audit.recent?.map((r: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{r.action}</span>
                    <span style={{ fontSize: 11, color: '#888' }}>{r.time}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                    <span>👤 {r.user}</span>
                    {r.amount && <span>💰 {r.amount} €</span>}
                    {r.detail && <span>{r.detail}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'planning' && planning && (
            <div>
              <div className="card" style={{ padding: 14, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>Ta mesec</span>
                  <span style={{ color: planning.budget?.variance > 0 ? '#22c55e' : '#ef4444', fontWeight: 700 }}>{planning.budget?.pct}%</span>
                </div>
                <div style={{ background: '#e5e7eb', borderRadius: 4, height: 8, marginBottom: 4 }}>
                  <div style={{ background: planning.budget?.pct > 90 ? '#22c55e' : '#f59e0b', height: '100%', borderRadius: 4, width: `${planning.budget?.pct}%` }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666' }}>
                  <span>Dejansko: {planning.budget?.actual?.toLocaleString()} €</span>
                  <span>Proračun: {planning.budget?.monthly?.toLocaleString()} €</span>
                </div>
              </div>
              <h4 style={{ margin: '0 0 8px' }}>🔮 Napovedi</h4>
              {planning.forecasts?.map((f: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 6 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{f.month}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12 }}>
                    <div>Prihodki: <b style={{ color: '#22c55e' }}>{f.revenue?.toLocaleString()} €</b></div>
                    <div>Stroški: <b style={{ color: '#ef4444' }}>{f.costs?.toLocaleString()} €</b></div>
                    <div>Dobiček: <b style={{ color: '#3b82f6' }}>{f.profit?.toLocaleString()} €</b></div>
                  </div>
                </div>
              ))}
              <h4 style={{ margin: '16px 0 8px' }}>🎯 Scenariji</h4>
              {planning.scenarios?.map((s: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>{s.name}</span>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    <span style={{ color: s.revenue_pct > 0 ? '#22c55e' : s.revenue_pct < 0 ? '#ef4444' : '#888', fontWeight: 700 }}>{s.revenue_pct > 0 ? '+' : ''}{s.revenue_pct}%</span>
                    <span style={{ marginLeft: 8 }}>({s.probability}%)</span>
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