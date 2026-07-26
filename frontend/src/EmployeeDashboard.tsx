import { useState, useEffect } from 'react'

interface EmployeePerf {
  id: number; name: string; role: string; orders_processed: number;
  total_revenue: number; avg_order_value: number; shifts_worked: number;
  total_hours: number; revenue_per_hour: number
}

interface LeaderboardEntry {
  rank: number; id: number; name: string; role: string; revenue: number; orders: number; shifts: number; efficiency: number
}

const MEDAL_ICONS = ['🥇', '🥈', '🥉']

export default function EmployeeDashboard({ onNotify }: { onNotify: (msg: string) => void }) {
  const [summary, setSummary] = useState<{ summary: any; employees: EmployeePerf[] } | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)
  const [metric, setMetric] = useState<'revenue' | 'orders' | 'efficiency'>('revenue')
  const [tab, setTab] = useState<'overview' | 'leaderboard'>('overview')

  const headers = { ...JSON.parse(localStorage.getItem('auth') || '{}').headers }

  useEffect(() => { loadData() }, [days, metric])

  const loadData = async () => {
    setLoading(true)
    try {
      const [sumR, lbR] = await Promise.all([
        fetch(`/api/v1/employee-dashboard/summary?days=${days}`, { headers }).then(r => r.json()),
        fetch(`/api/v1/employee-dashboard/leaderboard?days=${days}&metric=${metric}`, { headers }).then(r => r.json()),
      ])
      setSummary(sumR)
      setLeaderboard(lbR.leaderboard || [])
    } catch { onNotify('Napaka') }
    setLoading(false)
  }

  if (loading || !summary) return <div style={{ padding: 40, textAlign: 'center' }}>⏳ Nalaganje...</div>

  const maxRevenue = Math.max(...summary.employees.map(e => e.total_revenue), 1)

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ margin: '0 0 16px' }}>👥 Dashboard zaposlenih</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <select className="input" value={days} onChange={e => setDays(parseInt(e.target.value))} style={{ width: 100, fontSize: 12 }}>
          <option value={7}>7 dni</option>
          <option value={30}>30 dni</option>
          <option value={90}>90 dni</option>
        </select>
        <div style={{ flex: 1 }} />
        <button onClick={() => setTab('overview')} className={`btn btn-sm ${tab === 'overview' ? 'btn-primary' : 'btn-ghost'}`}>📊 Pregled</button>
        <button onClick={() => setTab('leaderboard')} className={`btn btn-sm ${tab === 'leaderboard' ? 'btn-primary' : 'btn-ghost'}`}>🏆 Leaderboard</button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
        {[
          { icon: '💰', value: `€${summary.summary.total_revenue.toFixed(0)}`, label: 'Skupaj promet', color: '#22c55e' },
          { icon: '📋', value: summary.summary.total_orders.toString(), label: 'Naročil', color: '#3b82f6' },
          { icon: '⏱️', value: `${summary.summary.total_hours}h`, label: 'Skupaj ur', color: '#f59e0b' },
          { icon: '👥', value: summary.employees.length.toString(), label: 'Zaposlenih', color: '#8b5cf6' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 24 }}>{s.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#888' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gap: 8 }}>
          {summary.employees.map((emp, i) => (
            <div key={emp.id} style={{
              background: 'var(--card, #fff)', borderRadius: 12, padding: 14,
              display: 'grid', gridTemplateColumns: '40px 1fr 1fr 1fr', gap: 12, alignItems: 'center'
            }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#3b82f6', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>
                {i < 3 ? MEDAL_ICONS[i] : emp.name.charAt(0)}
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{emp.name}</div>
                <div style={{ fontSize: 11, color: '#888' }}>{emp.role}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700 }}>€{emp.total_revenue.toFixed(0)}</div>
                <div style={{ fontSize: 11, color: '#888' }}>{emp.orders_processed} naročil</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>€{emp.revenue_per_hour.toFixed(0)}/h</div>
                <div style={{ fontSize: 11, color: '#888' }}>{emp.total_hours}h</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Leaderboard tab */}
      {tab === 'leaderboard' && (
        <div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {(['revenue', 'orders', 'efficiency'] as const).map(m => (
              <button key={m} onClick={() => setMetric(m)}
                className={`btn btn-sm ${metric === m ? 'btn-primary' : 'btn-ghost'}`}>
                {m === 'revenue' ? '💰 Promet' : m === 'orders' ? '📋 Naročila' : '⚡ Učinkovitost'}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            {leaderboard.map((entry, i) => (
              <div key={entry.id} style={{
                background: 'var(--card, #fff)', borderRadius: 12, padding: 14,
                display: 'flex', alignItems: 'center', gap: 12,
                border: i < 3 ? `2px solid ${i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : '#cd7f32'}` : '2px solid transparent'
              }}>
                <div style={{ fontSize: 28, width: 40, textAlign: 'center' }}>
                  {i < 3 ? MEDAL_ICONS[i] : `#${entry.rank}`}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{entry.name}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{entry.role}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>
                    {metric === 'revenue' ? `€${entry.revenue.toFixed(0)}` :
                     metric === 'orders' ? entry.orders : `€${entry.efficiency.toFixed(0)}/izm`}
                  </div>
                  <div style={{ fontSize: 11, color: '#888' }}>
                    {entry.shifts} izmen • €{entry.revenue.toFixed(0)} / {entry.shifts} = €{entry.efficiency.toFixed(0)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
