import { useState, useEffect } from 'react'
import * as api from './api'

export default function QualityV2Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'haccp' | 'temperature' | 'cleaning' | 'audits'>('haccp')
  const [haccp, setHaccp] = useState<any>(null)
  const [temperature, setTemperature] = useState<any>(null)
  const [cleaning, setCleaning] = useState<any>(null)
  const [audits, setAudits] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/quality-v2/haccp', { headers: api.h() }).then(r => r.json()).then(setHaccp),
      fetch('/api/v1/quality-v2/temperature', { headers: api.h() }).then(r => r.json()).then(setTemperature),
      fetch('/api/v1/quality-v2/cleaning', { headers: api.h() }).then(r => r.json()).then(setCleaning),
      fetch('/api/v1/quality-v2/audits', { headers: api.h() }).then(r => r.json()).then(setAudits),
    ]).catch(() => onNotify('Napaka pri nalaganju')).finally(() => setLoading(false))
  }, [])

  const riskColor = (r: string) => ({ high: '#ef4444', medium: '#f59e0b', low: '#22c55e' }[r] || '#6b7280')
  const statusColor = (s: string) => ({ ok: '#22c55e', warning: '#f59e0b', alert: '#ef4444' }[s] || '#6b7280')
  const complianceColor = (r: number) => r >= 98 ? '#22c55e' : r >= 95 ? '#f59e0b' : '#ef4444'

  const tabs = [
    { key: 'haccp', label: '🛡️ HACCP' },
    { key: 'temperature', label: '🌡️ Temperature' },
    { key: 'cleaning', label: '🧹 Čiščenje' },
    { key: 'audits', label: '📋 Revizije' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm">
        <h2 className="page-title">🛡️ Kakovost V2</h2>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>{t.label}</button>
        ))}
      </div>

      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'haccp' && haccp && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>CCP točke</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6' }}>{haccp.ccp_points}</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Skladnost</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: complianceColor(haccp.compliance_rate) }}>{haccp.compliance_rate}%</div>
                </div>
              </div>
              {haccp.hazards?.map((h: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8, borderLeft: `4px solid ${riskColor(h.risk)}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{h.stage}</span>
                    <span style={{ background: riskColor(h.risk), color: '#fff', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{h.risk}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>{h.hazard}</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Nadzor: {h.control} · Frekvenca: {h.frequency}</div>
                </div>
              ))}
            </div>
          )}

          {tab === 'temperature' && temperature && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Opombe</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: temperature.alerts > 0 ? '#ef4444' : '#22c55e' }}>{temperature.alerts}</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Skladnost</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: complianceColor(temperature.compliance_rate) }}>{temperature.compliance_rate}%</div>
                </div>
              </div>
              {temperature.readings?.map((r: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8, borderLeft: `4px solid ${statusColor(r.status)}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{r.device}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{r.target_min} — {r.target_max}°C</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: statusColor(r.status) }}>{r.current}°C</div>
                      <div style={{ fontSize: 11, color: '#888' }}>{r.last_check}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'cleaning' && cleaning && (
            <div>
              <div className="card" style={{ padding: 14, marginBottom: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#888' }}>Skladnost</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: complianceColor(cleaning.compliance_rate) }}>{cleaning.compliance_rate}%</div>
              </div>
              {cleaning.tasks?.map((t: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8, borderLeft: `4px solid ${t.status === 'up_to_date' ? '#22c55e' : '#ef4444'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{t.area} — {t.task}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{t.frequency} · Zadnje: {t.last_done}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: '#666' }}>Naslednje: {t.next_due}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'audits' && audits && (
            <div>
              <div className="card" style={{ padding: 14, marginBottom: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#888' }}>Stopnja uspeha</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>{audits.pass_rate}%</div>
              </div>
              {audits.audits?.map((a: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{a.type}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{a.date} · {a.auditor}</div>
                    </div>
                    <span style={{ background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>{a.result}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{a.notes}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}