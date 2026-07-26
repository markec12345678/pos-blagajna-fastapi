import { useState, useEffect } from 'react'
import { useTranslation } from './i18n'
import { fiscalizeFursZapos, getFiscalStatus, eracunList } from './api'

interface FiscalInvoice {
  id: number
  invoice_number: string
  buyer_name: string
  total: number
  status: string
  issued_at: string | null
  fiscal_status?: string
  eor?: string
  qr_code?: string
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  sent: '#3b82f6',
  verified: '#059669',
  error: '#ef4444',
}

export default function FursZaposPage({ onNotify }: { onNotify: (m: string, isError?: boolean) => void }) {
  const { t } = useTranslation()
  const [invoices, setInvoices] = useState<FiscalInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [fiscalizing, setFiscalizing] = useState<number | null>(null)
  const [filter, setFilter] = useState('')
  const [detailInvoice, setDetailInvoice] = useState<FiscalInvoice | null>(null)

  const loadInvoices = async () => {
    setLoading(true)
    try {
      const data = await eracunList()
      setInvoices(data)
    } catch {
      onNotify(t('common.error'), true)
    }
    setLoading(false)
  }

  useEffect(() => { loadInvoices() }, [])

  const fiscalize = async (id: number) => {
    setFiscalizing(id)
    try {
      const result = await fiscalizeFursZapos(id)
      onNotify(t('fiscalization_success'))
      setInvoices(prev =>
        prev.map(inv =>
          inv.id === id
            ? { ...inv, fiscal_status: 'verified', eor: result.eor, qr_code: result.qr_code }
            : inv
        )
      )
      if (detailInvoice?.id === id) {
        setDetailInvoice(prev =>
          prev ? { ...prev, fiscal_status: 'verified', eor: result.eor, qr_code: result.qr_code } : prev
        )
      }
    } catch (err: any) {
      onNotify(err.message || t('fiscalization_error'), true)
      setInvoices(prev =>
        prev.map(inv =>
          inv.id === id ? { ...inv, fiscal_status: 'error' } : inv
        )
      )
    }
    setFiscalizing(null)
  }

  const checkStatus = async (id: number) => {
    try {
      const result = await getFiscalStatus(id)
      setInvoices(prev =>
        prev.map(inv =>
          inv.id === id
            ? { ...inv, fiscal_status: result.status, eor: result.eor || inv.eor }
            : inv
        )
      )
      if (detailInvoice?.id === id) {
        setDetailInvoice(prev =>
          prev ? { ...prev, fiscal_status: result.status, eor: result.eor || prev.eor } : prev
        )
      }
    } catch {
      onNotify(t('common.error'), true)
    }
  }

  const filtered = invoices.filter(inv => {
    if (!filter) return true
    if (filter === 'fiscalized') return inv.fiscal_status === 'verified'
    if (filter === 'pending') return !inv.fiscal_status || inv.fiscal_status === 'pending'
    if (filter === 'error') return inv.fiscal_status === 'error'
    return true
  })

  const stats = {
    total: invoices.length,
    fiscalized: invoices.filter(i => i.fiscal_status === 'verified').length,
    pending: invoices.filter(i => !i.fiscal_status || i.fiscal_status === 'pending').length,
    errors: invoices.filter(i => i.fiscal_status === 'error').length,
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>🇸🇮 {t('furs_zapos')}</h2>
      </div>
      <p style={{ color: 'var(--text-secondary, #6b7280)', marginBottom: 16, fontSize: 14 }}>
        {t('furs_zapos_description')}
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { key: '', label: `${t('common.all')} (${stats.total})`, color: '#3b82f6' },
          { key: 'fiscalized', label: `${t('fiscal_verified')} (${stats.fiscalized})`, color: '#059669' },
          { key: 'pending', label: `${t('fiscal_pending')} (${stats.pending})`, color: '#f59e0b' },
          { key: 'error', label: `${t('fiscal_error')} (${stats.errors})`, color: '#ef4444' },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setFilter(s.key)}
            className={`btn btn-sm ${filter === s.key ? 'btn-primary' : ''}`}
            style={{ borderLeft: `3px solid ${s.color}`, fontSize: 12 }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div className="spinner" style={{ width: 32, height: 32, border: '3px solid var(--border, #e5e7eb)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p>{t('common.loading')}</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border, #e5e7eb)' }}>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>{t('th.id')}</th>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>{t('invoice_number') || 'Št. računa'}</th>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>{t('th.name')}</th>
                <th style={{ textAlign: 'right', padding: '10px 12px' }}>{t('th.total')}</th>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>{t('furs_zapos_status')}</th>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>{t('furs_zapos_eor')}</th>
                <th style={{ textAlign: 'center', padding: '10px 12px' }}>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary, #6b7280)' }}>
                    {t('common.no_data')}
                  </td>
                </tr>
              ) : (
                filtered.map(inv => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid var(--border, #e5e7eb)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 500 }}>#{inv.id}</td>
                    <td style={{ padding: '10px 12px' }}>{inv.invoice_number}</td>
                    <td style={{ padding: '10px 12px' }}>{inv.buyer_name || '-'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                      {inv.total?.toFixed(2)} €
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 10px',
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#fff',
                        background: STATUS_COLORS[inv.fiscal_status || 'pending'] || '#6b7280',
                      }}>
                        {t(`fiscal_${inv.fiscal_status || 'pending'}`)}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 11 }}>
                      {inv.eor || '-'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        {(!inv.fiscal_status || inv.fiscal_status === 'pending' || inv.fiscal_status === 'error') && (
                          <button
                            onClick={() => fiscalize(inv.id)}
                            disabled={fiscalizing === inv.id}
                            className="btn btn-sm btn-primary"
                            style={{ fontSize: 11 }}
                          >
                            {fiscalizing === inv.id ? (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span className="spinner-mini" style={{ width: 12, height: 12, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                {t('fiscalizing')}
                              </span>
                            ) : t('fiscalize')}
                          </button>
                        )}
                        <button
                          onClick={() => checkStatus(inv.id)}
                          className="btn btn-sm btn-ghost"
                          style={{ fontSize: 11 }}
                        >
                          {t('common.refresh')}
                        </button>
                        <button
                          onClick={() => setDetailInvoice(inv)}
                          className="btn btn-sm btn-ghost"
                          style={{ fontSize: 11 }}
                        >
                          {t('common.close')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {detailInvoice && (
        <div className="modal-overlay" onClick={() => setDetailInvoice(null)} style={{ zIndex: 1000 }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, padding: 24 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>
              {t('furs_zapos')} - #{detailInvoice.id}
            </h3>

            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border, #e5e7eb)' }}>
                <span style={{ color: 'var(--text-secondary, #6b7280)' }}>{t('invoice_number') || 'Št. računa'}</span>
                <span style={{ fontWeight: 600 }}>{detailInvoice.invoice_number}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border, #e5e7eb)' }}>
                <span style={{ color: 'var(--text-secondary, #6b7280)' }}>{t('th.total')}</span>
                <span style={{ fontWeight: 600 }}>{detailInvoice.total?.toFixed(2)} €</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border, #e5e7eb)' }}>
                <span style={{ color: 'var(--text-secondary, #6b7280)' }}>{t('furs_zapos_status')}</span>
                <span style={{
                  padding: '2px 10px',
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#fff',
                  background: STATUS_COLORS[detailInvoice.fiscal_status || 'pending'] || '#6b7280',
                }}>
                  {t(`fiscal_${detailInvoice.fiscal_status || 'pending'}`)}
                </span>
              </div>

              {detailInvoice.eor && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border, #e5e7eb)' }}>
                  <span style={{ color: 'var(--text-secondary, #6b7280)' }}>{t('furs_zapos_eor')}</span>
                  <span style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 13 }}>{detailInvoice.eor}</span>
                </div>
              )}

              {detailInvoice.qr_code && (
                <div style={{ textAlign: 'center', padding: 16 }}>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary, #6b7280)', marginBottom: 8 }}>QR koda računa</p>
                  {detailInvoice.qr_code.startsWith('data:') || detailInvoice.qr_code.startsWith('http') ? (
                    <img
                      src={detailInvoice.qr_code}
                      alt="FURS QR"
                      style={{ maxWidth: 200, maxHeight: 200, border: '1px solid var(--border, #e5e7eb)', borderRadius: 8 }}
                    />
                  ) : (
                    <div style={{
                      padding: 16,
                      background: '#fff',
                      border: '1px solid var(--border, #e5e7eb)',
                      borderRadius: 8,
                      fontFamily: 'monospace',
                      fontSize: 10,
                      wordBreak: 'break-all',
                      maxWidth: 300,
                      margin: '0 auto',
                    }}>
                      {detailInvoice.qr_code}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-btns" style={{ marginTop: 20 }}>
              {(!detailInvoice.fiscal_status || detailInvoice.fiscal_status === 'pending' || detailInvoice.fiscal_status === 'error') && (
                <button
                  onClick={() => { fiscalize(detailInvoice.id); setDetailInvoice(null) }}
                  disabled={fiscalizing === detailInvoice.id}
                  className="btn btn-primary"
                >
                  {t('fiscalize')}
                </button>
              )}
              <button onClick={() => setDetailInvoice(null)} className="btn btn-ghost">
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
