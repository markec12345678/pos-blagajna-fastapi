import React, { useState, useEffect } from 'react'
import { authHeader } from './api'
import { useTranslation } from './i18n'

export default function DeliveryV4Page({ onNotify }: { onNotify: (m: string) => void }) {
  const { t } = useTranslation()
  const [fleet, setFleet] = useState<any>(null)
  const [tracking, setTracking] = useState<any[]>([])
  const [zones, setZones] = useState<any[]>([])
  const [platforms, setPlatforms] = useState<any>(null)
  const [drivers, setDrivers] = useState<any[]>([])
  const [issues, setIssues] = useState<any>(null)
  const [routes, setRoutes] = useState<any>(null)
  const [weather, setWeather] = useState<any>(null)
  const [tab, setTab] = useState('fleet')

  useEffect(() => {
    fetch('/api/v1/delivery-v4/fleet', { headers: authHeader() }).then(r => r.json()).then(d => setFleet(d)).catch(() => {})
    fetch('/api/v1/delivery-v4/live-tracking', { headers: authHeader() }).then(r => r.json()).then(d => setTracking(d.deliveries || [])).catch(() => {})
    fetch('/api/v1/delivery-v4/zone-analytics', { headers: authHeader() }).then(r => r.json()).then(d => setZones(d.zones || [])).catch(() => {})
    fetch('/api/v1/delivery-v4/platform-integration', { headers: authHeader() }).then(r => r.json()).then(d => setPlatforms(d)).catch(() => {})
    fetch('/api/v1/delivery-v4/driver-performance', { headers: authHeader() }).then(r => r.json()).then(d => setDrivers(d.drivers || [])).catch(() => {})
    fetch('/api/v1/delivery-v4/delivery-issues', { headers: authHeader() }).then(r => r.json()).then(d => setIssues(d)).catch(() => {})
    fetch('/api/v1/delivery-v4/route-optimization', { headers: authHeader() }).then(r => r.json()).then(d => setRoutes(d.optimization || null)).catch(() => {})
    fetch('/api/v1/delivery-v4/weather-impact', { headers: authHeader() }).then(r => r.json()).then(d => setWeather(d.weather || null)).catch(() => {})
  }, [])

  return (
    <div style={{ padding: 16 }}>
      <h2>🚗 Dostava V4</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['fleet', 'tracking', 'zones', 'platforms', 'drivers', 'issues', 'routes', 'weather'] as const).map(s => (
          <button key={s} onClick={() => setTab(s)} className={`btn ${tab === s ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: 12 }}>
            {s === 'fleet' ? 'Flota' : s === 'tracking' ? 'Sledenje' : s === 'zones' ? 'Območja' : s === 'platforms' ? 'Platforme' : s === 'drivers' ? 'Vozniki' : s === 'issues' ? 'Težave' : s === 'routes' ? 'Poti' : 'Vreme'}
          </button>
        ))}
      </div>

      {tab === 'fleet' && fleet && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div className="card" style={{ textAlign: 'center' }}><p style={{ fontSize: 12, color: 'var(--muted)' }}>Aktivni</p><p style={{ fontSize: 24, fontWeight: 700, color: 'var(--green)' }}>{fleet.active_count}</p></div>
            <div className="card" style={{ textAlign: 'center' }}><p style={{ fontSize: 12, color: 'var(--muted)' }}>Skupaj</p><p style={{ fontSize: 24, fontWeight: 700 }}>{fleet.total_drivers}</p></div>
            <div className="card" style={{ textAlign: 'center' }}><p style={{ fontSize: 12, color: 'var(--muted)' }}>Na voljo</p><p style={{ fontSize: 24, fontWeight: 700 }}>{fleet.total_drivers - fleet.active_count}</p></div>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {(fleet.fleet || []).map((d: any) => (
              <div key={d.id} className="card" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
                <div><div style={{ fontWeight: 600 }}>{d.driver}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>{d.vehicle}</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ fontSize: 11, color: 'var(--muted)' }}>Naročila</div><div style={{ fontWeight: 700 }}>{d.orders}</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ fontSize: 11, color: 'var(--muted)' }}>Povprečje</div><div style={{ fontWeight: 700 }}>{d.avg_time} min</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ fontSize: 11, color: 'var(--muted)' }}>Ocena</div><div style={{ fontWeight: 700 }}>★ {d.rating}</div></div>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: d.status === 'on_delivery' ? 'var(--amber)' : d.status === 'available' ? 'var(--green)' : 'var(--muted)', color: '#fff' }}>{d.status === 'on_delivery' ? 'Na dostavi' : d.status === 'available' ? 'Na voljo' : 'Nedosegljiv'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'tracking' && (
        <div style={{ display: 'grid', gap: 12 }}>
          {tracking.map((d: any) => (
            <div key={d.order_id} className="card" style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div><span style={{ fontWeight: 600 }}>#{d.order_id}</span> — {d.customer}</div>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: d.status === 'in_transit' ? 'var(--amber)' : 'var(--green)', color: '#fff' }}>{d.status === 'in_transit' ? 'Na poti' : 'Prevzet'}</span>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                <span>Voznik: <strong>{d.driver}</strong></span>
                <span>ETA: <strong>{d.eta} min</strong></span>
                <span>Razdalja: <strong>{d.distance_km} km</strong></span>
              </div>
              <div style={{ marginTop: 8, background: 'var(--bg, #f1f5f9)', borderRadius: 4, overflow: 'hidden', height: 8 }}>
                <div style={{ width: `${d.progress}%`, background: 'var(--primary, #059669)', height: '100%', borderRadius: 4 }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{d.progress}% dokončano</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'zones' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {zones.map((z: any, i: number) => (
            <div key={i} className="card">
              <h4 style={{ margin: 0 }}>{z.name}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Naročila</div><div style={{ fontWeight: 700 }}>{z.orders}</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Povprečje</div><div style={{ fontWeight: 700 }}>{z.avg_time} min</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Dolžina</div><div style={{ fontWeight: 700 }}>{z.avg_distance} km</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Prihodek</div><div style={{ fontWeight: 700 }}>€{z.revenue}</div></div>
              </div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: 'var(--amber)', fontSize: 14 }}>★</span><span style={{ fontWeight: 700 }}>{z.satisfaction}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'platforms' && platforms && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
            {(platforms.platforms || []).map((p: any, i: number) => (
              <div key={i} className="card">
                <h4 style={{ margin: 0 }}>{p.name}</h4>
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 12, color: 'var(--muted)' }}>Naročila</span><strong>{p.orders_today}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 12, color: 'var(--muted)' }}>Prihodek</span><strong>€{p.revenue}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 12, color: 'var(--muted)' }}>Provizija</span><strong style={{ color: 'var(--red)' }}>€{p.commission}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 12, color: 'var(--muted)' }}>Čas</span><strong>{p.avg_time} min</strong></div>
                </div>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding: 16 }}>
            <h4 style={{ marginTop: 0 }}>Skupaj</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Naročila</div><div style={{ fontSize: 22, fontWeight: 700 }}>{platforms.total_orders}</div></div>
              <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Prihodek</div><div style={{ fontSize: 22, fontWeight: 700 }}>€{platforms.total_revenue?.toLocaleString()}</div></div>
              <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Provizije</div><div style={{ fontSize: 22, fontWeight: 700, color: 'var(--red)' }}>€{platforms.total_commission}</div></div>
            </div>
          </div>
        </div>
      )}

      {tab === 'drivers' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
          {drivers.map((d: any, i: number) => (
            <div key={i} className="card">
              <h4 style={{ margin: 0 }}>{d.name}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Dostave</div><div style={{ fontWeight: 700 }}>{d.deliveries_today}</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Povprečje</div><div style={{ fontWeight: 700 }}>{d.avg_time} min</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Pravočasno</div><div style={{ fontWeight: 700, color: 'var(--green)' }}>{d.on_time_pct}%</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Ocena</div><div style={{ fontWeight: 700 }}>★ {d.rating}</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Napitnina</div><div style={{ fontWeight: 700 }}>€{d.tip_avg}</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Razdalja</div><div style={{ fontWeight: 700 }}>{d.distance_km} km</div></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'issues' && issues && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div className="card" style={{ textAlign: 'center' }}><p style={{ fontSize: 12, color: 'var(--muted)' }}>Težave</p><p style={{ fontSize: 24, fontWeight: 700 }}>{issues.total_issues}</p></div>
            <div className="card" style={{ textAlign: 'center' }}><p style={{ fontSize: 12, color: 'var(--muted)' }}>Rešeno</p><p style={{ fontSize: 24, fontWeight: 700, color: 'var(--green)' }}>{issues.resolution_rate}%</p></div>
            <div className="card" style={{ textAlign: 'center' }}><p style={{ fontSize: 12, color: 'var(--muted)' }}>Povprečen čas</p><p style={{ fontSize: 24, fontWeight: 700 }}>{issues.avg_resolution_time} min</p></div>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {(issues.issues || []).map((is: any) => (
              <div key={is.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', borderLeft: `4px solid ${is.status === 'resolved' ? 'var(--green)' : 'var(--amber)'}` }}>
                <span style={{ fontSize: 24 }}>{is.type === 'late_delivery' ? '⏰' : is.type === 'wrong_order' ? '❌' : '🥶'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>Naročilo #{is.order_id} — {is.type.replace(/_/g, ' ')}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{is.reason}</div>
                </div>
                <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 12, background: is.status === 'resolved' ? 'var(--green)' : 'var(--amber)', color: '#fff' }}>{is.status === 'resolved' ? 'Rešeno' : 'V obdelavi'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'routes' && routes && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="card" style={{ padding: 16 }}>
            <h4 style={{ marginTop: 0 }}>Trenutne poti</h4>
            {(routes.current_routes || []).map((r: any, i: number) => (
              <div key={i} style={{ padding: 8, background: 'var(--bg, #f1f5f9)', borderRadius: 8, marginTop: 8 }}>
                <div style={{ fontWeight: 600 }}>{r.driver}</div>
                <div style={{ fontSize: 12 }}>{r.stops} postankov · {r.total_distance} km · {r.estimated_time} min</div>
                <div style={{ fontSize: 12, color: 'var(--red)' }}>Gorivo: €{r.fuel_cost}</div>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding: 16 }}>
            <h4 style={{ marginTop: 0 }}>Optimizirane poti</h4>
            {(routes.optimized_routes || []).map((r: any, i: number) => (
              <div key={i} style={{ padding: 8, background: 'var(--bg, #f1f5f9)', borderRadius: 8, marginTop: 8 }}>
                <div style={{ fontWeight: 600 }}>{r.driver} <span style={{ fontSize: 11, color: 'var(--green)' }}>({r.savings} prihranek)</span></div>
                <div style={{ fontSize: 12 }}>{r.stops} postankov · {r.total_distance} km · {r.estimated_time} min</div>
                <div style={{ fontSize: 12, color: 'var(--green)' }}>Gorivo: €{r.fuel_cost}</div>
              </div>
            ))}
            <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: 'rgba(5,150,105,0.1)' }}>
              <div style={{ fontWeight: 600, color: 'var(--green)' }}>Skupni prihranek</div>
              <div style={{ fontSize: 12 }}>{routes.total_savings?.distance_km} km · {routes.total_savings?.time_min} min · €{routes.total_savings?.fuel_eur}</div>
            </div>
          </div>
        </div>
      )}

      {tab === 'weather' && weather && (
        <div>
          <div className="card" style={{ padding: 16, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><h4 style={{ margin: 0 }}>{weather.current?.condition}</h4><p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>{weather.current?.temp}°C, veter {weather.current?.wind_kmh} km/h</p></div>
              <span style={{ fontSize: 32 }}>{weather.current?.condition === 'Deževeno' ? '🌧️' : weather.current?.condition === 'Sončno' ? '☀️' : '⛅'}</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div className="card" style={{ textAlign: 'center' }}><p style={{ fontSize: 11, color: 'var(--muted)' }}>Podaljšanje časa</p><p style={{ fontSize: 22, fontWeight: 700, color: 'var(--amber)' }}>+{weather.impact?.delivery_time_increase}%</p></div>
            <div className="card" style={{ textAlign: 'center' }}><p style={{ fontSize: 11, color: 'var(--muted)' }}>Povečanje naročil</p><p style={{ fontSize: 22, fontWeight: 700, color: 'var(--green)' }}>+{weather.impact?.order_increase}%</p></div>
            <div className="card" style={{ textAlign: 'center' }}><p style={{ fontSize: 11, color: 'var(--muted)' }}>Razpoložljivost</p><p style={{ fontSize: 22, fontWeight: 700 }}>{weather.impact?.driver_availability}%</p></div>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <h4 style={{ marginTop: 0 }}>Napoved</h4>
            {(weather.forecast || []).map((f: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontWeight: 600 }}>{f.day}</span>
                <span>{f.condition}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{f.impact}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
