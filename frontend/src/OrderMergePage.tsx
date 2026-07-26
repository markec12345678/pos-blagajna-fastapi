import { useState, useEffect } from 'react'
import * as api from './api'

export default function OrderMergePage({ onNotify }: { onNotify: (m: string) => void }) {
  const [orders, setOrders] = useState<any[]>([])
  const [openOrders, setOpenOrders] = useState<any[]>([])
  const [mergeTarget, setMergeTarget] = useState('')
  const [mergeSource, setMergeSource] = useState('')
  const [splitOrder, setSplitOrder] = useState('')
  const [splitItems, setSplitItems] = useState<number[]>([])
  const [splitOrderItems, setSplitOrderItems] = useState<any[]>([])

  const load = async () => {
    const r = await fetch('/api/v1/orders', {
      headers: api.authHeader()
    })
    const all = await r.json()
    setOrders(all)
    setOpenOrders(all.filter((o: any) => o.status === 'open'))
  }
  useEffect(() => { load() }, [])

  const loadSplitItems = async (id: number) => {
    const r = await fetch(`/api/v1/orders/${id}`, {
      headers: api.authHeader()
    })
    const d = await r.json()
    setSplitOrderItems(d.items || [])
    setSplitItems([])
  }

  const doMerge = async () => {
    if (!mergeTarget || !mergeSource) return
    const r = await fetch(`/api/v1/orders/${mergeTarget}/merge`, {
      method: 'POST',
      headers: { ...api.authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_order_id: parseInt(mergeSource) })
    })
    if (r.ok) {
      onNotify('Naročili združeni')
      setMergeTarget(''); setMergeSource(''); load()
    } else {
      const d = await r.json()
      onNotify(d.detail || 'Napaka')
    }
  }

  const doSplit = async () => {
    if (!splitOrder || splitItems.length === 0) return
    const r = await fetch(`/api/v1/orders/${splitOrder}/split`, {
      method: 'POST',
      headers: { ...api.authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_ids: splitItems })
    })
    if (r.ok) {
      onNotify('Naročilo razdeljeno')
      setSplitOrder(''); setSplitItems([]); setSplitOrderItems([]); load()
    } else {
      const d = await r.json()
      onNotify(d.detail || 'Napaka')
    }
  }

  const toggleSplitItem = (id: number) => {
    setSplitItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <div className="page-container" style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
      <h2 className="page-title">🔀 Združevanje / Deljenje naročil</h2>

      <div style={{ display: 'flex', gap: 20, flexDirection: 'column' }}>

        {/* Merge */}
        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 15 }}>🔗 Združi dve naročili</h3>
          <p style={{ fontSize: 12, color: 'var(--text2)', margin: '0 0 10px 0' }}>
            Artikli iz <strong>izvornega</strong> naročila se premaknejo v <strong>ciljno</strong> naročilo. Izvorna miza se sprosti.
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select className="input" value={mergeTarget} onChange={e => setMergeTarget(e.target.value)} style={{ flex: 1, minWidth: 150 }}>
              <option value="">— Ciljno naročilo —</option>
              {openOrders.map(o => (
                <option key={o.id} value={o.id}>#{o.id} ({o.table_name || '?'}) — {o.total?.toFixed(2)} €</option>
              ))}
            </select>
            <span style={{ color: 'var(--text2)', fontSize: 13 }}>← združi v</span>
            <select className="input" value={mergeSource} onChange={e => setMergeSource(e.target.value)} style={{ flex: 1, minWidth: 150 }}>
              <option value="">— Izvorno naročilo —</option>
              {openOrders.filter(o => String(o.id) !== mergeTarget).map(o => (
                <option key={o.id} value={o.id}>#{o.id} ({o.table_name || '?'}) — {o.total?.toFixed(2)} €</option>
              ))}
            </select>
            <button onClick={doMerge} className="btn btn-primary btn-sm" disabled={!mergeTarget || !mergeSource}>Združi</button>
          </div>
        </div>

        {/* Split */}
        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 15 }}>✂️ Razdeli naročilo</h3>
          <p style={{ fontSize: 12, color: 'var(--text2)', margin: '0 0 10px 0' }}>
            Izbrani artikli se premaknejo v novo naročilo na prosto mizo.
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <select className="input" value={splitOrder} onChange={e => { setSplitOrder(e.target.value); if (e.target.value) loadSplitItems(parseInt(e.target.value)) }}
              style={{ flex: 1 }}>
              <option value="">— Izberi naročilo —</option>
              {openOrders.map(o => (
                <option key={o.id} value={o.id}>#{o.id} ({o.table_name || '?'}) — {o.total?.toFixed(2)} €</option>
              ))}
            </select>
          </div>
          {splitOrderItems.length > 0 && (
            <>
              <div style={{ marginBottom: 8 }}>
                {splitOrderItems.map((it: any) => (
                  <label key={it.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                    borderRadius: 6, cursor: 'pointer', fontSize: 13,
                    background: splitItems.includes(it.id) ? 'var(--primary)15' : 'transparent',
                    marginBottom: 4
                  }}>
                    <input type="checkbox" checked={splitItems.includes(it.id)}
                      onChange={() => toggleSplitItem(it.id)} />
                    <span style={{ flex: 1 }}>{it.quantity}× {it.item_name}</span>
                    <span style={{ fontWeight: 600 }}>{it.total_price?.toFixed(2)} €</span>
                  </label>
                ))}
              </div>
              <button onClick={doSplit} className="btn btn-primary btn-sm" disabled={splitItems.length === 0}>
                Razdeli {splitItems.reduce((s, id) => s + (splitOrderItems.find((i: any) => i.id === id)?.total_price || 0), 0).toFixed(2)} € v novo naročilo
              </button>
            </>
          )}
        </div>

        {/* Open orders list for reference */}
        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: 14, color: 'var(--text2)' }}>Odprta naročila ({openOrders.length})</h3>
          {openOrders.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text2)' }}>Ni odprtih naročil</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
              {openOrders.map(o => (
                <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                  <span>#{o.id} — {o.table_name || '?'} ({o.order_type})</span>
                  <span style={{ fontWeight: 600 }}>{o.total?.toFixed(2)} € • {o.items_count || 0} art.</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
