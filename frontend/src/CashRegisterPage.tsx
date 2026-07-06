import { useState, useEffect } from 'react'
import * as api from './api'
import { useTranslation } from './i18n'

export default function CashRegisterPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [movements, setMovements] = useState<any[]>([])
  const [showOpen, setShowOpen] = useState(false)
  const [openBal, setOpenBal] = useState('100')
  const [showMovement, setShowMovement] = useState(false)
  const [movAmt, setMovAmt] = useState('')
  const [movReason, setMovReason] = useState('')
  const [movType, setMovType] = useState<'in' | 'out'>('in')
  const [showClose, setShowClose] = useState(false)
  const [closeBal, setCloseBal] = useState('')

  const load = async () => {
    try {
      const r = await fetch('/api/v1/cash-register/status', { headers: api.authHeader() })
      setStatus(await r.json())
      const r2 = await fetch('/api/v1/cash-register/movements', { headers: api.authHeader() })
      setMovements(await r2.json())
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const openReg = async () => {
    await fetch('/api/v1/cash-register/open', { method: 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ balance: parseFloat(openBal) || 100 }) })
    setShowOpen(false); onNotify('Blagajna odprta'); load()
  }

  const addMov = async () => {
    await fetch('/api/v1/cash-register/movement', { method: 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: parseFloat(movAmt), reason: movReason, type: movType }) })
    setShowMovement(false); setMovAmt(''); setMovReason(''); onNotify('Vnos dodan'); load()
  }

  const closeReg = async () => {
    await fetch('/api/v1/cash-register/close', { method: 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ closing_balance: parseFloat(closeBal) || 0 }) })
    setShowClose(false); onNotify('Blagajna zaprta'); load()
  }

  if (loading) return <div className="loading-state">{t('common.loading')}</div>

  const isOpen = status?.status === 'open'

  return (
    <div className="cash-page">
      <div className="cash-header">
        <h2>💰 {t('cash.title')}</h2>
        {!isOpen ? (
          <button onClick={() => setShowOpen(true)} className="btn btn-primary">🔄 Odpri blagajno</button>
        ) : (
          <div className="cash-actions">
            <button onClick={() => setShowMovement(true)} className="btn btn-sm btn-blue">💰 Vnos gotovine</button>
            <button onClick={() => setShowClose(true)} className="btn btn-sm btn-danger">🔒 Zapri blagajno</button>
          </div>
        )}
      </div>

      {isOpen ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="cash-grid">
            <div><div className="cash-stat-label">{t('cash.opening')}</div><div className="cash-stat-value">{status.opening_balance.toFixed(2)} €</div></div>
            <div><div className="cash-stat-label">{t('cash.expected')}</div><div className="cash-stat-value">{status.expected_balance.toFixed(2)} €</div></div>
            <div><div className="cash-stat-label">{t('cash.payments_cash')}</div><div className="cash-stat-value">{status.total_cash_payments.toFixed(2)} €</div></div>
            <div><div className="cash-stat-label">{t('cash.payments_card')}</div><div className="cash-stat-value">{status.total_card_payments}×</div></div>
            <div><div className="cash-stat-label">{t('cash.in')}</div><div className="cash-stat-value green">+{status.cash_in.toFixed(2)} €</div></div>
            <div><div className="cash-stat-label">{t('cash.out')}</div><div className="cash-stat-value red">-{status.cash_out.toFixed(2)} €</div></div>
          </div>
          <div className="cash-opened-at">{t('cash.opened_at')}: {new Date(status.opened_at).toLocaleString('sl-SI')}</div>
        </div>
      ) : (
        <div className="card cash-closed-msg">{t('cash.closed')}</div>
      )}

      {movements.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: 12, fontSize: 14 }}>{t('cash.movements')}</h3>
          {movements.map(m => (
            <div key={m.id} className="cash-movement-row">
              <div>
                <span style={{ fontWeight: 600 }}>{m.type === 'in' ? '💰' : '💸'}</span>
                <span style={{ marginLeft: 6 }}>{m.reason || (m.type === 'in' ? 'Vnos' : 'Izplačilo')}</span>
              </div>
              <div style={{ color: m.type === 'in' ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                {m.type === 'in' ? '+' : '-'}{m.amount.toFixed(2)} €
              </div>
            </div>
          ))}
        </div>
      )}

      {showOpen && (
        <div className="overlay" onClick={() => setShowOpen(false)}>
          <div className="card modal-card" onClick={e => e.stopPropagation()}>
            <h3>{t('cash.open_title')}</h3>
            <input className="input" type="number" placeholder={t('cash.opening')} value={openBal} onChange={e => setOpenBal(e.target.value)} />
            <div className="modal-btns">
              <button onClick={openReg} className="btn btn-primary">{t('cash.open')}</button>
              <button onClick={() => setShowOpen(false)} className="btn btn-ghost">{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {showMovement && (
        <div className="overlay" onClick={() => setShowMovement(false)}>
          <div className="card modal-card" onClick={e => e.stopPropagation()}>
            <h3>💰 {t('cash.movement')}</h3>
            <div className="type-toggle">
              <button onClick={() => setMovType('in')} className={`btn btn-sm ${movType === 'in' ? 'btn-primary' : 'btn-ghost'}`}>💰 {t('cash.in')}</button>
              <button onClick={() => setMovType('out')} className={`btn btn-sm ${movType === 'out' ? 'btn-danger' : 'btn-ghost'}`}>💸 {t('cash.out')}</button>
            </div>
            <input className="input" type="number" placeholder={t('common.amount')} value={movAmt} onChange={e => setMovAmt(e.target.value)} />
            <input className="input" placeholder={t('common.reason')} value={movReason} onChange={e => setMovReason(e.target.value)} />
            <div className="modal-btns">
              <button onClick={addMov} className="btn btn-primary">{t('common.save')}</button>
              <button onClick={() => setShowMovement(false)} className="btn btn-ghost">{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {showClose && (
        <div className="overlay" onClick={() => setShowClose(false)}>
          <div className="card modal-card" onClick={e => e.stopPropagation()}>
            <h3>🔒 {t('cash.close_title')}</h3>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>{t('cash.expected')}: <strong>{status?.expected_balance.toFixed(2)} €</strong></p>
            <input className="input" type="number" placeholder={t('cash.closing')} value={closeBal} onChange={e => setCloseBal(e.target.value)} />
            <div className="modal-btns">
              <button onClick={closeReg} className="btn btn-danger">{t('cash.close')}</button>
              <button onClick={() => setShowClose(false)} className="btn btn-ghost">{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
