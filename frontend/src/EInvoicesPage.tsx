import { useState, useEffect } from 'react'
import { useToast } from './Toast'
import { useBulkSelection } from './useBulkSelection'
import { useListNavigation } from './useListNavigation'
import * as api from './api'

interface Invoice {
  id: number; invoice_number: string; order_id: number
  buyer_name: string; buyer_tax_id: string; buyer_address: string
  subtotal: number; tax_total: number; discount_amount: number; total: number
  status: string; eracun_status: string; eracun_xml_id: string
  issued_at: string; due_at: string; paid_at: string; cancelled_at: string
  branch_id: number; notes: string; credit_note_ref: number | null; credit_reason: string
}

export default function EInvoicesPage({ onBack }: { onBack: () => void }) {
  const { add } = useToast()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [eracunFilter, setEracunFilter] = useState('')
  const [detail, setDetail] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)

  const filtered = invoices.filter(i => {
    if (filter && !i.invoice_number.toLowerCase().includes(filter.toLowerCase()) && !(i.buyer_name || '').toLowerCase().includes(filter.toLowerCase())) return false
    if (eracunFilter && i.eracun_status !== eracunFilter) return false
    return true
  })

  const bulk = useBulkSelection(filtered)
  const nav = useListNavigation(filtered.length, (idx) => setDetail(filtered[idx]))

  const load = async () => {
    setLoading(true)
    try {
      const [data, s] = await Promise.all([
        api.eracunList() as any,
        api.getInvoiceStats().catch(() => null),
      ])
      setInvoices(Array.isArray(data) ? data : [])
      setStats(s)
    } catch { add('Napaka pri nalaganju računov', 'error') }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const sendEracun = async (ids: number[]) => {
    try {
      const r = await api.bulkSendEracun(ids)
      add(`Poslanih ${r.sent} e-računov`, 'success')
      bulk.clear(); load()
    } catch (e: any) { add(e.message, 'error') }
  }

  const downloadXml = async (id: number, num: string) => {
    try {
      const r = await fetch(`/api/v1/invoices/${id}/eracun-xml`, { headers: api.h() })
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `eracun-${num}.xml`; a.click()
      URL.revokeObjectURL(url)
      add('XML prenesen', 'success')
    } catch { add('Napaka pri prenosu', 'error') }
  }

  const validateXml = async (id: number) => {
    try {
      const r = await api.validateInvoiceEracun(id)
      if (r.valid) add(`Validno! Hash: ${r.hash.slice(0, 16)}...`, 'success')
      else add(`Napake: ${r.errors.join(', ')}`, 'error')
    } catch { add('Validacija ni uspela', 'error') }
  }

  const deleteSelected = async () => {
    const ids = Array.from(bulk.selectedIds)
    if (!confirm(`Izbrisati ${ids.length} računov?`)) return
    try {
      const r = await api.bulkDeleteInvoices(ids)
      add(`Izbrisanih ${r.deleted} računov`, 'success')
      bulk.clear(); load()
    } catch (e: any) { add(e.message, 'error') }
  }

  const issueCreditNote = async (id: number) => {
    const reason = prompt('Razlog za dobropis:') || 'Storno po zahtevi kupca'
    try {
      const r = await api.createCreditNote(id, reason)
      add(`Dobropis ${r.invoice_number} izdan za ${r.ref_invoice}`, 'success')
      setDetail(null); load()
    } catch (e: any) { add(e.message, 'error') }
  }

  const eracunBadge = (s: string) => {
    const c = s === 'sent' ? '#059669' : s === 'error' ? '#ef4444' : '#f59e0b'
    return <span className="badge" style={{ background: c, color: 'white', fontSize: 10 }}>{s === 'pending' ? 'Čaka' : s === 'sent' ? 'Poslan' : 'Napaka'}</span>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 13 }}>← Nazaj</button>
          <h2 style={{ margin: '4px 0 0' }}>e-Računi (FURS)</h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {bulk.bulkMode && (
            <>
              <button className="btn btn-primary" onClick={() => sendEracun(Array.from(bulk.selectedIds))} disabled={bulk.selectedCount === 0}>
                Pošlji ({bulk.selectedCount})
              </button>
              <button className="btn btn-danger" onClick={deleteSelected} disabled={bulk.selectedCount === 0}>
                Izbriši ({bulk.selectedCount})
              </button>
            </>
          )}
          <button className="btn btn-sm" onClick={() => bulk.bulkMode ? bulk.clear() : bulk.toggleBulkMode()} style={{ fontSize: 12 }}>
            {bulk.bulkMode ? 'Prekliči' : 'Povabi'}
          </button>
          <button className="btn btn-sm" onClick={load} style={{ fontSize: 12 }}>Osveži</button>
        </div>
      </div>

      {stats && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Vsi', value: stats.total, color: '#64748b' },
            { label: 'Izdani', value: stats.issued, color: '#f59e0b' },
            { label: 'Plačani', value: stats.paid, color: '#059669' },
            { label: 'Stornirani', value: stats.cancelled, color: '#ef4444' },
            { label: 'e-Račun čaka', value: stats.eracun_pending, color: '#8b5cf6' },
            { label: 'e-Račun poslan', value: stats.eracun_sent, color: '#06b6d4' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '8px 16px', textAlign: 'center', minWidth: 100 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <input className="input" placeholder="Iskanje po številki ali kupcu..." value={filter} onChange={e => setFilter(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
        <select className="input" value={eracunFilter} onChange={e => setEracunFilter(e.target.value)} style={{ width: 140 }}>
          <option value="">Vsi e-računi</option>
          <option value="pending">Čaka pošiljanje</option>
          <option value="sent">Poslani</option>
          <option value="error">Napake</option>
        </select>
      </div>

      {loading ? <p style={{ color: '#94a3b8' }}>Nalaganje...</p> : filtered.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
          Ni računov za prikaz
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map((inv, idx) => (
            <div key={inv.id} className="card" data-list-idx={idx}
              style={{
                padding: '10px 14px', cursor: bulk.bulkMode ? 'pointer' : 'default',
                border: bulk.isSelected(inv.id) ? '2px solid var(--blue)' : undefined,
                background: bulk.isSelected(inv.id) ? 'var(--blue-light, rgba(59,130,246,0.08))' : undefined,
              }}
              onClick={() => bulk.bulkMode ? bulk.toggle(inv.id) : setDetail(inv)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {bulk.bulkMode && (
                  <input type="checkbox" checked={bulk.isSelected(inv.id)} onChange={() => bulk.toggle(inv.id)}
                    onClick={e => e.stopPropagation()}
                    style={{ width: 18, height: 18, accentColor: 'var(--blue)', flexShrink: 0 }} aria-label={`Izberi ${inv.invoice_number}`} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                    <div>
                      <strong>{inv.invoice_number}</strong>
                      {inv.buyer_name && <span style={{ marginLeft: 8, fontSize: 13, color: '#64748b' }}>{inv.buyer_name}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {eracunBadge(inv.eracun_status)}
                      {inv.credit_note_ref && <span className="badge" style={{ background: '#ef4444', color: 'white', fontSize: 10 }}>Dobropis</span>}
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{inv.total.toFixed(2)} €</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                    {new Date(inv.issued_at).toLocaleDateString('sl-SI')} • Naročilo #{inv.order_id || '—'}
                    {inv.status === 'paid' && ' • Plačano'}
                    {inv.status === 'cancelled' && ' • Storno'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {detail && (
        <div className="overlay" onClick={() => setDetail(null)}>
          <div className="modal modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, maxHeight: '80vh', overflow: 'auto' }}>
            <h3>{detail.invoice_number}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '12px 0', fontSize: 13 }}>
              <div><strong>Kupec:</strong> {detail.buyer_name || '—'}</div>
              <div><strong>Davčna:</strong> {detail.buyer_tax_id || '—'}</div>
              <div><strong>Vrednost:</strong> {detail.subtotal.toFixed(2)} €</div>
              <div><strong>DDV:</strong> {detail.tax_total.toFixed(2)} €</div>
              <div><strong>Skupaj:</strong> {detail.total.toFixed(2)} €</div>
              <div><strong>Status:</strong> {detail.status}</div>
              <div><strong>e-Račun:</strong> {detail.eracun_status}</div>
              <div><strong>Datum:</strong> {new Date(detail.issued_at).toLocaleDateString('sl-SI')}</div>
              {detail.credit_note_ref && (
                <div style={{ gridColumn: '1 / -1' }}><strong>Dobropis za:</strong> {detail.credit_reason || `Račun #${detail.credit_note_ref}`}</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {detail.status === 'paid' && !detail.credit_note_ref && (
                <button className="btn btn-danger" onClick={() => { issueCreditNote(detail.id) }}>Dobropis (Storno)</button>
              )}
              {detail.eracun_status === 'pending' && (
                <button className="btn btn-primary" onClick={() => { sendEracun([detail.id]); setDetail(null) }}>Pošlji e-Račun</button>
              )}
              <button className="btn btn-sm" onClick={() => downloadXml(detail.id, detail.invoice_number)}>Prenesi XML</button>
              <button className="btn btn-sm" onClick={() => validateXml(detail.id)}>Validiraj</button>
              <button className="btn btn-sm" onClick={() => setDetail(null)}>Zapri</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
