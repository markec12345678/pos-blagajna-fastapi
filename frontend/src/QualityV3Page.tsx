import { useState, useEffect } from 'react'
import * as api from './api'

export default function QualityV3Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'haccp' | 'temperature' | 'hygiene' | 'compliance'>('haccp')
  const [haccp, setHaccp] = useState<any>(null)
  const [temperature, setTemperature] = useState<any>(null)
  const [hygiene, setHygiene] = useState<any>(null)
  const [compliance, setCompliance] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/quality-v3/haccp', { headers: api.h() }).then(r => r.json()).then(setHaccp),
      fetch('/api/v1/quality-v3/temperature', { headers: api.h() }).then(r => r.json()).then(setTemperature),
      fetch('/api/v1/quality-v3/hygiene', { headers: api.h() }).then(r => r.json()).then(setHygiene),
      fetch('/api/v1/quality-v3/compliance', { headers: api.h() }).then(r => r.json()).then(setCompliance),
    ]).catch(() => onNotify('Napaka')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'haccp', label: '🛡️ HACCP' },
    { key: 'temperature', label: '🌡️ Temperature' },
    { key: 'hygiene', label: '🧹 Higiena' },
    { key: 'compliance', label: '📋 Skladnost' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm"><h2 className="page-title">🛡️ Kakovost V3</h2></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>{t.label}</button>
        ))}
      </div>
      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'haccp' && haccp && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Status', value: haccp.status, color: '#22c55e' },
                  { label: 'Skladnost', value: `${haccp.compliance_score}%`, color: '#3b82f6' },
                  { label: 'Kršitve', value: haccp.violations, color: haccp.violations === 0 ? '#22c55e' : '#ef4444' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <h4 style={{ margin: '0 0 8px' }}>🌡️ Kritične točke</h4>
              {haccp.critical_points?.map((p: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 6, borderLeft: `4px solid ${p.status === 'ok' ? '#22c55e' : '#ef4444'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{p.point}</span>
                    <span style={{ fontWeight: 700, color: '#3b82f6' }}>{p.current}°C</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>Razpon: {p.temp_min}°C — {p.temp_max}°C</div>
                </div>
              ))}
            </div>
          )}
          {tab === 'temperature' && temperature && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Naprave', value: temperature.devices, color: '#3b82f6' },
                  { label: 'Vse OK', value: temperature.all_ok ? '✅' : '❌', color: '#22c55e' },
                  { label: 'Opozorila', value: temperature.alerts_today, color: temperature.alerts_today === 0 ? '#22c55e' : '#ef4444' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {temperature.readings?.map((r: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{r.device}</span>
                    <span style={{ fontWeight: 700, color: '#3b82f6' }}>{r.temp}°C</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: 4, height: 6 }}>
                    <div style={{ background: '#22c55e', height: '100%', borderRadius: 4, width: '100%' }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Razpon: {r.target_min}°C — {r.target_max}°C</div>
                </div>
              ))}
            </div>
          )}
          {tab === 'hygiene' && hygiene && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Ocena higiene</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>{hygiene.score}%</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Incidenti</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>{hygiene.incidents_this_month}</div>
                </div>
              </div>
              <h4 style={{ margin: '0 0 8px' }}>📋 Kontrolni seznam</h4>
              {hygiene.checklist?.map((c: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{c.status === 'done' ? '✅' : '⏳'}</span>
                    <span style={{ fontWeight: 600 }}>{c.task}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    {c.time} · {c.by || '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'compliance' && compliance && (
            <div>
              <div className="card" style={{ padding: 14, marginBottom: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#888' }}>Skupna skladnost</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>{compliance.overall_score}%</div>
              </div>
              {compliance.categories?.map((c: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>{c.score}%</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: 4, height: 6 }}>
                    <div style={{ background: '#22c55e', height: '100%', borderRadius: 4, width: `${c.score}%` }} />
                  </div>
                </div>
              ))}
              {compliance.certifications?.length > 0 && (
                <>
                  <h4 style={{ margin: '16px 0 8px' }}>📜 Certifikati</h4>
                  {compliance.certifications?.map((c: any, i: number) => (
                    <div key={i} className="card" style={{ padding: 12, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600 }}>{c.name}</span>
                      <div style={{ fontSize: 12 }}>
                        <span style={{ color: '#888' }}>Poteče: {c.valid_until}</span>
                        <span style={{ marginLeft: 8, background: '#dcfce7', color: '#16a34a', padding: '1px 6px', borderRadius: 4, fontSize: 10 }}>{c.status}</span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}