import { useState, useEffect } from 'react'
import * as api from './api'

export default function FinanceV3Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'cashflow' | 'pnl' | 'balance' | 'ratios'>('cashflow')
  const [cashflow, setCashflow] = useState<any>(null)
  const [pnl, setPnl] = useState<any>(null)
  const [balance, setBalance] = useState<any>(null)
  const [ratios, setRatios] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/finance-v3/cash-flow', { headers: api.h() }).then(r => r.json()).then(setCashflow),
      fetch('/api/v1/finance-v3/pnl', { headers: api.h() }).then(r => r.json()).then(setPnl),
      fetch('/api/v1/finance-v3/balance', { headers: api.h() }).then(r => r.json()).then(setBalance),
      fetch('/api/v1/finance-v3/ratios', { headers: api.h() }).then(r => r.json()).then(setRatios),
    ]).catch(() => onNotify('Napaka')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'cashflow', label: '💧 Denarni tok' },
    { key: 'pnl', label: '📈 IZPIS' },
    { key: 'balance', label: '⚖️ Bilanca' },
    { key: 'ratios', label: '📊 Razmerja' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm"><h2 className="page-title">💰 Finance V3</h2></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>{t.label}</button>
        ))}
      </div>
      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'cashflow' && cashflow && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Danes priliv', value: `${cashflow.inflow_today} €`, color: '#22c55e' },
                  { label: 'Danes odliv', value: `${cashflow.outflow_today} €`, color: '#ef4444' },
                  { label: 'Neto danes', value: `${cashflow.net_today} €`, color: cashflow.net_today > 0 ? '#22c55e' : '#ef4444' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Mesec priliv', value: `${cashflow.inflow_month?.toLocaleString()} €`, color: '#22c55e' },
                  { label: 'Mesec odliv', value: `${cashflow.outflow_month?.toLocaleString()} €`, color: '#ef4444' },
                  { label: 'Neto mesec', value: `${cashflow.net_month?.toLocaleString()} €`, color: '#3b82f6' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <h4 style={{ margin: '0 0 8px' }}>📅 Dnevni trend</h4>
              {cashflow.daily_trend?.map((d: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontWeight: 600, width: 40 }}>{d.day}</span>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ background: '#22c55e', height: 6, borderRadius: 3, width: `${(d.in / 4500) * 100}%` }} />
                      <span style={{ fontSize: 11, color: '#22c55e' }}>+{d.in}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ background: '#ef4444', height: 6, borderRadius: 3, width: `${(d.out / 4500) * 100}%` }} />
                      <span style={{ fontSize: 11, color: '#ef4444' }}>-{d.out}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'pnl' && pnl && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Neto dobiček</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>{pnl.net_profit?.toLocaleString()} €</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Rast YOY</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6' }}>+{pnl.yoy_growth}%</div>
                </div>
              </div>
              {[
                { label: 'Prihodki', value: pnl.revenue, color: '#22c55e', indent: false },
                { label: 'Stroški materiala', value: -pnl.cogs, color: '#ef4444', indent: true },
                { label: 'Bruto dobiček', value: pnl.gross_profit, color: '#3b82f6', indent: false },
                { label: 'Delovni stroški', value: -pnl.labor, color: '#ef4444', indent: true },
                { label: 'Ostali stroški', value: -pnl.overhead, color: '#ef4444', indent: true },
                { label: 'Marketing', value: -pnl.marketing, color: '#ef4444', indent: true },
                { label: 'Neto dobiček', value: pnl.net_profit, color: '#22c55e', indent: false },
              ].map((r, i) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 4, paddingLeft: r.indent ? 32 : 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: r.indent ? 400 : 600 }}>{r.label}</span>
                    <span style={{ fontWeight: 700, color: r.color }}>{r.value?.toLocaleString()} €</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'balance' && balance && (
            <div>
              <h4 style={{ margin: '0 0 8px' }}>📈 Sredstva</h4>
              {Object.entries(balance.assets).filter(([k]) => k !== 'total').map(([k, v], i) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{k}</span>
                  <span style={{ fontWeight: 700, color: '#22c55e' }}>{(v as number)?.toLocaleString()} €</span>
                </div>
              ))}
              <div className="card" style={{ padding: 10, marginBottom: 12, display: 'flex', justifyContent: 'space-between', background: '#f0fdf4' }}>
                <span style={{ fontWeight: 700 }}>Skupaj sredstva</span>
                <span style={{ fontWeight: 700, color: '#22c55e' }}>{balance.assets.total?.toLocaleString()} €</span>
              </div>
              <h4 style={{ margin: '0 0 8px' }}>📉 Obveznosti</h4>
              {Object.entries(balance.liabilities).filter(([k]) => k !== 'total').map(([k, v], i) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{k}</span>
                  <span style={{ fontWeight: 700, color: '#ef4444' }}>{(v as number)?.toLocaleString()} €</span>
                </div>
              ))}
              <div className="card" style={{ padding: 10, marginBottom: 12, display: 'flex', justifyContent: 'space-between', background: '#fef2f2' }}>
                <span style={{ fontWeight: 700 }}>Kapital</span>
                <span style={{ fontWeight: 700, color: '#3b82f6' }}>{balance.equity?.toLocaleString()} €</span>
              </div>
            </div>
          )}
          {tab === 'ratios' && ratios && (
            <div>
              <h4 style={{ margin: '0 0 8px' }}>💧 Likvidnost</h4>
              {Object.entries(ratios.liquidity).map(([k, v], i) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{k.replace('_', ' ')}</span>
                  <span style={{ fontWeight: 700, color: '#3b82f6' }}>{v as number}×</span>
                </div>
              ))}
              <h4 style={{ margin: '12px 0 8px' }}>💰 Dobičkonosnost</h4>
              {Object.entries(ratios.profitability).map(([k, v], i) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{k.replace('_', ' ')}</span>
                  <span style={{ fontWeight: 700, color: '#22c55e' }}>{v as number}%</span>
                </div>
              ))}
              <h4 style={{ margin: '12px 0 8px' }}>📊 Primerjava z industrijo</h4>
              <div className="card" style={{ padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>Industrijsko povprečje</span>
                  <span style={{ fontWeight: 700 }}>{ratios.benchmarks?.industry_avg_margin}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Naša marža</span>
                  <span style={{ fontWeight: 700, color: '#22c55e' }}>{ratios.benchmarks?.our_vs_industry}</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}