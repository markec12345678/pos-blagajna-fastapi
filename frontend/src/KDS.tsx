import { useState, useEffect, useCallback, useRef } from 'react'
import * as api from './api'
import { printKitchenOrder } from './PrintService'
import { useTranslation } from './i18n'
import { useWebSocket } from './useWebSocket'

function playBeep(freq = 880, dur = 300, pattern = 'triple') {
  try {
    const beep = (delay: number) => {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type = 'square'
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur / 1000)
      osc.start(ctx.currentTime + delay)
      osc.stop(ctx.currentTime + delay + dur / 1000)
    }
    beep(0)
    if (pattern === 'double') setTimeout(() => beep(0), dur + 200)
    else if (pattern === 'triple') {
      setTimeout(() => beep(0), dur + 200)
      setTimeout(() => beep(0), (dur + 200) * 2)
    }
  } catch {}
}

const kdsSettings = () => ({
  sound: localStorage.getItem('kds-sound') !== 'off',
  freq: parseInt(localStorage.getItem('kds-freq') || '880'),
  dur: parseInt(localStorage.getItem('kds-dur') || '300'),
  pattern: localStorage.getItem('kds-pattern') || 'triple',
  autoScroll: localStorage.getItem('kds-autoscroll') !== 'off',
  pendingOnly: localStorage.getItem('kds-pending') === 'on',
  refresh: parseInt(localStorage.getItem('kds-refresh') || '5'),
})

export default function KDS({ onNotify }: { onNotify: (msg: string) => void }) {
  const { t } = useTranslation()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState(kdsSettings)
  const [showSettings, setShowSettings] = useState(false)
  const [prepStations, setPrepStations] = useState<any[]>([])
  const [selStation, setSelStation] = useState<string | null>(null)
  const prevIds = useRef<Set<number>>(new Set())
  const newOrderIds = useRef<Set<number>>(new Set())
  const gridRef = useRef<HTMLDivElement>(null)

  const persist = (key: string, val: any) => {
    localStorage.setItem(key, String(val))
    setSettings(kdsSettings())
  }

  const load = useCallback(async () => {
    try {
      const data = await api.getKdsOrders()
      const newIds = new Set(data.map((o: any) => o.order_id))
      const hadPrev = prevIds.current.size > 0
      const hasNew = data.some((o: any) => !prevIds.current.has(o.order_id))
      if (settings.sound && hadPrev && hasNew) {
        playBeep(settings.freq, settings.dur, settings.pattern)
        newOrderIds.current = new Set(data.filter((o: any) => !prevIds.current.has(o.order_id)).map((o: any) => o.order_id))
        if (settings.autoScroll && gridRef.current) {
          setTimeout(() => gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 300)
        }
      }
      prevIds.current = newIds
      setOrders(data)
      if (hasNew) {
        setTimeout(() => { newOrderIds.current = new Set() }, 3000)
      }
    } catch {}
    setLoading(false)
  }, [settings.sound, settings.freq, settings.dur, settings.pattern, settings.autoScroll])

  useEffect(() => { load(); const iv = setInterval(load, settings.refresh * 1000); return () => clearInterval(iv) }, [load, settings.refresh])
  useEffect(() => { loadStations() }, [])
  useWebSocket((evt) => {
    if (['order_created', 'order_closed', 'item_status'].includes(evt.event)) load()
  })

  const loadStations = async () => {
    try {
      const r = await fetch('/api/v1/settings', { headers: api.authHeader() })
      const settingsData = await r.json()
      const stations = (settingsData.prep_stations || 'Grill,Pizza,Salad,Bar').split(',').map((s: string) => ({
        id: s.trim().toLowerCase(),
        name: s.trim(),
        items: []
      }))
      setPrepStations(stations)
    } catch {}
  }

  const markReady = async (itemId: number) => {
    await api.updateKdsItem(itemId, 'ready')
    load()
  }

  const markAllReady = async (orderId: number) => {
    const order = orders.find(o => o.order_id === orderId)
    if (!order) return
    for (const item of order.items) {
      if (item.status !== 'ready') {
        await api.updateKdsItem(item.id, 'ready')
      }
    }
    onNotify(`Naročilo #${orderId} — vsi artikli pripravljeni`)
    load()
  }

  if (loading) return <div className="loading-state">Nalaganje...</div>

  const urgent = orders.filter(o => o.items.some((i: any) => i.elapsed_minutes > 15 && i.status !== 'ready'))
  const normal = orders.filter(o => !o.items.some((i: any) => i.elapsed_minutes > 15 && i.status !== 'ready'))

  const stationFilters: Record<string, string[]> = {
    grill: ['steak', 'burger', 'riba', 'file', 'grill'],
    pizza: ['pizza', 'pasta'],
    salad: ['salad', 'juha'],
    bar: ['pivo', 'kava', 'wine', 'drink', 'čaj']
  }

  const filterFn = (o: any) => {
    if (selStation) {
      const keywords = stationFilters[selStation] || []
      if (!o.items.some((i: any) => keywords.some(k => i.item_name.toLowerCase().includes(k)))) return false
    }
    if (settings.pendingOnly && o.items.every((i: any) => i.status === 'ready')) return false
    return true
  }

  const filteredUrgent = urgent.filter(filterFn)
  const filteredNormal = normal.filter(filterFn)

  return (
    <div className="kds-page">
      <div className="kds-header">
        <h2>🍳 {'Kuhinja'} — KDS</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {prepStations.length > 0 && (
            <select className="input" value={selStation || ''} onChange={e => setSelStation(e.target.value || null)} style={{ width: 100, fontSize: 12 }}>
              <option value="">🍳 Vse</option>
              {prepStations.map(st => (
                <option key={st.id} value={st.id}>{st.name}</option>
              ))}
            </select>
          )}
          <button onClick={() => persist('kds-pending', settings.pendingOnly ? 'off' : 'on')} className="btn btn-xs"
            style={{ fontSize: 12, background: settings.pendingOnly ? 'var(--blue)' : 'none', color: settings.pendingOnly ? '#fff' : undefined, border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px' }}>
            {settings.pendingOnly ? '⏳ Čakajoči' : '📋 Vsi'}
          </button>
          <button onClick={() => persist('kds-sound', settings.sound ? 'off' : 'on')} className="btn btn-xs"
            title={settings.sound ? 'Izklopi zvok' : 'Vklopi zvok'}
            style={{ fontSize: 18, background: 'none', border: settings.sound ? '2px solid var(--green)' : '2px solid var(--border)', borderRadius: 6, padding: '2px 6px' }}>
            {settings.sound ? '🔊' : '🔇'}
          </button>
          <button onClick={() => setShowSettings(!showSettings)} className="btn btn-xs"
            style={{ fontSize: 14, background: showSettings ? 'var(--surface2)' : 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 6px' }}>
            ⚙️
          </button>
          <span className="kds-header-meta">{orders.length} aktivnih</span>
        </div>
      </div>

      {showSettings && (
        <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: 16, marginBottom: 12, display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 4, color: 'var(--text2)' }}>Frekvenca zvoka: {settings.freq} Hz</label>
            <input type="range" min={200} max={2000} step={50} value={settings.freq} onChange={e => persist('kds-freq', parseInt(e.target.value))} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, color: 'var(--text2)' }}>Trajanje: {settings.dur} ms</label>
            <input type="range" min={100} max={800} step={50} value={settings.dur} onChange={e => persist('kds-dur', parseInt(e.target.value))} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, color: 'var(--text2)' }}>Vzorec:</label>
            <select className="input" value={settings.pattern} onChange={e => persist('kds-pattern', e.target.value)} style={{ fontSize: 12 }}>
              <option value="single">Enkrat</option>
              <option value="double">Dvakrat</option>
              <option value="triple">Trikrat</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, color: 'var(--text2)' }}>Osveževanje: {settings.refresh}s</label>
            <input type="range" min={2} max={30} step={1} value={settings.refresh} onChange={e => persist('kds-refresh', parseInt(e.target.value))} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ color: 'var(--text2)' }}>Samodejni pomik</label>
            <input type="checkbox" checked={settings.autoScroll} onChange={e => persist('kds-autoscroll', e.target.checked ? 'on' : 'off')} />
          </div>
        </div>
      )}

      {filteredUrgent.length > 0 && (
        <>
          <div className="kds-section-title urgent" style={{ animation: 'none' }}>⚠️ ZAMUDE ({filteredUrgent.length})</div>
          <div className="kds-grid">
            {filteredUrgent.map(o => <KdsCard key={o.order_id} order={o} urgent onReady={markReady} onAllReady={markAllReady} />)}
          </div>
        </>
      )}

      <div className="kds-section-title normal" style={{ padding: filteredNormal.length && filteredUrgent.length ? '4px 24px' : '12px 24px 4px' }}>
        {filteredNormal.length || filteredUrgent.length ? `Naročila (${filteredNormal.length + filteredUrgent.length})` : ''}
      </div>

      {!filteredOrders().length ? (
        <div className="kds-empty" style={{ marginTop: 40 }}>
          <div className="kds-empty-icon">🍽️</div>
          <div className="kds-empty-text">Ni aktivnih naročil</div>
        </div>
      ) : (
        <div className="kds-grid" ref={gridRef}>
          {filteredNormal.map(o => <KdsCard key={o.order_id} order={o} isNew={newOrderIds.current.has(o.order_id)} onReady={markReady} onAllReady={markAllReady} />)}
        </div>
      )}
    </div>
  )
  function setSoundOn(v: boolean) { persist('kds-sound', v ? 'on' : 'off') }
  function filteredOrders() { return orders.filter(filterFn) }
}

function KdsCard({ order, urgent, isNew, onReady, onAllReady }: { order: any; urgent?: boolean; isNew?: boolean; onReady: (id: number) => void; onAllReady: (orderId: number) => void }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const typeIcon = order.order_type === 'takeaway' ? '🛍️' : order.order_type === 'delivery' ? '🛵' : '🏠'
  const minColor = order.elapsed_minutes > 15 ? 'danger' : order.elapsed_minutes > 10 ? 'warning' : 'normal'
  const pendingCount = order.items.filter((i: any) => i.status !== 'ready').length

  const grouped: Record<string, any[]> = {}
  for (const item of order.items) {
    if (item.status === 'ready') continue
    const cname = item.course_name || 'Ostalo'
    if (!grouped[cname]) grouped[cname] = []
    grouped[cname].push(item)
  }

  return (
    <div ref={cardRef} className={`kds-card ${urgent ? 'urgent' : order.elapsed_minutes > 10 ? 'waiting' : ''} ${isNew ? 'kds-new' : ''}`}>
      <div className="kds-card-header">
        <div>
          <div className="kds-card-table">{order.table_name}</div>
          <div className="kds-card-meta">
            {order.customer_name || '—'} • {order.item_count} art.
            {pendingCount < order.item_count && <span style={{ color: '#fbbf24', fontSize: 11, marginLeft: 4 }}>({pendingCount} čaka)</span>}
            <span className="kds-type-badge">{typeIcon}</span>
            <button onClick={() => printKitchenOrder({ id: order.order_id, items: order.items, customer_name: order.customer_name }, order.table_name)}
              className="kds-print-btn" title="Natisni">🖨️</button>
            <button onClick={() => onAllReady(order.order_id)} className="kds-ready-all-btn" title="Vsi pripravljeni">✓✓</button>
          </div>
          {order.notes && <div className="kds-order-note">📝 {order.notes}</div>}
          {(() => { try { const tags = JSON.parse(order.tags || '[]'); if (!tags.length) return null; return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>{tags.map((t: string, i: number) => <span key={i} style={{ padding: '1px 6px', borderRadius: 10, fontSize: 10, fontWeight: 600, background: '#555', color: '#fff' }}>{t}</span>)}</div> } catch { return null }})()}
        </div>
        <div className="kds-card-time">
          <div className={`kds-card-minutes ${minColor}`}>
            {Math.floor(order.elapsed_minutes)} min
          </div>
          <div className="kds-card-wait">čakanja</div>
        </div>
      </div>
      {Object.entries(grouped).length > 0 ? Object.entries(grouped).map(([cname, citems]) => (
        <div key={cname}>
          <div className="kds-course-header">{cname}</div>
          {citems.map((item: any) => (
            <div key={item.id} className="kds-item">
              <div>
                <div className="kds-item-name">{item.quantity > 1 ? `${item.item_name} x${item.quantity}` : item.item_name}</div>
                <div className="kds-item-mods">
                  {item.notes && <span className="kds-item-note">📝 {item.notes}</span>}
                  {item.modifiers && (() => {
                    try { const m = JSON.parse(item.modifiers); return m.map((x: any) => x.option_name).join(', ') } catch { return '' }
                  })()}
                </div>
              </div>
              <div className="kds-item-actions">
                <div className="kds-item-time">{item.elapsed_minutes > 3 ? `${item.elapsed_minutes} min` : ''}</div>
                <button onClick={() => onReady(item.id)} className="kds-ready-btn">✓</button>
              </div>
            </div>
          ))}
        </div>
      )) : (
        <div style={{ padding: 12, textAlign: 'center', color: 'var(--green)', fontSize: 13, fontWeight: 600 }}>✅ Vsi artikli pripravljeni</div>
      )}
    </div>
  )
}