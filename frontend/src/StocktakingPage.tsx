import { useState, useEffect } from 'react'
import * as api from './api'
import { useTranslation } from './i18n'

const API = '/api/v1/inventory'

export default function StocktakingPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const { t } = useTranslation()
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [sessionData, setSessionData] = useState<any>(null)
  const [branches, setBranches] = useState<any[]>([])
  const [selBranch, setSelBranch] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/v1/branches', { headers: api.authHeader() }).then(r => r.json()).then(setBranches).catch(() => {})
    loadSessions()
  }, [])

  const loadSessions = async () => {
    const r = await fetch(`${API}/stock-counts`, { headers: api.authHeader() })
    setSessions(await r.json())
    setLoading(false)
  }

  const loadSession = async (id: number) => {
    const r = await fetch(`${API}/stock-counts/${id}`, { headers: api.authHeader() })
    setSessionData(await r.json())
    setSessionId(id)
  }

  const createSession = async () => {
    const r = await fetch(`${API}/stock-counts`, {
      method: 'POST',
      headers: { ...api.authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ branch_id: selBranch })
    })
    const data = await r.json()
    onNotify(`Popis #${data.id} ustvarjen (${data.total_items} sestavin)`)
    loadSessions()
    loadSession(data.id)
  }

  const updateCount = async (itemId: number, val: string) => {
    const num = parseFloat(val)
    if (isNaN(num)) return
    await fetch(`${API}/stock-counts/${sessionId}/items/${itemId}`, {
      method: 'PUT',
      headers: { ...api.authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ physical_quantity: num })
    })
    loadSession(sessionId!)
  }

  const completeSession = async () => {
    if (!confirm('Zaključi popis? Sistem bo prilagodil stanja zalog glede na vnesene količine.')) return
    const r = await fetch(`${API}/stock-counts/${sessionId}/complete`, {
      method: 'POST',
      headers: api.authHeader()
    })
    const data = await r.json()
    onNotify(`Popis #${sessionId} zaključen — ${data.total_adjustments} prilagoditev`)
    setSessionId(null)
    setSessionData(null)
    loadSessions()
  }

  const deleteSession = async (id: number) => {
    if (!confirm(`Izbriši popis #${id}?`)) return
    await fetch(`${API}/stock-counts/${id}`, { method: 'DELETE', headers: api.authHeader() })
    onNotify(`Popis #${id} izbrisan`)
    loadSessions()
  }

  const statusBadge = (s: string) => {
    const st = s === 'completed' ? { bg: '#059669', label: 'Zaključen' } :
               s === 'in_progress' ? { bg: '#3b82f6', label: 'V teku' } :
               { bg: '#6b7280', label: 'Osnutek' }
    return <span style={{ background: st.bg, color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 10 }}>{st.label}</span>
  }

  if (sessionId && sessionData) {
    const grouped: Record<string, any[]> = {}
    for (const item of sessionData.items) {
      const cat = item.category || 'other'
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(item)
    }

    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => { setSessionId(null); setSessionData(null) }} className="btn btn-sm btn-ghost">← Nazaj</button>
          <h2 style={{ margin: 0 }}>📋 Popis #{sessionData.id}</h2>
          {statusBadge(sessionData.status)}
          <span style={{ color: 'var(--text2)', fontSize: 13 }}>
            {new Date(sessionData.created_at).toLocaleDateString('sl-SI')}
          </span>
          {sessionData.status !== 'completed' && (
            <button onClick={completeSession} className="btn btn-sm btn-primary" style={{ marginLeft: 'auto' }}>
              ✅ Zaključi popis
            </button>
          )}
        </div>

        {/* Barcode scanner */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          <input className="input" placeholder="Skeniraj črtno kodo za hiter vnos..." id="stocktaking-barcode"
            style={{ flex: 1, maxWidth: 350, fontSize: 14 }}
            onKeyDown={async e => {
              if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                const code = (e.target as HTMLInputElement).value.trim()
                try {
                  const r = await fetch(`${API}/barcode/${encodeURIComponent(code)}`, { headers: api.authHeader() })
                  if (r.ok) {
                    const ing = await r.json()
                    const item = sessionData?.items?.find((it: any) => it.ingredient_name.toLowerCase() === ing.name.toLowerCase())
                    if (item) {
                      // auto-focus the physical quantity input
                      const inputs = document.querySelectorAll<HTMLInputElement>(`[data-ingredient-id="${item.id}"]`)
                      if (inputs.length > 0) inputs[0].focus()
                    } else {
                      onNotify(`Sestavina "${ing.name}" ni v popisu`)
                    }
                  } else {
                    onNotify('Črtna koda ni najdena')
                  }
                } catch { onNotify('Napaka pri iskanju kode') }
                ;(e.target as HTMLInputElement).value = ''
              }
            }} />
          <span style={{ fontSize: 11, color: 'var(--text2)' }}>Skeniraj → preskoči na sestavino</span>
        </div>

        {Object.entries(grouped).map(([catName, items]) => {
          const counts = items.filter(i => i.physical_quantity !== null).length
          return (
            <div key={catName} style={{ marginBottom: 24 }}>
              <h4 style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--text2)', textTransform: 'uppercase' }}>
                {catName === 'food' ? '🍕 Hrana' : catName === 'drink' ? '🥤 Pijača' : '📦 Drugo'}
                <span style={{ marginLeft: 8, fontWeight: 400, fontSize: 12 }}>{counts}/{items.length} preštetih</span>
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
                {items.map(item => {
                  const variance = item.physical_quantity !== null
                    ? Math.round((item.physical_quantity - item.system_quantity) * 1000) / 1000
                    : null
                  const hasVar = variance !== null && Math.abs(variance) > 0.001
                  return (
                    <div key={item.id} style={{
                      background: 'var(--card)', borderRadius: 10, padding: 12,
                      border: hasVar ? `2px solid ${variance! > 0 ? 'var(--green)' : 'var(--red)'}` : '1px solid var(--border)'
                    }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{item.ingredient_name}</div>
                      <div style={{ color: 'var(--text2)', fontSize: 12, marginBottom: 8 }}>
                        {item.unit} • Sistem: <strong>{item.system_quantity}</strong>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input type="number" step="0.001" className="input"
                          data-ingredient-id={item.id}
                          value={item.physical_quantity ?? ''}
                          onChange={e => updateCount(item.id, e.target.value)}
                          placeholder="Fizična količina"
                          disabled={sessionData.status === 'completed'}
                          style={{ flex: 1, fontSize: 14, padding: '6px 8px' }} />
                        {hasVar && (
                          <span style={{ fontSize: 13, fontWeight: 600, color: variance! > 0 ? 'var(--green)' : 'var(--red)', whiteSpace: 'nowrap' }}>
                            {variance! > 0 ? '+' : ''}{variance}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Completed adjustments summary */}
        {sessionData.status === 'completed' && (
          <button onClick={async () => {
            const r = await fetch(`${API}/stock-counts/${sessionId}`, { headers: api.authHeader() })
            const fresh = await r.json()
            setSessionData(fresh)
          }} className="btn btn-sm btn-ghost" style={{ marginTop: 12 }}>🔄 Osveži</button>
        )}
      </div>
    )
  }

  if (loading) return <div className="loading-state">{t('common.loading')}</div>

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>📦 Popis zalog</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="input" value={selBranch || ''} onChange={e => setSelBranch(parseInt(e.target.value) || null)} style={{ width: 140, fontSize: 12 }}>
            <option value="">Vse podružnice</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button onClick={createSession} className="btn btn-sm btn-primary">+ Nov popis</button>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <p>Ni popisov. Kliknite "Nov popis" za začetek.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {sessions.map(s => (
            <div key={s.id} onClick={() => loadSession(s.id)} style={{
              background: 'var(--card)', borderRadius: 10, padding: '12px 16px', cursor: 'pointer',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              border: '1px solid var(--border)'
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Popis #{s.id}</div>
                <div style={{ color: 'var(--text2)', fontSize: 12 }}>
                  {new Date(s.created_at).toLocaleDateString('sl-SI')} • {s.total_items} sestavin • {s.counted_items} preštetih
                  {s.branch_id ? ` • Podružnica #${s.branch_id}` : ''}
                </div>
                {s.notes && <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>{s.notes}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {statusBadge(s.status)}
                <button onClick={e => { e.stopPropagation(); deleteSession(s.id) }} className="btn btn-sm btn-ghost" title="Izbriši">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}