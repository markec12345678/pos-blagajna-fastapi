import { useState, useEffect } from 'react'

interface Tier { name: string; name_en: string; min_points: number; multiplier: number; color: string; benefits: string }

export default function LoyaltyTiersPage({ onNotify }: { onNotify: (m: string) => void }) {
  const [customers, setCustomers] = useState<any[]>([])
  const [tiers, setTiers] = useState<Tier[]>([])
  const [editing, setEditing] = useState(false)
  const [editTiers, setEditTiers] = useState<Tier[]>([])

  const load = async () => {
    const [custR, tierR] = await Promise.all([
      fetch('/api/v1/loyalty/customers-with-tiers', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } }),
      fetch('/api/v1/loyalty/tiers', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } })
    ])
    setCustomers(await custR.json())
    setTiers(await tierR.json())
  }

  useEffect(() => { load() }, [])

  const saveTiers = async () => {
    await fetch('/api/v1/loyalty/tiers', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') },
      body: JSON.stringify({ tiers: editTiers })
    })
    onNotify('Stopnje posodobljene')
    setEditing(false)
    setTiers(editTiers)
    load()
  }

  const updateTier = (i: number, field: string, val: any) => {
    const copy = [...editTiers]
    copy[i] = { ...copy[i], [field]: val }
    setEditTiers(copy)
  }

  const addTier = () => {
    setEditTiers([...editTiers, { name: '', name_en: '', min_points: 0, multiplier: 1.0, color: '#888', benefits: '' }])
  }

  const removeTier = (i: number) => {
    if (!confirm('Odstranim stopnjo?')) return
    setEditTiers(editTiers.filter((_, idx) => idx !== i))
  }

  const sortedTiers = [...tiers].sort((a, b) => a.min_points - b.min_points)
  const sortedCust = [...customers]

  return (
    <div className="page-container" style={{ maxWidth: 1000, margin: '0 auto', padding: 20 }}>
      <div className="page-header-sm">
        <h2 className="page-title">🏆 Loyalty stopnje</h2>
        <button onClick={() => { setEditTiers(JSON.parse(JSON.stringify(tiers))); setEditing(true) }} className="btn btn-primary btn-sm">⚙️ Uredi stopnje</button>
      </div>

      {/* Tier cards */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        {sortedTiers.map((t, i) => (
          <div key={i} className="card" style={{
            flex: '1 0 180px', padding: 16, textAlign: 'center',
            borderTop: `3px solid ${t.color}`
          }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: t.color }}>{t.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>od {t.min_points} točk</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>{t.multiplier}× točke</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>{t.benefits}</div>
          </div>
        ))}
      </div>

      {/* Customer table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Stranka</th>
              <th>Telefon</th>
              <th>Točke</th>
              <th>Stopnja</th>
              <th>Napredek</th>
              <th>Skupaj zapravil</th>
            </tr>
          </thead>
          <tbody>
            {sortedCust.map(c => {
              const next = c.next_tier
              const maxPoints = next ? next.min_points : c.points + 1
              const minPoints = sortedTiers.find(t => t.name === c.tier.name)?.min_points || 0
              const progress = next ? ((c.points - minPoints) / (next.min_points - minPoints)) * 100 : 100
              return (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td style={{ color: 'var(--text2)', fontSize: 13 }}>{c.phone || '—'}</td>
                  <td style={{ fontWeight: 700 }}>{c.points}</td>
                  <td>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4,
                      background: (c.tier.color || '#888') + '22',
                      color: c.tier.color || '#888', fontWeight: 600, fontSize: 13
                    }}>{c.tier.name}</span>
                  </td>
                  <td>
                    {next ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(progress, 100)}%`, height: '100%', borderRadius: 3, background: c.tier.color || '#888', transition: 'width 0.3s' }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                          {next.points_needed} do {next.name}
                        </span>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text2)' }}>MAX</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>{c.total_spent.toFixed(2)} €</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Edit tiers modal */}
      {editing && (
        <div className="overlay" onClick={() => setEditing(false)}>
          <div className="modal modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <h3 style={{ marginTop: 0 }}>Uredi loyalty stopnje</h3>
            <p style={{ fontSize: 12, color: 'var(--text2)', margin: '0 0 12px 0' }}>
              Stopnje so razvrščene po min_points. Čim višja stopnja, tem več točk potrebuje.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {editTiers.map((t, i) => (
                <div key={i} style={{ padding: 12, borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <input className="input" placeholder="Ime (SL)" value={t.name} onChange={e => updateTier(i, 'name', e.target.value)} style={{ flex: 1 }} />
                    <input className="input" placeholder="Ime (EN)" value={t.name_en} onChange={e => updateTier(i, 'name_en', e.target.value)} style={{ flex: 1 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <input className="input" type="number" placeholder="Min točk" value={t.min_points} onChange={e => updateTier(i, 'min_points', parseInt(e.target.value) || 0)} style={{ flex: 1 }} />
                    <input className="input" type="number" step="0.1" placeholder="Multiplikator" value={t.multiplier} onChange={e => updateTier(i, 'multiplier', parseFloat(e.target.value) || 1)} style={{ flex: 1 }} />
                    <input className="input" type="color" value={t.color} onChange={e => updateTier(i, 'color', e.target.value)} style={{ width: 50 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input className="input" placeholder="Ugodnosti (npr. 1.5× točke)" value={t.benefits} onChange={e => updateTier(i, 'benefits', e.target.value)} style={{ flex: 1 }} />
                    <button onClick={() => removeTier(i)} className="btn btn-sm btn-ghost" style={{ color: '#ef4444' }}>✕</button>
                  </div>
                </div>
              ))}
              <button onClick={addTier} className="btn btn-sm btn-ghost">+ Dodaj stopnjo</button>
            </div>
            <div className="modal-btns" style={{ marginTop: 16 }}>
              <button onClick={saveTiers} className="btn btn-primary">Shrani</button>
              <button onClick={() => setEditing(false)} className="btn btn-ghost">Prekliči</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
