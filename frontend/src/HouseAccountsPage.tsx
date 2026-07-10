import { useState, useEffect } from 'react'
import * as api from './api'
import { useTranslation } from './i18n'

export default function HouseAccountsPage({ onNotify }: { onNotify: (m: string) => void }) {
  const { t } = useTranslation()
  const [accounts, setAccounts] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<any | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [customers, setCustomers] = useState<any[]>([])
  const [custSearch, setCustSearch] = useState('')
  const [createData, setCreateData] = useState({ customer_id: 0, credit_limit: 0, notes: '' })
  const [payAmount, setPayAmount] = useState('')
  const [chargeAmount, setChargeAmount] = useState('')
  const [chargeDesc, setChargeDesc] = useState('')

  const load = async () => {
    const r = await fetch(`/api/v1/house-accounts?search=${encodeURIComponent(search)}`, { headers: api.authHeader() })
    const d = await r.json()
    setAccounts(d)
  }

  useEffect(() => { load() }, [search])

  const openCreate = async () => {
    setCustSearch('')
    setCustomers([])
    setCreateData({ customer_id: 0, credit_limit: 0, notes: '' })
    setShowCreate(true)
  }

  const searchCust = async (q: string) => {
    setCustSearch(q)
    if (q.length < 2) { setCustomers([]); return }
    const r = await fetch(`/api/v1/customers?search=${encodeURIComponent(q)}`, { headers: api.authHeader() })
    const d = await r.json()
    setCustomers(d)
  }

  const createAccount = async () => {
    if (!createData.customer_id) return
    await fetch('/api/v1/house-accounts', { method: 'POST', headers: { ...api.h(), 'Content-Type': 'application/json' }, body: JSON.stringify(createData) })
    setShowCreate(false)
    onNotify(t('house_accounts.created'))
    load()
  }

  const selectAccount = async (id: number) => {
    const r = await fetch(`/api/v1/house-accounts/${id}`, { headers: api.authHeader() })
    const d = await r.json()
    setSelected(d)
    setPayAmount('')
    setChargeAmount('')
    setChargeDesc('')
  }

  const updateAccount = async (field: string, value: any) => {
    await fetch(`/api/v1/house-accounts/${selected.id}`, { method: 'PUT', headers: { ...api.h(), 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: value }) })
    selectAccount(selected.id)
    onNotify(t('common.saved'))
  }

  const makePayment = async () => {
    const amt = parseFloat(payAmount)
    if (!amt || amt <= 0) return
    await fetch(`/api/v1/house-accounts/${selected.id}/pay`, { method: 'POST', headers: { ...api.h(), 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: amt }) })
    selectAccount(selected.id)
    onNotify(t('house_accounts.payment_recorded'))
  }

  const makeCharge = async () => {
    const amt = parseFloat(chargeAmount)
    if (!amt || amt <= 0) return
    await fetch(`/api/v1/house-accounts/${selected.id}/charge`, { method: 'POST', headers: { ...api.h(), 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: amt, description: chargeDesc || t('house_accounts.manual_charge') }) })
    selectAccount(selected.id)
    onNotify(t('house_accounts.charge_recorded'))
  }

  const statusColor = (s: string) => s === 'active' ? 'var(--green)' : s === 'frozen' ? 'var(--orange)' : 'var(--red)'

  return (
    <div className="page">
      <div className="page-header">
        <h2>🏦 {t('nav.house-accounts')}</h2>
        <button className="btn btn-primary" onClick={openCreate}>+ {t('house_accounts.create')}</button>
      </div>

      <input className="input" placeholder={t('common.search') + '...'} value={search}
        onChange={e => setSearch(e.target.value)} style={{ marginBottom: 12, width: 300 }} />

      {showCreate && (
        <div className="overlay" onClick={() => setShowCreate(false)}>
          <div className="modal modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h3>{t('house_accounts.create')}</h3>
            <input className="input" placeholder={t('common.search') + '...'} value={custSearch}
              onChange={e => searchCust(e.target.value)} style={{ marginBottom: 8 }} />
            {customers.map(c => (
              <button key={c.id} onClick={() => setCreateData(prev => ({ ...prev, customer_id: c.id }))}
                className={`btn ${createData.customer_id === c.id ? 'btn-primary' : 'btn-ghost'}`}
                style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 4 }}>
                {c.name} — {c.phone}
              </button>
            ))}
            <input className="input" type="number" placeholder={t('house_accounts.credit_limit')}
              value={createData.credit_limit} onChange={e => setCreateData(prev => ({ ...prev, credit_limit: parseFloat(e.target.value) || 0 }))}
              style={{ marginTop: 8, marginBottom: 8 }} />
            <textarea className="input" placeholder={t('house_accounts.notes')}
              value={createData.notes} onChange={e => setCreateData(prev => ({ ...prev, notes: e.target.value }))}
              style={{ marginBottom: 8 }} />
            <div className="modal-btns">
              <button onClick={createAccount} className="btn btn-primary" disabled={!createData.customer_id}>{t('common.confirm')}</button>
              <button onClick={() => setShowCreate(false)} className="btn btn-ghost">{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1 }}>
          {accounts.map(a => (
            <div key={a.id} onClick={() => selectAccount(a.id)}
              className="card" style={{ cursor: 'pointer', marginBottom: 8, opacity: a.status === 'active' ? 1 : 0.6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{a.customer_name}</strong>
                  <span style={{ fontSize: 12, color: 'var(--text2)', marginLeft: 8 }}>{a.customer_phone}</span>
                  <span className="badge" style={{ background: statusColor(a.status), marginLeft: 8, fontSize: 10 }}>{a.status}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: a.balance > 0 ? 'var(--red)' : 'var(--green)' }}>
                    €{a.balance.toFixed(2)}
                  </div>
                  {a.credit_limit > 0 && <div style={{ fontSize: 11, color: 'var(--text2)' }}>{t('house_accounts.limit')}: €{a.credit_limit.toFixed(2)}</div>}
                </div>
              </div>
            </div>
          ))}
          {accounts.length === 0 && <p style={{ color: 'var(--text2)' }}>{t('common.no_results')}</p>}
        </div>

        {selected && (
          <div className="card" style={{ flex: 1, maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>{selected.customer_name}</h3>
              <span className="badge" style={{ background: statusColor(selected.status) }}>{selected.status}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>📞 {selected.customer_phone}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: selected.balance > 0 ? 'var(--red)' : 'var(--green)', marginBottom: 12 }}>
              {t('house_accounts.balance')}: €{selected.balance.toFixed(2)}
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <select className="input" value={selected.status}
                onChange={e => updateAccount('status', e.target.value)} style={{ flex: 1 }}>
                <option value="active">Active</option>
                <option value="frozen">Frozen</option>
                <option value="closed">Closed</option>
              </select>
              <input className="input" type="number" style={{ flex: 1, width: 120 }}
                value={selected.credit_limit}
                onChange={e => updateAccount('credit_limit', parseFloat(e.target.value) || 0)}
                placeholder={t('house_accounts.limit')} />
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginBottom: 12 }}>
              <h4 style={{ margin: '0 0 8px' }}>{t('house_accounts.add_charge')}</h4>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" type="number" step="0.01" placeholder={t('house_accounts.amount')}
                  value={chargeAmount} onChange={e => setChargeAmount(e.target.value)} style={{ flex: 1 }} />
                <input className="input" placeholder={t('house_accounts.description')}
                  value={chargeDesc} onChange={e => setChargeDesc(e.target.value)} style={{ flex: 1 }} />
                <button className="btn btn-primary" onClick={makeCharge}
                  disabled={!chargeAmount || parseFloat(chargeAmount) <= 0}>
                  + {t('house_accounts.charge')}
                </button>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginBottom: 12 }}>
              <h4 style={{ margin: '0 0 8px' }}>{t('house_accounts.make_payment')}</h4>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" type="number" step="0.01" placeholder={t('house_accounts.amount')}
                  value={payAmount} onChange={e => setPayAmount(e.target.value)} style={{ flex: 1 }} />
                <button className="btn btn-success" onClick={makePayment}
                  disabled={!payAmount || parseFloat(payAmount) <= 0}>
                  € {t('house_accounts.pay')}
                </button>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <h4 style={{ margin: '0 0 8px' }}>{t('house_accounts.transactions')}</h4>
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {selected.transactions.map((t: any) => (
                  <div key={t.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13
                  }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>{t.type === 'charge' ? '💳' : '💵'}</span>
                      <span style={{ marginLeft: 6 }}>{t.description}</span>
                      {t.order_id && <span style={{ fontSize: 11, color: 'var(--text2)', marginLeft: 4 }}>#{t.order_id}</span>}
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, color: t.type === 'charge' ? 'var(--red)' : 'var(--green)' }}>
                        {t.type === 'charge' ? '+' : '-'}€{Math.abs(t.amount).toFixed(2)}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text2)', marginLeft: 8 }}>
                        {new Date(t.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
                {selected.transactions.length === 0 && <p style={{ color: 'var(--text2)', fontSize: 13 }}>{t('common.no_results')}</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
