import { useState } from 'react'
import * as api from './api'

interface AISearchResult {
  id: number
  reason: string
}

interface AIComboSuggestion {
  id: number
  reason: string
}

export function AISearchPanel({ onSelect, onClose }: {
  onSelect: (itemId: number) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AISearchResult[]>([])
  const [loading, setLoading] = useState(false)

  const search = async () => {
    if (!query.trim()) return
    setLoading(true)
    try {
      const r = await fetch('/api/v1/ai/search', {
        method: 'POST',
        headers: { ...api.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      })
      if (r.ok) {
        const data = await r.json()
        setResults(data.results || [])
      }
    } catch {}
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420, padding: 20 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>🤖 AI Iskanje</h3>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--text2)' }}>Opiši kaj iščeš v naravnem jeziku</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="npr. nekaj lahkega za vegetarijance..." autoFocus
            style={{ flex: 1 }} />
          <button onClick={search} className="btn btn-primary" disabled={loading}>
            {loading ? '...' : '🔍'}
          </button>
        </div>
        {results.length > 0 && (
          <div style={{ marginTop: 12, maxHeight: 300, overflowY: 'auto' }}>
            {results.map(r => (
              <button key={r.id} onClick={() => { onSelect(r.id); onClose() }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px',
                  background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8,
                  marginBottom: 6, cursor: 'pointer', fontSize: 13 }}>
                <div style={{ fontWeight: 600 }}>Artikel #{r.id}</div>
                {r.reason && <div style={{ color: 'var(--text2)', fontSize: 11 }}>{r.reason}</div>}
              </button>
            ))}
          </div>
        )}
        <button onClick={onClose} className="btn btn-ghost" style={{ marginTop: 12, width: '100%' }}>Zapri</button>
      </div>
    </div>
  )
}

export function AIComboPanel({ cartItems, onSelect, onClose }: {
  cartItems: any[]
  onSelect: (itemId: number) => void
  onClose: () => void
}) {
  const [suggestions, setSuggestions] = useState<AIComboSuggestion[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/v1/ai/combos', {
        method: 'POST',
        headers: { ...api.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart_items: cartItems.map(i => ({ name: i.name, price: i.price })) })
      })
      if (r.ok) {
        const data = await r.json()
        setSuggestions(data.suggestions || [])
      }
    } catch {}
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 400, padding: 20 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>🤖 AI Predlogi</h3>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--text2)' }}>Razmišljam...</div>
        ) : suggestions.length > 0 ? (
          <div>
            <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>Morda bi dodali še:</p>
            {suggestions.map(s => (
              <button key={s.id} onClick={() => { onSelect(s.id); onClose() }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px',
                  background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8,
                  marginBottom: 6, cursor: 'pointer', fontSize: 13 }}>
                <div style={{ fontWeight: 600 }}>Artikel #{s.id}</div>
                {s.reason && <div style={{ color: 'var(--text2)', fontSize: 11 }}>{s.reason}</div>}
              </button>
            ))}
          </div>
        ) : (
          <button onClick={load} className="btn btn-primary" style={{ width: '100%' }}>
            🤖 Predlaga kombinacije
          </button>
        )}
        <button onClick={onClose} className="btn btn-ghost" style={{ marginTop: 12, width: '100%' }}>Zapri</button>
      </div>
    </div>
  )
}
