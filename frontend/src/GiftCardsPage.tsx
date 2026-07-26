import { useState, useEffect } from 'react'
import * as api from './api'

export default function GiftCardsPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [cards, setCards] = useState<any[]>([])
  const [code, setCode] = useState('')
  const [lookup, setLookup] = useState<any>(null)
  const [modal, setModal] = useState<'create' | 'batch' | 'topup' | 'history' | null>(null)
  const [selectedCard, setSelectedCard] = useState<any>(null)
  const [form, setForm] = useState({ balance: 10, count: 10, notes: '', expires_at: '' })
  const [topupAmount, setTopupAmount] = useState(10)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const load = () => {
    fetch('/api/v1/gift-cards', { headers: api.authHeader() }).then(r => r.json()).then(setCards)
  }
  useEffect(() => { load() }, [])

  const createCard = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/v1/gift-cards', {
        method: 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ balance: form.balance, notes: form.notes, expires_at: form.expires_at || null })
      })
      if (r.ok) { onNotify('Darilna kartica ustvarjena'); setModal(null); load() }
    } catch { onNotify('Napaka') }
    setLoading(false)
  }

  const batchGenerate = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/v1/gift-cards/batch', {
        method: 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: form.count, balance: form.balance, notes: form.notes, expires_at: form.expires_at || null })
      })
      const d = await r.json()
      if (r.ok) { onNotify(`Ustvarjenih ${d.count} kartic`); setModal(null); load() }
      else { onNotify(d.detail || 'Napaka') }
    } catch { onNotify('Napaka') }
    setLoading(false)
  }

  const topupCard = async () => {
    if (!selectedCard || topupAmount <= 0) return
    setLoading(true)
    try {
      const r = await fetch(`/api/v1/gift-cards/${selectedCard.id}/topup`, {
        method: 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: topupAmount })
      })
      if (r.ok) { onNotify(`Napolnjeno ${topupAmount} €`); setModal(null); load() }
    } catch { onNotify('Napaka') }
    setLoading(false)
  }

  const toggle = async (id: number, active: boolean) => {
    await fetch(`/api/v1/gift-cards/${id}`, { method: 'PUT', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !active }) })
    load()
  }

  const loadHistory = async (card: any) => {
    setSelectedCard(card)
    try {
      const r = await fetch(`/api/v1/gift-cards/${card.id}/transactions`, { headers: api.authHeader() })
      setHistory(await r.json())
    } catch { setHistory([]) }
    setModal('history')
  }

  const lookupCode = async () => {
    if (!code.trim()) return
    try {
      const r = await fetch(`/api/v1/gift-cards/code/${code.trim()}`, { headers: api.authHeader() })
      if (r.ok) setLookup(await r.json())
      else { setLookup(null); onNotify('Kartica ne obstaja') }
    } catch { setLookup(null) }
  }

  const isExpired = (card: any) => card.expires_at && new Date(card.expires_at) < new Date()

  return (
    <div className="gift-cards-page">
      <div className="page-header">
        <h2>🎁 Darilne kartice</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setForm({ balance: 10, count: 10, notes: '', expires_at: '' }); setModal('create') }} className="btn btn-primary btn-sm">+ Nova kartica</button>
          <button onClick={() => { setForm({ balance: 10, count: 10, notes: '', expires_at: '' }); setModal('batch') }} className="btn btn-sm btn-ghost">📦 Serijska proizvodnja</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
        <input className="input" placeholder="🔍 Vnesi kodo kartice..."
          value={code} onChange={e => setCode(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && lookupCode()} style={{ flex: 1 }} />
        <button onClick={lookupCode} className="btn btn-sm">Išči</button>
      </div>

      {lookup && (
        <div className="card" style={{ padding: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0 }}><code>{lookup.code}</code></h3>
              <p style={{ margin: '4px 0' }}>Stanje: <strong>{lookup.balance.toFixed(2)} €</strong></p>
              <p style={{ margin: 0 }}>{lookup.active ? '✅ Aktivna' : '🚫 Neaktivna'}</p>
            </div>
          </div>
        </div>
      )}

      <table className="table" style={{ width: '100%' }}>
        <thead><tr>
          <th>Koda</th><th>Stanje</th><th>Poteče</th><th>Aktivna</th><th>Ustvarjena</th><th></th>
        </tr></thead>
        <tbody>
          {cards.map(c => (
            <tr key={c.id} style={isExpired(c) ? { opacity: 0.5 } : undefined}>
              <td><code>{c.code}</code></td>
              <td><strong>{c.balance.toFixed(2)} €</strong></td>
              <td style={{ fontSize: 12 }}>{c.expires_at ? c.expires_at.slice(0, 10) : '—'}</td>
              <td>{c.active ? '✅' : '🚫'}</td>
              <td style={{ fontSize: 12 }}>{c.created_at?.slice(0, 10)}</td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <button onClick={() => { setSelectedCard(c); setTopupAmount(10); setModal('topup') }} className="btn btn-xs">💰 Polni</button>
                <button onClick={() => loadHistory(c)} className="btn btn-xs btn-ghost">📜 Zgodovina</button>
                <button onClick={() => toggle(c.id, c.active)} className="btn btn-xs btn-ghost">
                  {c.active ? 'Deaktiviraj' : 'Aktiviraj'}
                </button>
              </td>
            </tr>
          ))}
          {cards.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text2)' }}>Ni darilnih kartic</td></tr>}
        </tbody>
      </table>

      {/* Create single card modal */}
      {modal === 'create' && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal modal-card" onClick={e => e.stopPropagation()}>
            <h3>🎁 Nova darilna kartica</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text2)' }}>Začetni znesek (€)</label>
                <input type="number" className="input" value={form.balance} min={0} step={0.5}
                  onChange={e => setForm(p => ({ ...p, balance: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text2)' }}>Rok veljavnosti (opcijsko)</label>
                <input type="date" className="input" value={form.expires_at}
                  onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text2)' }}>Opombe</label>
                <input className="input" value={form.notes} placeholder="Npr. za promocijo"
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div className="modal-btns">
              <button onClick={createCard} className="btn btn-primary" disabled={loading}>
                {loading ? 'Ustvarjam...' : `Ustvari (${form.balance} €)`}
              </button>
              <button onClick={() => setModal(null)} className="btn btn-ghost">Prekliči</button>
            </div>
          </div>
        </div>
      )}

      {/* Batch generation modal */}
      {modal === 'batch' && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal modal-card" onClick={e => e.stopPropagation()}>
            <h3>📦 Serijska proizvodnja kartic</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text2)' }}>Število kartic (1–500)</label>
                <input type="number" className="input" value={form.count} min={1} max={500}
                  onChange={e => setForm(p => ({ ...p, count: parseInt(e.target.value) || 1 }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text2)' }}>Začetni znesek na kartici (€)</label>
                <input type="number" className="input" value={form.balance} min={0} step={0.5}
                  onChange={e => setForm(p => ({ ...p, balance: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text2)' }}>Rok veljavnosti (opcijsko)</label>
                <input type="date" className="input" value={form.expires_at}
                  onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text2)' }}>Opombe</label>
                <input className="input" value={form.notes} placeholder="Npr. za promocijo"
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
              <div style={{ padding: 12, background: 'var(--bg)', borderRadius: 8, fontSize: 13 }}>
                Skupaj: <strong>{form.count} kartic</strong> × <strong>{form.balance} €</strong> = <strong style={{ color: 'var(--green)' }}>{(form.count * form.balance).toLocaleString('sl-SI')} €</strong>
              </div>
            </div>
            <div className="modal-btns">
              <button onClick={batchGenerate} className="btn btn-primary" disabled={loading || form.count < 1}>
                {loading ? 'Ustvarjam...' : `Ustvari ${form.count} kartic`}
              </button>
              <button onClick={() => setModal(null)} className="btn btn-ghost">Prekliči</button>
            </div>
          </div>
        </div>
      )}

      {/* Topup modal */}
      {modal === 'topup' && selectedCard && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal modal-card" onClick={e => e.stopPropagation()}>
            <h3>💰 Polnitev kartice</h3>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>
              Koda: <code>{selectedCard.code}</code> | Trenutno stanje: <strong>{selectedCard.balance.toFixed(2)} €</strong>
            </div>
            <input type="number" className="input" value={topupAmount} min={0.5} step={0.5}
              onChange={e => setTopupAmount(parseFloat(e.target.value) || 0)}
              placeholder="Znesek polnitve (€)" />
            <div className="modal-btns">
              <button onClick={topupCard} className="btn btn-primary" disabled={loading || topupAmount <= 0}>
                {loading ? 'Polnim...' : `Polni ${topupAmount} €`}
              </button>
              <button onClick={() => setModal(null)} className="btn btn-ghost">Prekliči</button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction history modal */}
      {modal === 'history' && selectedCard && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <h3>📜 Zgodovina — {selectedCard.code}</h3>
            {history.length === 0 ? (
              <p style={{ color: 'var(--text2)', textAlign: 'center' }}>Ni transakcij</p>
            ) : (
              <table className="table" style={{ fontSize: 12 }}>
                <thead><tr>
                  <th>Datum</th><th>Tip</th><th>Znesek</th><th>Opis</th>
                </tr></thead>
                <tbody>
                  {history.map(t => (
                    <tr key={t.id}>
                      <td>{t.created_at?.slice(0, 16)}</td>
                      <td>{t.type === 'topup' ? '💰 Polnitev' : t.type === 'redemption' ? '🛒 Poraba' : t.type}</td>
                      <td style={{ color: t.amount > 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                        {t.amount > 0 ? '+' : ''}{t.amount.toFixed(2)} €
                      </td>
                      <td style={{ fontSize: 11 }}>{t.reference || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="modal-btns">
              <button onClick={() => setModal(null)} className="btn btn-ghost">Zapri</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
