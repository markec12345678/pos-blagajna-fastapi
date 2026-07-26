import { useState, useEffect } from 'react'
import * as api from './api'

export default function CashV2Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'registers' | 'drawer' | 'safe' | 'reconciliation' | 'flow' | 'stats'>('registers')
  const [registers, setRegisters] = useState<any>(null)
  const [drawer, setDrawer] = useState<any>(null)
  const [safe, setSafe] = useState<any>(null)
  const [reconciliation, setReconciliation] = useState<any>(null)
  const [flow, setFlow] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/cash-v2/registers', { headers: api.h() }).then(r => r.json()).then(setRegisters),
      fetch('/api/v1/cash-v2/drawer-audit', { headers: api.h() }).then(r => r.json()).then(setDrawer),
      fetch('/api/v1/cash-v2/safe', { headers: api.h() }).then(r => r.json()).then(setSafe),
      fetch('/api/v1/cash-v2/daily-reconciliation', { headers: api.h() }).then(r => r.json()).then(setReconciliation),
      fetch('/api/v1/cash-v2/cash-flow', { headers: api.h() }).then(r => r.json()).then(setFlow),
    ]).catch(() => onNotify('Napaka pri nalaganju')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'registers', label: '🏪 Blagajne' },
    { key: 'drawer', label: '💵 Predal' },
    { key: 'safe', label: '🔒 Varnostna omarica' },
    { key: 'reconciliation', label: '⚖️ Usklajevanje' },
    { key: 'flow', label: '💸 Pretok' },
    { key: 'stats', label: '📊 Statistika' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">💰 Gotovina V2</h2>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>{t.label}</button>
        ))}
      </div>

      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'registers' && registers && (
            <div>
              {registers.registers?.map((r: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8, borderLeft: `4px solid ${r.status === 'open' ? '#22c55e' : '#94a3b8'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{r.name}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{r.location}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: '#22c55e' }}>{r.current_amount} €</div>
                      <span style={{ background: r.status === 'open' ? '#dcfce7' : '#e5e7eb', color: r.status === 'open' ? '#16a34a' : '#666', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{r.status === 'open' ? 'Odprta' : 'Zaprtá'}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: '#888' }}>
                    {r.opened_at ? `Odprla: ${r.opened_by} ob ${r.opened_at}` : `Zadnjič zaprta: ${r.closed_by} ob ${r.last_closed}`}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'drawer' && drawer && (
            <div>
              <div className="card" style={{ padding: 14, marginBottom: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#888' }}>Skupaj v predalu</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#22c55e' }}>{drawer.total_cash.toFixed(2)} €</div>
              </div>
              {drawer.denominations?.map((d: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>{d.denomination}</span>
                  <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                    <span>{d.count} kosov</span>
                    <span style={{ fontWeight: 600 }}>{d.total.toFixed(2)} €</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'safe' && safe && (
            <div>
              <div className="card" style={{ padding: 14, marginBottom: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#888' }}>Stanje varnostne omarice</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#3b82f6' }}>{safe.current_amount.toFixed(2)} €</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Zadnji dostop: {safe.last_access} · {safe.accessed_by}</div>
              </div>
              <h4 style={{ margin: '0 0 8px' }}>📋 Transakcije</h4>
              {safe.transactions?.map((t: any, i: number) => (
                <div key={i} className="card" style={{ padding: 10, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13 }}>{t.description}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{t.date} · {t.by}</div>
                  </div>
                  <span style={{ fontWeight: 700, color: t.type === 'deposit' ? '#22c55e' : '#ef4444' }}>{t.type === 'deposit' ? '+' : '-'}{t.amount.toFixed(2)} €</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'reconciliation' && reconciliation && (
            <div>
              {reconciliation.registers?.map((r: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8, borderLeft: `4px solid ${r.status === 'balanced' ? '#22c55e' : '#ef4444'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{r.name}</span>
                    <span style={{ background: r.status === 'balanced' ? '#dcfce7' : '#fee2e2', color: r.status === 'balanced' ? '#16a34a' : '#dc2626', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{r.status === 'balanced' ? 'Usklajeno' : 'Nerazlika'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                    <span>Pričakovano: {r.expected.toFixed(2)} €</span>
                    <span>Dejansko: {r.actual.toFixed(2)} €</span>
                    <span style={{ color: r.difference === 0 ? '#22c55e' : '#ef4444' }}>Razlika: {r.difference.toFixed(2)} €</span>
                  </div>
                </div>
              ))}
              {reconciliation.notes && <div className="card" style={{ padding: 12, marginTop: 8, borderLeft: '4px solid #f59e0b', fontSize: 13 }}>⚠️ {reconciliation.notes}</div>}
            </div>
          )}

          {tab === 'flow' && flow && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Pritoki', value: `${flow.total_inflows?.toFixed(0)} €`, color: '#22c55e' },
                  { label: 'Odtoki', value: `${flow.total_outflows?.toFixed(0)} €`, color: '#ef4444' },
                  { label: 'Neto', value: `${flow.net_flow?.toFixed(0)} €`, color: '#3b82f6' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <h4 style={{ margin: '0 0 8px' }}>📥 Pritoki</h4>
              {flow.inflows?.map((f: any, i: number) => (
                <div key={i} className="card" style={{ padding: 8, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13 }}>{f.date} · {f.source}</span>
                  <span style={{ fontWeight: 600, color: '#22c55e' }}>+{f.amount} €</span>
                </div>
              ))}
              <h4 style={{ margin: '16px 0 8px' }}>📤 Odtoki</h4>
              {flow.outflows?.map((f: any, i: number) => (
                <div key={i} className="card" style={{ padding: 8, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13 }}>{f.date} · {f.source}</span>
                  <span style={{ fontWeight: 600, color: '#ef4444' }}>-{f.amount} €</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'stats' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Današnja gotovina', value: `${reconciliation?.total_expected?.toFixed(0)} €`, color: '#22c55e' },
                { label: 'Varnostna omarica', value: `${safe?.current_amount?.toFixed(0)} €`, color: '#3b82f6' },
                { label: 'Odprte blagajne', value: registers?.total_open || 0, color: '#22c55e' },
                { label: 'Zaprté blagajne', value: registers?.total_closed || 0, color: '#94a3b8' },
                { label: 'Razlika', value: `${reconciliation?.total_difference?.toFixed(2)} €`, color: reconciliation?.total_difference === 0 ? '#22c55e' : '#ef4444' },
                { label: 'Status', value: reconciliation?.overall_status === 'balanced' ? 'Usklajeno' : 'Nerazlika', color: reconciliation?.overall_status === 'balanced' ? '#22c55e' : '#ef4444' },
              ].map((s, i) => (
                <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}