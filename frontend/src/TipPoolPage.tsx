import { useState, useEffect } from 'react'
import { useTranslation } from './i18n'
import * as api from './api'

export default function TipPoolPage({ onNotify }: { onNotify: (m: string) => void }) {
  const { t } = useTranslation()
  const [pools, setPools] = useState<any[]>([])
  const [selectedPool, setSelectedPool] = useState<any>(null)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [method, setMethod] = useState('by_hours')
  const [branchId, setBranchId] = useState<number | null>(null)
  const [branches, setBranches] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/v1/branches', { headers: api.authHeader() })
      .then(r => r.json()).then(setBranches).catch(() => {})
  }, [])

  const loadPools = async () => {
    const params = new URLSearchParams()
    if (date) params.set('date_from', date)
    if (date) params.set('date_to', date)
    if (branchId) params.set('branch_id', String(branchId))
    const r = await fetch(`/api/v1/tips/pools?${params}`, {
      headers: api.authHeader()
    })
    if (r.ok) {
      const data = await r.json()
      setPools(data)
      if (!selectedPool && data.length > 0) {
        loadPoolDetail(data[0].id)
      }
    }
  }

  const loadPoolDetail = async (id: number) => {
    const r = await fetch(`/api/v1/tips/pools/${id}`, {
      headers: api.authHeader()
    })
    if (r.ok) setSelectedPool(await r.json())
  }

  useEffect(() => { loadPools() }, [date, branchId])

  const createPool = async () => {
    const r = await fetch('/api/v1/tips/pools', {
      method: 'POST',
      headers: { ...api.authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, method, branch_id: branchId })
    })
    if (r.ok) {
      onNotify(t('tip.create') + ' ✅')
      loadPools()
    } else {
      const err = await r.json()
      onNotify(err.detail || t('err.server'))
    }
  }

  const distribute = async () => {
    if (!selectedPool) return
    const r = await fetch(`/api/v1/tips/pools/${selectedPool.id}/distribute`, {
      method: 'POST',
      headers: api.authHeader()
    })
    if (r.ok) {
      onNotify(t('tip.distribute') + ' ✅')
      loadPoolDetail(selectedPool.id)
      loadPools()
    }
  }

  const payAll = async () => {
    if (!selectedPool) return
    const r = await fetch(`/api/v1/tips/pools/${selectedPool.id}/pay`, {
      method: 'POST',
      headers: { ...api.authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    if (r.ok) {
      onNotify(t('tip.pay') + ' ✅')
      loadPoolDetail(selectedPool.id)
    }
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>💰 {t('tip.title')}</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
          {branches.length > 1 && (
            <select className="input" value={branchId || ''} onChange={e => setBranchId(parseInt(e.target.value) || null)}>
              <option value="">{t('common.all')}</option>
              {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <select className="input" value={method} onChange={e => setMethod(e.target.value)}>
            <option value="by_hours">{t('tip.method_hours')}</option>
            <option value="equal">{t('tip.method_equal')}</option>
            <option value="by_role_weight">{t('tip.method_role')}</option>
          </select>
          <button onClick={createPool} className="btn btn-primary">{t('tip.create')}</button>
        </div>
      </div>

      {pools.length === 0 && <p style={{ color: 'var(--text2)', textAlign: 'center', marginTop: 40 }}>{t('tip.no_pool')}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16 }}>
        <div>
          {pools.map(p => (
            <div key={p.id} onClick={() => loadPoolDetail(p.id)}
              style={{
                padding: '12px', borderRadius: 8, cursor: 'pointer', marginBottom: 8,
                background: selectedPool?.id === p.id ? 'var(--primary-light, #d1fae5)' : 'var(--surface2, #f5f5f5)',
                border: selectedPool?.id === p.id ? '2px solid var(--primary)' : '2px solid transparent'
              }}>
              <div style={{ fontWeight: 600 }}>{p.date}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>€{p.total_tips.toFixed(2)} · {p.method} · {p.status}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>{p.distributions_count} {t('tip.staff_count')}</div>
            </div>
          ))}
        </div>

        <div>
          {selectedPool && (
            <div className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: 0 }}>{t('tip.title')} — {selectedPool.date}</h3>
                  <p style={{ fontSize: 12, color: 'var(--text2)', margin: '4px 0 0' }}>
                    {t('tip.status')}: <strong>{selectedPool.status}</strong> · {t('tip.method')}: {selectedPool.method} · {t('tip.total_tips')}: €{selectedPool.total_tips.toFixed(2)}
                  </p>
                </div>
                {selectedPool.status === 'open' && (
                  <button onClick={distribute} className="btn btn-primary">{t('tip.distribute')}</button>
                )}
                {selectedPool.status === 'distributed' && (
                  <button onClick={payAll} className="btn btn-success">{t('tip.pay')}</button>
                )}
              </div>

              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', fontSize: 12, color: 'var(--text2)' }}>
                    <th style={{ padding: '8px 4px' }}>{t('tip.employee')}</th>
                    <th style={{ padding: '8px 4px' }}>{t('tip.role')}</th>
                    <th style={{ padding: '8px 4px', textAlign: 'right' }}>{t('tip.hours')}</th>
                    <th style={{ padding: '8px 4px', textAlign: 'right' }}>{t('common.weight')}</th>
                    <th style={{ padding: '8px 4px', textAlign: 'right' }}>{t('tip.share')}</th>
                    <th style={{ padding: '8px 4px', textAlign: 'center' }}>{t('tip.paid')}</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPool.distributions?.map((d: any) => (
                    <tr key={d.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 4px', fontWeight: 600 }}>{d.user_name}</td>
                      <td style={{ padding: '8px 4px', color: 'var(--text2)' }}>{d.user_role}</td>
                      <td style={{ padding: '8px 4px', textAlign: 'right' }}>{d.hours_worked.toFixed(1)}</td>
                      <td style={{ padding: '8px 4px', textAlign: 'right' }}>{d.role_weight.toFixed(1)}x</td>
                      <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>€{d.amount.toFixed(2)}</td>
                      <td style={{ padding: '8px 4px', textAlign: 'center' }}>{d.paid ? '✅' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {(!selectedPool.distributions || selectedPool.distributions.length === 0) && (
                <p style={{ textAlign: 'center', color: 'var(--text2)', marginTop: 20 }}>
                  {t('tip.no_pool')}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
