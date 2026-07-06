import { useState, useEffect } from 'react'
import * as api from './api'

export default function LoyaltyPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [members, setMembers] = useState<any[]>([])
  const [settings, setSettings] = useState<any>({})
  const [selected, setSelected] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [tab, setTab] = useState<'members' | 'settings'>('members')
  const [adjPoints, setAdjPoints] = useState('')
  const [adjNote, setAdjNote] = useState('')

  const loadMembers = async () => {
    try { const r = await fetch('/api/v1/loyalty', { headers: api.authHeader() }).then(r => r.json()); setMembers(r) } catch {}
  }

  const loadSettings = async () => {
    try { const r = await fetch('/api/v1/loyalty/settings', { headers: api.authHeader() }).then(r => r.json()); setSettings(r) } catch {}
  }

  useEffect(() => { loadMembers(); loadSettings() }, [])

  const loadDetail = async (id: number) => {
    try {
      const r = await fetch(`/api/v1/loyalty/${id}`, { headers: api.authHeader() }).then(r => r.json())
      setSelected(r)
      setHistory(r.history || [])
    } catch {}
  }

  const saveSettings = async () => {
    await fetch('/api/v1/loyalty/settings', {
      method: 'PUT', headers: { ...api.authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    })
    onNotify('Nastavitve shranjene')
  }

  const adjust = async (id: number) => {
    if (!adjPoints) return
    await fetch('/api/v1/loyalty/adjust', {
      method: 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: id, points: parseInt(adjPoints), note: adjNote })
    })
    onNotify('Točke prilagojene')
    setAdjPoints(''); setAdjNote('')
    loadDetail(id); loadMembers()
  }

  return (
    <div className="loyalty-page">
      <div className="page-header">
        <h2>🎁 Loyalty program</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setTab('members'); loadMembers() }} className={`btn btn-sm ${tab === 'members' ? 'btn-primary' : 'btn-ghost'}`}>Člani</button>
          <button onClick={() => { setTab('settings'); loadSettings() }} className={`btn btn-sm ${tab === 'settings' ? 'btn-primary' : 'btn-ghost'}`}>Nastavitve</button>
        </div>
      </div>

      {tab === 'members' && (
        <div style={{ display: 'flex', gap: 16 }}>
          <div className="card" style={{ flex: 1, padding: 12, maxHeight: 'calc(100vh - 140px)', overflow: 'auto' }}>
            <h4 className="mb-8">Člani ({members.length})</h4>
            {members.map(m => (
              <div key={m.id} onClick={() => loadDetail(m.id)}
                style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)' }}>{m.phone || m.email || '—'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: 'var(--gold)' }}>{m.points} pts</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)' }}>{m.total_spent?.toFixed(2)} €</div>
                </div>
              </div>
            ))}
            {members.length === 0 && <p style={{ color: 'var(--text2)', fontSize: 13 }}>Ni članov</p>}
          </div>

          {selected && (
            <div className="card" style={{ flex: 2, padding: 12, maxHeight: 'calc(100vh - 140px)', overflow: 'auto' }}>
              <h4 className="mb-8">{selected.customer_name}</h4>
              <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                <div className="card" style={{ padding: '8px 16', textAlign: 'center', flex: 1, background: 'var(--surface2)' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--gold)' }}>{selected.balance}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>Stanje</div>
                </div>
                <div className="card" style={{ padding: '8px 16', textAlign: 'center', flex: 1, background: 'var(--surface2)' }}>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{selected.total_earned}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>Skupaj pridobljeno</div>
                </div>
                <div className="card" style={{ padding: '8px 16', textAlign: 'center', flex: 1, background: 'var(--surface2)' }}>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{selected.total_redeemed}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>Skupaj unovčeno</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input className="input" type="number" placeholder="Točke" value={adjPoints} onChange={e => setAdjPoints(e.target.value)} style={{ width: 100 }} />
                <input className="input" placeholder="Opomba" value={adjNote} onChange={e => setAdjNote(e.target.value)} style={{ flex: 1 }} />
                <button onClick={() => adjust(selected.customer_id)} className="btn btn-sm btn-primary">Prilagodi</button>
              </div>

              <h5 style={{ marginBottom: 8, fontSize: 13 }}>Zgodovina</h5>
              {history.map((t: any) => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <div>
                    <span style={{ color: t.points > 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                      {t.points > 0 ? '+' : ''}{t.points}
                    </span>
                    <span style={{ marginLeft: 8, color: 'var(--text2)' }}>{t.type}</span>
                    {t.note && <span style={{ marginLeft: 8, color: 'var(--text2)', fontSize: 11 }}>— {t.note}</span>}
                  </div>
                  <span style={{ color: 'var(--text2)', fontSize: 11 }}>{t.created_at ? new Date(t.created_at).toLocaleString('sl-SI') : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'settings' && (
        <div className="card" style={{ padding: 16, maxWidth: 500 }}>
          <div className="settings-field">
            <label>Točk na 1 € (loyalty_rate)</label>
            <input className="input" type="number" min="0.1" step="0.1" value={settings.loyalty_rate || '1'} onChange={e => setSettings((s: any) => ({ ...s, loyalty_rate: e.target.value }))} />
          </div>
          <div className="settings-field">
            <label>Minimalno točk za unovčenje (loyalty_min_redeem)</label>
            <input className="input" type="number" min="1" value={settings.loyalty_min_redeem || '100'} onChange={e => setSettings((s: any) => ({ ...s, loyalty_min_redeem: e.target.value }))} />
          </div>
          <div className="settings-field">
            <label>Unovčenje: X točk = 1 € (loyalty_redeem_rate)</label>
            <input className="input" type="number" min="1" value={settings.loyalty_redeem_rate || '100'} onChange={e => setSettings((s: any) => ({ ...s, loyalty_redeem_rate: e.target.value }))} />
          </div>
          <div className="settings-field">
            <label>Welcome bonus (točk)</label>
            <input className="input" type="number" min="0" value={settings.loyalty_welcome_bonus || '50'} onChange={e => setSettings((s: any) => ({ ...s, loyalty_welcome_bonus: e.target.value }))} />
          </div>
          <div className="settings-field">
            <label>RoJstnodnevni bonus (točk)</label>
            <input className="input" type="number" min="0" value={settings.loyalty_birthday_bonus || '100'} onChange={e => setSettings((s: any) => ({ ...s, loyalty_birthday_bonus: e.target.value }))} />
          </div>
          <div className="modal-btns" style={{ marginTop: 16 }}>
            <button onClick={saveSettings} className="btn btn-primary">Shrani nastavitve</button>
          </div>
        </div>
      )}
    </div>
  )
}
