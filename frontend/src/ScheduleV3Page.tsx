import React, { useState, useEffect } from 'react'
import { authHeader } from './api'
import { useTranslation } from './i18n'

export default function ScheduleV3Page({ onNotify }: { onNotify: (m: string) => void }) {
  const { t } = useTranslation()
  const [forecast, setForecast] = useState<any[]>([])
  const [optimization, setOptimization] = useState<any>(null)
  const [availability, setAvailability] = useState<any[]>([])
  const [skillMatrix, setSkillMatrix] = useState<any[]>([])
  const [compliance, setCompliance] = useState<any>(null)
  const [costs, setCosts] = useState<any>(null)
  const [swaps, setSwaps] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [tab, setTab] = useState('forecast')

  useEffect(() => {
    fetch('/api/v1/schedule-v3/demand-forecast', { headers: authHeader() }).then(r => r.json()).then(d => setForecast(d.forecast || [])).catch(() => {})
    fetch('/api/v1/schedule-v3/shift-optimization', { headers: authHeader() }).then(r => r.json()).then(d => setOptimization(d.optimization || null)).catch(() => {})
    fetch('/api/v1/schedule-v3/employee-availability', { headers: authHeader() }).then(r => r.json()).then(d => setAvailability(d.employees || [])).catch(() => {})
    fetch('/api/v1/schedule-v3/skill-matrix', { headers: authHeader() }).then(r => r.json()).then(d => setSkillMatrix(d.matrix || [])).catch(() => {})
    fetch('/api/v1/schedule-v3/compliance', { headers: authHeader() }).then(r => r.json()).then(d => setCompliance(d.compliance || null)).catch(() => {})
    fetch('/api/v1/schedule-v3/cost-analysis', { headers: authHeader() }).then(r => r.json()).then(d => setCosts(d.costs || null)).catch(() => {})
    fetch('/api/v1/schedule-v3/swap-requests', { headers: authHeader() }).then(r => r.json()).then(d => setSwaps(d.swaps || [])).catch(() => {})
    fetch('/api/v1/schedule-v3/template-usage', { headers: authHeader() }).then(r => r.json()).then(d => setTemplates(d.templates || [])).catch(() => {})
  }, [])

  return (
    <div style={{ padding: 16 }}>
      <h2>📅 Urnik V3</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['forecast', 'optimization', 'availability', 'skills', 'compliance', 'costs', 'swaps', 'templates'] as const).map(s => (
          <button key={s} onClick={() => setTab(s)} className={`btn ${tab === s ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: 12 }}>
            {s === 'forecast' ? 'Napoved' : s === 'optimization' ? 'Optimizacija' : s === 'availability' ? 'Razpoložljivost' : s === 'skills' ? 'Veščine' : s === 'compliance' ? 'Skladnost' : s === 'costs' ? 'Stroški' : s === 'swaps' ? 'Zamene' : 'Predloge'}
          </button>
        ))}
      </div>

      {tab === 'forecast' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12, marginBottom: 16 }}>
            {forecast.map((f: any, i: number) => (
              <div key={i} className="card" style={{ textAlign: 'center' }}>
                <h4 style={{ margin: 0, fontSize: 14 }}>{f.day}</h4>
                <div style={{ fontSize: 22, fontWeight: 700, margin: '8px 0' }}>{f.expected_orders}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{f.date}</div>
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12 }}>
                  <span>🍳 {f.staff_needed?.kitchen}</span>
                  <span>🍽️ {f.staff_needed?.service}</span>
                  <span>🍸 {f.staff_needed?.bar}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                  Vrh: {f.peak_hours?.join(', ')}
                </div>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Skupaj naročil: <strong>{forecast.reduce((sum, f) => sum + (f.expected_orders || 0), 0)}</strong></span>
              <span>Strošek dela: <strong>€{forecast[0] ? '8,500' : '0'}</strong></span>
            </div>
          </div>
        </div>
      )}

      {tab === 'optimization' && optimization && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div className="card" style={{ padding: 16 }}>
              <h4 style={{ marginTop: 0 }}>Trenutni urnik</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Ure</div><div style={{ fontWeight: 700 }}>{optimization.current_schedule?.total_hours}</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Strošek</div><div style={{ fontWeight: 700 }}>€{optimization.current_schedule?.labor_cost}</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Luknje</div><div style={{ fontWeight: 700, color: 'var(--red)' }}>{optimization.current_schedule?.coverage_gaps}</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Nadure</div><div style={{ fontWeight: 700 }}>{optimization.current_schedule?.overtime_hours}h</div></div>
              </div>
            </div>
            <div className="card" style={{ padding: 16, border: '2px solid var(--green)' }}>
              <h4 style={{ marginTop: 0, color: 'var(--green)' }}>Optimizirani urnik</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Ure</div><div style={{ fontWeight: 700 }}>{optimization.optimized_schedule?.total_hours}</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Strošek</div><div style={{ fontWeight: 700, color: 'var(--green)' }}>€{optimization.optimized_schedule?.labor_cost}</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Luknje</div><div style={{ fontWeight: 700, color: 'var(--green)' }}>{optimization.optimized_schedule?.coverage_gaps}</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Nadure</div><div style={{ fontWeight: 700, color: 'var(--green)' }}>{optimization.optimized_schedule?.overtime_hours}h</div></div>
              </div>
            </div>
          </div>
          <div className="card" style={{ padding: 16, marginBottom: 12 }}>
            <h4 style={{ marginTop: 0 }}>Prihranek</h4>
            <div style={{ display: 'flex', gap: 16 }}>
              <span>{optimization.savings?.hours} ur</span>
              <span style={{ color: 'var(--green)' }}>€{optimization.savings?.cost}</span>
              <span>Nadure -{optimization.savings?.overtime_reduction}%</span>
            </div>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <h4 style={{ marginTop: 0 }}>Priporočila</h4>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {(optimization.recommendations || []).map((r: string, i: number) => (
                <li key={i} style={{ marginBottom: 4, fontSize: 13 }}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {tab === 'availability' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
          {availability.map((e: any, i: number) => (
            <div key={i} className="card" style={{ padding: 16 }}>
              <h4 style={{ margin: 0 }}>{e.name}</h4>
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0' }}>{e.role}</p>
              <div style={{ marginTop: 8, background: 'var(--bg, #f1f5f9)', borderRadius: 4, overflow: 'hidden', height: 8 }}>
                <div style={{ width: `${(e.hours_this_week / e.max_hours) * 100}%`, background: e.hours_this_week >= e.max_hours ? 'var(--red)' : 'var(--primary, #059669)', height: '100%' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 12 }}>
                <span>{e.hours_this_week}/{e.max_hours}h</span>
                <span>{e.overtime_available}h nadur</span>
              </div>
              <div style={{ fontSize: 12, marginTop: 8 }}>
                <div>Želene izmene: {e.preferred_shifts.join(', ')}</div>
                {e.time_off.length > 0 && <div style={{ color: 'var(--red)' }}>Dopust: {e.time_off.join(', ')}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'skills' && (
        <div style={{ display: 'grid', gap: 12 }}>
          {skillMatrix.map((s: any, i: number) => (
            <div key={i} className="card" style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h4 style={{ margin: 0 }}>{s.employee}</h4>
                <div style={{ display: 'flex', gap: 4 }}>
                  {s.certifications.map((c: string) => (
                    <span key={c} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 8, background: 'var(--green)', color: '#fff' }}>{c}</span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
                {Object.entries(s.skills).map(([skill, level]: [string, any]) => (
                  <div key={skill} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{skill}</div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 2 }}>
                      {Array.from({ length: 5 }, (_, j) => (
                        <div key={j} style={{ width: 8, height: 8, borderRadius: 4, background: j < level ? 'var(--primary, #059669)' : 'var(--bg, #f1f5f9)' }} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>Fleksibilnost: <strong>{s.flexibility}</strong></div>
            </div>
          ))}
        </div>
      )}

      {tab === 'compliance' && compliance && (
        <div>
          <div className="card" style={{ padding: 16, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0 }}>Skladnost</h4>
              <span style={{ fontSize: 22, fontWeight: 700, color: compliance.compliance_score >= 90 ? 'var(--green)' : 'var(--amber)' }}>{compliance.compliance_score}%</span>
            </div>
            <div style={{ marginTop: 8, background: 'var(--bg, #f1f5f9)', borderRadius: 4, overflow: 'hidden', height: 8 }}>
              <div style={{ width: `${compliance.compliance_score}%`, background: compliance.compliance_score >= 90 ? 'var(--green)' : 'var(--amber)', height: '100%' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
            <div className="card" style={{ textAlign: 'center' }}><p style={{ fontSize: 11, color: 'var(--muted)' }}>Max ur/teden</p><p style={{ fontSize: 22, fontWeight: 700 }}>{compliance.max_weekly_hours}</p></div>
            <div className="card" style={{ textAlign: 'center' }}><p style={{ fontSize: 11, color: 'var(--muted)' }}>Min počitek</p><p style={{ fontSize: 22, fontWeight: 700 }}>{compliance.min_rest_hours}h</p></div>
            <div className="card" style={{ textAlign: 'center' }}><p style={{ fontSize: 11, color: 'var(--muted)' }}>Max nadure</p><p style={{ fontSize: 22, fontWeight: 700 }}>{compliance.overtime_limit}h</p></div>
          </div>
          {compliance.violations?.length > 0 && (
            <div className="card" style={{ padding: 16 }}>
              <h4 style={{ marginTop: 0, color: 'var(--amber)' }}>Opozorila</h4>
              {compliance.violations.map((v: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < compliance.violations.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span>{v.employee} — {v.type}</span>
                  <span style={{ fontSize: 12, color: v.status === 'warning' ? 'var(--amber)' : 'var(--muted)' }}>{v.detail || `${v.hours}h / ${v.limit}h`}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'costs' && costs && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Skupaj', value: `€${costs.total_labor_cost?.toLocaleString()}` },
              { label: 'Redne ure', value: `€${costs.regular_hours_cost?.toLocaleString()}` },
              { label: 'Nadure', value: `€${costs.overtime_cost}`, color: 'var(--red)' },
              { label: 'Na naročilo', value: `€${costs.cost_per_order}` },
              { label: 'Na uro', value: `€${costs.cost_per_hour}` },
            ].map((kpi, i) => (
              <div key={i} className="card" style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>{kpi.label}</p>
                <p style={{ fontSize: 20, fontWeight: 700, margin: '4px 0', color: kpi.color || 'inherit' }}>{kpi.value}</p>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding: 16 }}>
            <h4 style={{ marginTop: 0 }}>Po vlogah</h4>
            {(costs.by_role || []).map((r: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: i < costs.by_role.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ width: 80, fontWeight: 600 }}>{r.role}</span>
                <div style={{ flex: 1, background: 'var(--bg, #f1f5f9)', borderRadius: 4, overflow: 'hidden', height: 12 }}>
                  <div style={{ width: `${r.percentage}%`, background: 'var(--primary, #059669)', height: '100%' }} />
                </div>
                <span style={{ width: 60, textAlign: 'right', fontSize: 12 }}>{r.hours}h</span>
                <span style={{ width: 60, textAlign: 'right', fontSize: 12, fontWeight: 700 }}>€{r.cost.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'swaps' && (
        <div style={{ display: 'grid', gap: 12 }}>
          {swaps.map((s: any) => (
            <div key={s.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', borderLeft: `4px solid ${s.status === 'approved' ? 'var(--green)' : 'var(--amber)'}` }}>
              <span style={{ fontSize: 24 }}>🔄</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{s.requester} → {s.target}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.date} · {s.shift} izmena · {s.reason}</div>
              </div>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: s.status === 'approved' ? 'var(--green)' : 'var(--amber)', color: '#fff' }}>{s.status === 'approved' ? 'Odobreno' : 'Čaka'}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'templates' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
          {templates.map((t: any, i: number) => (
            <div key={i} className="card" style={{ padding: 16 }}>
              <h4 style={{ margin: 0 }}>{t.name}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Uporabe</div><div style={{ fontWeight: 700 }}>{t.usage_count}</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Kritje</div><div style={{ fontWeight: 700 }}>{t.coverage}%</div></div>
              </div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: 'var(--amber)', fontSize: 14 }}>★</span><span style={{ fontWeight: 700 }}>{t.avg_satisfaction}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>Zadnja: {t.last_used}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
