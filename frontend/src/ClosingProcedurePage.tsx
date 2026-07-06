import { useState, useEffect } from 'react'

export default function ClosingProcedurePage({ onNotify }: { onNotify?: (msg: string, err?: boolean) => void }) {
  const [step, setStep] = useState<'start' | 'orders' | 'cash' | 'zreport' | 'done'>('start')
  const [openOrders, setOpenOrders] = useState<any[]>([])
  const [cashStatus, setCashStatus] = useState<any>(null)
  const [zreport, setZreport] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [checkedOrderIds, setCheckedOrderIds] = useState<Set<number>>(new Set())

  const checkOpenOrders = async () => {
    setLoading(true)
    const r = await fetch('/api/v1/orders?branch_id=0')
    if (r.ok) {
      const all = await r.json()
      setOpenOrders(all.filter((o: any) => o.status === 'open'))
      setStep('orders')
    }
    setLoading(false)
  }

  const checkCashRegister = async () => {
    setLoading(true)
    const r = await fetch('/api/v1/cash-register/status')
    if (r.ok) setCashStatus(await r.json())
    setLoading(false)
  }

  const closeRegister = async () => {
    const r = await fetch('/api/v1/cash-register/close', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'Dnevno zapiranje' })
    })
    if (r.ok) { onNotify?.('Blagajna zaprta'); checkCashRegister() }
    else onNotify?.('Napaka', true)
  }

  const generateZreport = async () => {
    setLoading(true)
    const r = await fetch('/api/v1/z-report')
    if (r.ok) { setZreport(await r.json()); setStep('zreport') }
    else onNotify?.('Napaka pri generiranju Z-poročila', true)
    setLoading(false)
  }

  const closeOrders = async () => {
    for (const o of openOrders) {
      if (!checkedOrderIds.has(o.id)) {
        try {
          await fetch(`/api/v1/orders/${o.id}/close`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
          })
        } catch { /* skip */ }
      }
    }
    onNotify?.('Naročila zaprta')
    setStep('cash')
    checkCashRegister()
  }

  const confirmDone = () => {
    const now = new Date().toLocaleDateString('sl-SI', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
    localStorage.setItem('last_closing', JSON.stringify({
      date: now,
      orderCount: openOrders.length,
      total: zreport?.total_sales || 0,
      cashClosing: cashStatus?.is_open === false
    }))
    setStep('done')
  }

  const lastClosing = JSON.parse(localStorage.getItem('last_closing') || 'null')

  const section = (s: string, active: boolean, done: boolean) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700,
        background: done ? '#05966920' : active ? '#3b82f620' : '#f1f5f9',
        color: done ? '#059669' : active ? '#3b82f6' : '#94a3b8',
        border: `2px solid ${done ? '#059669' : active ? '#3b82f6' : '#e2e8f0'}`
      }}>{done ? '✓' : active ? '→' : s}</div>
      <div style={{ fontSize: 13, fontWeight: active || done ? 600 : 400, color: done ? '#059669' : active ? '#0f172a' : '#94a3b8' }}>
        {['Preveri odprta naročila', 'Zapri blagajno', 'Z-poročilo', 'Zaključek'][parseInt(s) - 1]}
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div className="page-header">
        <h2>🌙 Dnevno zapiranje</h2>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ marginBottom: 20 }}>
          {section('1', step === 'start' || step === 'orders', step === 'orders' || step === 'cash' || step === 'zreport' || step === 'done')}
          {section('2', step === 'cash', step === 'zreport' || step === 'done')}
          {section('3', step === 'zreport', step === 'done')}
          {section('4', step === 'done', false)}
        </div>

        {step === 'start' && (
          <div>
            <p style={{ fontSize: 14, color: '#475569', marginBottom: 20 }}>
              Sledite korakom za pravilno dnevno zapiranje sistema.
            </p>
            <button className="btn btn-primary" onClick={checkOpenOrders} disabled={loading}>
              {loading ? '⏳' : '🚀 Začni zapiranje'}
            </button>
            {lastClosing && (
              <div style={{ marginTop: 16, fontSize: 12, color: '#64748b', padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                Zadnje zapiranje: {lastClosing.date}
                <br />Naročil: {lastClosing.orderCount} • Skupaj: €{lastClosing.total?.toFixed(2)}
              </div>
            )}
          </div>
        )}

        {step === 'orders' && (
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              {openOrders.length > 0 ? `⚠️ ${openOrders.length} odprtih naročil` : '✅ Ni odprtih naročil'}
            </h3>
            {openOrders.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>
                  Označi naročila, ki naj ostanejo odprta:
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {openOrders.map(o => (
                    <label key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '4px 8px', background: '#fef2f2', borderRadius: 6, cursor: 'pointer' }}>
                      <input type="checkbox" checked={checkedOrderIds.has(o.id)}
                        onChange={() => {
                          const next = new Set(checkedOrderIds)
                          if (next.has(o.id)) next.delete(o.id); else next.add(o.id)
                          setCheckedOrderIds(next)
                        }} />
                      <span>#{o.id} • Miza {o.table_name || o.table_id} • €{o.total?.toFixed(2)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={closeOrders} disabled={loading}>
                {openOrders.filter(o => !checkedOrderIds.has(o.id)).length > 0
                  ? `Zapri ${openOrders.filter(o => !checkedOrderIds.has(o.id)).length} naročil`
                  : 'Nadaljuj'}
              </button>
              <button className="btn" onClick={() => setStep('cash')}>Preskoči</button>
            </div>
          </div>
        )}

        {step === 'cash' && (
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              {cashStatus?.is_open ? '🔓 Blagajna je odprta' : '🔒 Blagajna je zaprta'}
            </h3>
            {cashStatus && (
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                {cashStatus.entries?.length > 0 && (
                  <div>Vnosov danes: {cashStatus.entries.length}</div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              {cashStatus?.is_open && (
                <button className="btn" style={{ background: '#059669', color: '#fff' }} onClick={closeRegister} disabled={loading}>
                  🔒 Zapri blagajno
                </button>
              )}
              <button className="btn btn-primary" onClick={generateZreport} disabled={loading}>
                📋 Generiraj Z-poročilo
              </button>
              <button className="btn" onClick={() => setStep('zreport')}>Preskoči</button>
            </div>
          </div>
        )}

        {step === 'zreport' && (
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>📋 Z-poročilo</h3>
            {zreport ? (
              <div style={{ fontSize: 13, color: '#475569', marginBottom: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  <div className="card" style={{ padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Skupaj prodaja</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>€{(zreport.total_sales || 0).toFixed(2)}</div>
                  </div>
                  <div className="card" style={{ padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Št. transakcij</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{zreport.transaction_count || 0}</div>
                  </div>
                </div>
                {zreport.payment_methods && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Po načinih plačila:</div>
                    {Object.entries(zreport.payment_methods).map(([m, a]) => (
                      <div key={m} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: 12 }}>
                        <span>{m}</span>
                        <span>€{(a as number).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>Ni podatkov za Z-poročilo.</div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={confirmDone}>✅ Zaključi zapiranje</button>
              <button className="btn" onClick={generateZreport} disabled={loading}>🔄 Ponovno generiraj</button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🌙</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Dan zaključen!</h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Sistem je pripravljen za naslednji dan.
            </p>
            <button className="btn btn-primary" onClick={() => {
              setStep('start'); setOpenOrders([]); setCashStatus(null); setZreport(null); setCheckedOrderIds(new Set())
            }}>🔄 Novo zapiranje</button>
          </div>
        )}
      </div>
    </div>
  )
}
