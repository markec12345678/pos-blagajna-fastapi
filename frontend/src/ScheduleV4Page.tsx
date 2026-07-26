import { useState, useEffect } from 'react'

interface AIPrediction { day: string; predicted_orders: number; confidence: number; weather: string; events: string[] }
interface StaffingRecommendation { day: string; kitchen: number; service: number; total: number }
interface SwapRequest { id: number; employee: string; shift: string; reason: string; posted: string; offers: Array<{ from: string; available: boolean; match_score: number }>; status: string }
interface Employee { name: string; punctuality: number; absences: number; tardiness: number; overtime_hours: number; pattern: string }
interface ComplianceMetric { max_weekly?: number; avg_weekly?: number; violations?: number; compliance_rate: number }

export default function ScheduleV4Page({ onNotify }: { onNotify?: (msg: string, err?: boolean) => void }) {
  const [tab, setTab] = useState<string>('ai')
  const [predictions, setPredictions] = useState<AIPrediction[]>([])
  const [staffing, setStaffing] = useState<StaffingRecommendation[]>([])
  const [swaps, setSwaps] = useState<SwapRequest[]>([])
  const [attendance, setAttendance] = useState<Employee[]>([])
  const [compliance, setCompliance] = useState<any>(null)
  const [seasonal, setSeasonal] = useState<any>(null)
  const [labor, setLabor] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [aRes, lRes, sRes, atRes, cRes, seRes] = await Promise.all([
        fetch('/api/v1/schedule-v4/ai-scheduling').then(r => r.json()),
        fetch('/api/v1/schedule-v4/labor-cost-optimization').then(r => r.json()),
        fetch('/api/v1/schedule-v4/shift-swap-marketplace').then(r => r.json()),
        fetch('/api/v1/schedule-v4/attendance-patterns').then(r => r.json()),
        fetch('/api/v1/schedule-v4/compliance-dashboard').then(r => r.json()),
        fetch('/api/v1/schedule-v4/seasonal-staffing').then(r => r.json()),
      ])
      setPredictions(aRes.ai?.predictions || [])
      setStaffing(aRes.ai?.recommended_staffing || [])
      setLabor(lRes.optimization || null)
      setSwaps(sRes.marketplace || [])
      setAttendance(atRes.patterns?.employees || [])
      setCompliance(cRes.compliance || null)
      setSeasonal(seRes.seasonal || null)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  if (loading) return <div className="loading">Nalagam...</div>

  return (
    <div style={{ padding: '2rem' }}>
      <h1>📅 Urnik V4</h1>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {[
          { key: 'ai', label: '🤖 AI načrtovanje' },
          { key: 'labor', label: '💰 Optimizacija stroškov' },
          { key: 'swaps', label: '🔄 Menjava izmen' },
          { key: 'attendance', label: '📋 Prisotnost' },
          { key: 'compliance', label: '✅ Skladnost' },
          { key: 'seasonal', label: '🌴 Sezonsko' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: tab === t.key ? '2px solid #2563eb' : '1px solid #d1d5db', background: tab === t.key ? '#dbeafe' : 'white', cursor: 'pointer', fontSize: '0.85rem' }}>{t.label}</button>
        ))}
      </div>

      {tab === 'ai' && (
        <div>
          <h2>AI načrtovanje urnika</h2>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {predictions.map((p, i) => (
              <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 100px 120px', alignItems: 'center', gap: '1rem' }}>
                  <strong>{p.day}</strong>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.9rem' }}>
                    <div>Naročila: {p.predicted_orders}</div>
                    <div>Vreme: {p.weather}</div>
                    <div>Dogodki: {p.events.length > 0 ? p.events.join(', ') : '—'}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, color: p.confidence > 0.9 ? '#10b981' : '#f59e0b' }}>{(p.confidence * 100).toFixed(0)}%</div>
                    <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>Zaupanje</div>
                  </div>
                  {staffing[i] && (
                    <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
                      🍳 {staffing[i].kitchen} · 👤 {staffing[i].service} · Skupaj: <strong>{staffing[i].total}</strong>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'labor' && (
        <div>
          <h2>Optimizacija stroškov dela</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>€6,200</div>
              <div>Trenutni tedenski strošek</div>
            </div>
            <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>€5,750</div>
              <div>Optimirani strošek</div>
            </div>
            <div style={{ background: '#d1fae5', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#065f46' }}>€450</div>
              <div>Prihranek (7.3%)</div>
            </div>
          </div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3>Predlogi</h3>
            {labor?.recommendations?.map((r: any, i: number) => (
              <div key={i} style={{ padding: '1rem', borderRadius: '8px', background: '#f9fafb', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div>{r.action}</div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Vpliv: {r.impact} · Izvedljivost: {r.feasibility}</div>
                </div>
                <span style={{ fontWeight: 700, color: '#10b981' }}>€{r.saving}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'swaps' && (
        <div>
          <h2>Menjava izmen</h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {swaps.map(s => (
              <div key={s.id} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div>
                    <strong>{s.employee}</strong>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{s.shift} · {s.reason}</div>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Objavljeno: {s.posted}</span>
                </div>
                {s.offers.length > 0 ? (
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {s.offers.map((o, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', borderRadius: '6px', background: '#d1fae5', alignItems: 'center' }}>
                        <span>{o.from}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>Ujemanje: {o.match_score}%</span>
                          <button style={{ padding: '0.25rem 0.75rem', borderRadius: '6px', border: 'none', background: '#059669', color: 'white', cursor: 'pointer', fontSize: '0.8rem' }}>Potrdi</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.85rem', color: '#6b7280', fontStyle: 'italic' }}>Še ni ponudb</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'attendance' && (
        <div>
          <h2>Prisotnost zaposlenih</h2>
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {attendance.map(e => (
                <div key={e.name} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px', alignItems: 'center', gap: '1rem', padding: '0.75rem', borderRadius: '8px', background: e.pattern === 'Nereden' ? '#fef2f2' : '#f9fafb' }}>
                  <strong>{e.name}</strong>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <div>Punktualnost: {e.punctuality}%</div>
                    <div>Odsotnosti: {e.absences}</div>
                    <div>Zamude: {e.tardiness}</div>
                    <div>Nadure: {e.overtime_hours}h</div>
                  </div>
                  <span style={{ padding: '0.2rem 0.6rem', borderRadius: '8px', fontSize: '0.75rem', background: e.pattern === 'Stalen' ? '#d1fae5' : e.pattern === 'Dobro' ? '#dbeafe' : '#fef3c7', color: e.pattern === 'Stalen' ? '#065f46' : e.pattern === 'Dobro' ? '#1e40af' : '#92400e' }}>{e.pattern}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'compliance' && compliance && (
        <div>
          <h2>Skladnost</h2>
          <div style={{ background: '#d1fae5', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{compliance.overall_score}%</div>
            <div>Skupna skladnost</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {Object.entries(compliance).filter(([k]) => k !== 'overall_score' && k !== 'last_audit' && k !== 'next_audit' && typeof compliance[k] === 'object').map(([key, val]: [string, any]) => (
              <div key={key} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ textTransform: 'capitalize', fontWeight: 600, marginBottom: '0.5rem' }}>{key.replace(/_/g, ' ')}</div>
                <div style={{ fontSize: '0.9rem' }}>Skladnost: {val.compliance_rate}%</div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Kršitve: {val.violations}</div>
                {val.avg_weekly && <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Povprečje: {val.avg_weekly}h/teden</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'seasonal' && seasonal && (
        <div>
          <h2>Sezonsko osebje</h2>
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'center' }}>
              <div><strong>Sezona:</strong> {seasonal.current_season}</div>
              <div><strong>Raven:</strong> {seasonal.staffing_level}</div>
              <div><strong>Usposabljanje:</strong> {seasonal.training_progress?.completed || 0} končano</div>
            </div>
          </div>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {seasonal.seasonal_staff?.map((s: any, i: number) => (
              <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <strong>{s.name}</strong>
                  <span>{s.role}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <div>Začetek: {s.start}</div>
                  <div>Konec: {s.end}</div>
                  <div>Ure/teden: {s.hours_per_week}</div>
                  <div>Ura: €{s.hourly_rate}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
