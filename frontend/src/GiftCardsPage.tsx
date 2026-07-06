import { useState, useEffect } from 'react'

const api = { authHeader: () => ({ 'Authorization': `Bearer ${localStorage.getItem('pos-token')||''}` }) }

export default function GiftCardsPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [cards, setCards] = useState<any[]>([])
  const [code, setCode] = useState('')
  const [lookup, setLookup] = useState<any>(null)

  const load = () => {
    fetch('/api/v1/gift-cards', { headers: api.authHeader() }).then(r => r.json()).then(setCards)
  }
  useEffect(() => { load() }, [])

  const create = async () => {
    const balance = parseFloat(prompt('Začetni znesek (€):') || '0')
    if (!balance) return
    await fetch('/api/v1/gift-cards', { method: 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ balance }) })
    onNotify('Darilna kartica ustvarjena'); load()
  }

  const topup = async (id: number) => {
    const amount = parseFloat(prompt('Znesek polnjenja (€):') || '0')
    if (!amount) return
    await fetch(`/api/v1/gift-cards/${id}/topup`, { method: 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ amount }) })
    onNotify('Stanje napolnjeno'); load()
  }

  const toggle = async (id: number, active: boolean) => {
    await fetch(`/api/v1/gift-cards/${id}`, { method: 'PUT', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !active }) })
    load()
  }

  const lookupCode = async () => {
    if (!code.trim()) return
    try {
      const r = await fetch(`/api/v1/gift-cards/code/${code.trim()}`, { headers: api.authHeader() }).then(r => r.json())
      setLookup(r)
    } catch { setLookup(null); onNotify('Kartica ne obstaja') }
  }

  return (
    <div className="gift-cards-page">
      <div className="page-header">
        <h2>🎁 Darilne kartice</h2>
        <button onClick={create} className="btn btn-primary btn-sm">+ Nova kartica</button>
      </div>

      <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
        <input className="input" placeholder="🔍 Vnesi kodo kartice..."
          value={code} onChange={e => setCode(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && lookupCode()} style={{ flex: 1 }} />
        <button onClick={lookupCode} className="btn btn-sm">Išči</button>
      </div>

      {lookup && (
        <div className="card" style={{ padding: 12, marginBottom: 12 }}>
          <h3>{lookup.code}</h3>
          <p>Stanje: <strong>{lookup.balance.toFixed(2)} €</strong></p>
          <p>{lookup.active ? '✅ Aktivna' : '🚫 Neaktivna'}</p>
        </div>
      )}

      <table className="table" style={{ width: '100%' }}>
        <thead><tr>
          <th>Koda</th><th>Stanje</th><th>Aktivna</th><th>Ustvarjena</th><th></th>
        </tr></thead>
        <tbody>
          {cards.map(c => (
            <tr key={c.id}>
              <td><code>{c.code}</code></td>
              <td><strong>{c.balance.toFixed(2)} €</strong></td>
              <td>{c.active ? '✅' : '🚫'}</td>
              <td style={{ fontSize: 12 }}>{c.created_at?.slice(0, 10)}</td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <button onClick={() => topup(c.id)} className="btn btn-xs">💰 Polni</button>
                <button onClick={() => toggle(c.id, c.active)} className="btn btn-xs btn-ghost">
                  {c.active ? 'Deaktiviraj' : 'Aktiviraj'}
                </button>
              </td>
            </tr>
          ))}
          {cards.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text2)' }}>Ni darilnih kartic</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
