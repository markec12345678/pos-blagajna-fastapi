import { useState, useEffect, useCallback, useRef } from 'react'
import * as api from './api'
import { printKitchenOrder } from './PrintService'
import { useTranslation } from './i18n'
import { useWebSocket } from './useWebSocket'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'
import { requestNotificationPermission, notifyNewOrder, isPushSupported } from './notifications'

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
  push: localStorage.getItem('kds-push') === 'on',
})

export default function KDS({ onNotify }: { onNotify: (msg: string) => void }) {
  const { t } = useTranslation()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState(kdsSettings)
  const [showSettings, setShowSettings] = useState(false)
  const [prepStations, setPrepStations] = useState<any[]>([])
  const [selStation, setSelStation] = useState<string | null>(null)
  const [pushEnabled, setPushEnabled] = useState(false)
  const prevIds = useRef<Set<number>>(new Set())
  const newOrderIds = useRef<Set<number>>(new Set())
  const gridRef = useRef<HTMLDivElement>(null)
  const [selectedOrderIdx, setSelectedOrderIdx] = useState(0)
  const lastBumped = useRef<{ itemId: number; status: string }[]>([])

  const persist = (key: string, val: any) => {
    localStorage.setItem(key, String(val))
    setSettings(kdsSettings())
  }

  useEffect(() => {
    if (isPushSupported()) {
      requestNotificationPermission().then(granted => setPushEnabled(granted))
    }
  }, [])

  const load = useCallback(async () => {
    try {
      const data = await api.getKdsOrders()
      const newIds = new Set(data.map((o: any) => o.order_id))
      const hadPrev = prevIds.current.size > 0
      const newOrders = data.filter((o: any) => !prevIds.current.has(o.order_id))
      const hasNew = newOrders.length > 0

      if (settings.sound && hadPrev && hasNew) {
        playBeep(settings.freq, settings.dur, settings.pattern)
      }
      if (settings.push && hasNew) {
        for (const o of newOrders) {
          notifyNewOrder(o.order_id, o.table_name, o.item_count)
        }
      }

      if (hasNew) {
        newOrderIds.current = new Set(newOrders.map((o: any) => o.order_id))
        if (settings.autoScroll && gridRef.current) {
          setTimeout(() => gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 300)
        }
      }
      prevIds.current = newIds
      setOrders(data)
      if (hasNew) {
        setTimeout(() => { newOrderIds.current = new Set() }, 3000)
      }
    } catch (e) { console.error('KDS load failed:', e) }
    setLoading(false)
  }, [settings.sound, settings.freq, settings.dur, settings.pattern, settings.autoScroll, settings.push])

  useEffect(() => { load(); const iv = setInterval(load, settings.refresh * 1000); return () => clearInterval(iv) }, [load, settings.refresh])
  useEffect(() => { loadStations() }, [])
  useWebSocket((evt) => {
    if (['order_created', 'order_closed', 'item_status'].includes(evt.event)) load()
    if (evt.event === 'low_stock_alert' && evt.data?.items) {
      const items = evt.data.items
      onNotify(`⚠️ Nizka zaloga: ${items.map((i: any) => `${i.name} (${i.stock}/${i.min_stock})`).join(', ')}`)
    }
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
    } catch (e) { console.error('KDS stations load failed:', e) }
  }

  const markReady = async (itemId: number) => {
    lastBumped.current.push({ itemId, status: 'ready' })
    if (lastBumped.current.length > 20) lastBumped.current.shift()
    await api.updateKdsItem(itemId, 'ready')
    load()
  }

  const markAllReady = async (orderId: number) => {
    const order = orders.find(o => o.order_id === orderId)
    if (!order) return
    for (const item of order.items) {
      if (item.status !== 'ready') {
        lastBumped.current.push({ itemId: item.id, status: item.status })
      }
    }
    if (lastBumped.current.length > 20) lastBumped.current = lastBumped.current.slice(-20)
    for (const item of order.items) {
        await api.updateKdsItem(item.id, 'ready')
      }
    onNotify(`Naročilo #${orderId} — vsi artikli pripravljeni`)
    load()
  }

  const recallLast = async () => {
    const bumped = lastBumped.current.splice(-5)
    if (!bumped.length) { onNotify('Ni zadnjih zadetkov za preklic'); return }
    for (const b of bumped) {
      await api.updateKdsItem(b.itemId, b.status || 'ordered')
    }
    onNotify(`Vrnjenih ${bumped.length} artiklov`)
    load()
  }

  const togglePush = async () => {
    if (!pushEnabled) {
      const granted = await requestNotificationPermission()
      setPushEnabled(granted)
      if (granted) persist('kds-push', 'on')
    } else {
      persist('kds-push', settings.push ? 'off' : 'on')
    }
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

  const allFiltered = [...filteredUrgent, ...filteredNormal]
  const clampedIdx = Math.min(selectedOrderIdx, Math.max(0, allFiltered.length - 1))

  useKeyboardShortcuts({
    'r': () => { if (allFiltered[clampedIdx]) markAllReady(allFiltered[clampedIdx].order_id) },
    'u': () => recallLast(),
    's': () => persist('kds-sound', settings.sound ? 'off' : 'on'),
    'p': () => persist('kds-pending', settings.pendingOnly ? 'off' : 'on'),
    'n': () => togglePush(),
    'ArrowLeft': () => setSelectedOrderIdx(i => Math.max(0, i - 1)),
    'ArrowRight': () => setSelectedOrderIdx(i => Math.min(allFiltered.length - 1, i + 1)),
    'F5': () => load(),
  }, !loading)

  return (
    <div className="kds-page">
      <div className="kds-header">
        <h2>🍳 {'Kuhinja'} — KDS</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {prepStations.length > 0 && (
            <select className="input" value={selStation || ''} onChange={e => setSelStation(e.target.value || null)} aria-label="Pripravljalna postaja" style={{ width: 100, fontSize: 12 }}>
              <option value="">🍳 Vse</option>
              {prepStations.map(st => (
                <option key={st.id} value={st.id}>{st.name}</option>
              ))}
            </select>
          )}
          <button onClick={() => persist('kds-pending', settings.pendingOnly ? 'off' : 'on')} className="btn btn-xs"
            aria-label={settings.pendingOnly ? 'Prikaži vsa naročila' : 'Prikaži samo čakajoča'}
            style={{ fontSize: 12, background: settings.pendingOnly ? 'var(--blue)' : 'none', color: settings.pendingOnly ? '#fff' : undefined, border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px' }}>
            {settings.pendingOnly ? '⏳ Čakajoči' : '📋 Vsi'}
          </button>
          <button onClick={() => persist('kds-sound', settings.sound ? 'off' : 'on')} className="btn btn-xs"
            title={settings.sound ? 'Izklopi zvok' : 'Vklopi zvok'}
            aria-label={settings.sound ? 'Izklopi zvok' : 'Vklopi zvok'}
            style={{ fontSize: 18, background: 'none', border: settings.sound ? '2px solid var(--green)' : '2px solid var(--border)', borderRadius: 6, padding: '2px 6px' }}>
            {settings.sound ? '🔊' : '🔇'}
          </button>
          {isPushSupported() && (
            <button onClick={togglePush} className="btn btn-xs"
              title={settings.push ? 'Izklopi obvestila' : 'Vklopi obvestila'}
              aria-label={settings.push ? 'Izklopi obvestila' : 'Vklopi obvestila'}
              style={{ fontSize: 16, background: 'none', border: settings.push ? '2px solid var(--amber)' : '2px solid var(--border)', borderRadius: 6, padding: '2px 6px' }}>
              {settings.push ? '🔔' : '🔕'}
            </button>
          )}
          <button onClick={() => setShowSettings(!showSettings)} className="btn btn-xs"
            aria-label={showSettings ? 'Skrij nastavitve' : 'Prikaži nastavitve'}
            style={{ fontSize: 14, background: showSettings ? 'var(--surface2)' : 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 6px' }}>
            ⚙️
          </button>
          <button onClick={recallLast} className="btn btn-xs"
            title="Prekliči zadnje (U)" aria-label="Prekliči zadnje pripravljene artikle"
            style={{ fontSize: 14, background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 6px' }}>
            ↩️
          </button>
          <span className="kds-header-meta">{orders.length} aktivnih</span>
          <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 8, whiteSpace: 'nowrap' }}>[←→] izberi  [R] pripravljeno  [U] prekliči  [S] zvok  [P] filter</span>
        </div>
      </div>

      {showSettings && (
        <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: 16, marginBottom: 12, display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 4, color: 'var(--text2)' }}>Frekvenca zvoka: {settings.freq} Hz</label>
            <input type="range" min={200} max={2000} step={50} value={settings.freq} onChange={e => persist('kds-freq', parseInt(e.target.value))} aria-label="Frekvenca zvoka" />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, color: 'var(--text2)' }}>Trajanje: {settings.dur} ms</label>
            <input type="range" min={100} max={800} step={50} value={settings.dur} onChange={e => persist('kds-dur', parseInt(e.target.value))} aria-label="Trajanje zvoka" />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, color: 'var(--text2)' }}>Vzorec:</label>
            <select className="input" value={settings.pattern} onChange={e => persist('kds-pattern', e.target.value)} aria-label="Vzorec zvoka" style={{ fontSize: 12 }}>
              <option value="single">Enkrat</option>
              <option value="double">Dvakrat</option>
              <option value="triple">Trikrat</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, color: 'var(--text2)' }}>Osveževanje: {settings.refresh}s</label>
            <input type="range" min={2} max={30} step={1} value={settings.refresh} onChange={e => persist('kds-refresh', parseInt(e.target.value))} aria-label="Interval osveževanja" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ color: 'var(--text2)' }}>Samodejni pomik</label>
            <input type="checkbox" checked={settings.autoScroll} onChange={e => persist('kds-autoscroll', e.target.checked ? 'on' : 'off')} aria-label="Samodejni pomik" />
          </div>
        </div>
      )}

      {filteredUrgent.length > 0 && (
        <>
          <div className="kds-section-title urgent" style={{ animation: 'none' }}>⚠️ ZAMUDE ({filteredUrgent.length})</div>
          <div className="kds-grid">
            {filteredUrgent.map((o, i) => <KdsCard key={o.order_id} order={o} urgent selected={i === clampedIdx} onReady={markReady} onAllReady={markAllReady} />)}
          </div>
        </>
      )}

      <div className="kds-section-title normal" style={{ padding: filteredNormal.length && filteredUrgent.length ? '4px 24px' : '12px 24px 4px' }}>
        {filteredNormal.length || filteredUrgent.length ? `Naročila (${filteredNormal.length + filteredUrgent.length})` : ''}
      </div>

      {!orders.filter(filterFn).length ? (
        <div className="kds-empty" style={{ marginTop: 40 }}>
          <div className="kds-empty-icon">🍽️</div>
          <div className="kds-empty-text">Ni aktivnih naročil</div>
        </div>
      ) : (
        <div className="kds-grid" ref={gridRef}>
          {filteredNormal.map((o, i) => <KdsCard key={o.order_id} order={o} isNew={newOrderIds.current.has(o.order_id)} selected={i + filteredUrgent.length === clampedIdx} onReady={markReady} onAllReady={markAllReady} />)}
        </div>
      )}
    </div>
  )
}

function KdsCard({ order, urgent, isNew, selected, onReady, onAllReady }: { order: any; urgent?: boolean; isNew?: boolean; selected?: boolean; onReady: (id: number) => void; onAllReady: (orderId: number) => void }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef(0)
  const touchCurrentX = useRef(0)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerId, setTimerId] = useState<number | null>(null)
  const typeIcon = order.order_type === 'takeaway' ? '🛍️' : order.order_type === 'delivery' ? '🛵' : '🏠'
  const minColor = order.elapsed_minutes > 15 ? 'danger' : order.elapsed_minutes > 10 ? 'warning' : 'normal'
  const pendingCount = order.items.filter((i: any) => i.status !== 'ready').length

  const startTimer = async () => {
    try {
      const r = await api.startKDSTimer(order.order_id)
      if (r.timer_id) {
        setTimerRunning(true)
        setTimerId(r.timer_id)
      }
    } catch {}
  }

  const completeTimer = async () => {
    if (!timerId) return
    try {
      await api.completeKDSTimer(timerId)
      setTimerRunning(false)
      setTimerId(null)
    } catch {}
  }

  const grouped: Record<string, any[]> = {}
  for (const item of order.items) {
    if (item.status === 'ready') continue
    const cname = item.course_name || 'Ostalo'
    if (!grouped[cname]) grouped[cname] = []
    grouped[cname].push(item)
  }

  const courseProgress: { name: string; done: number; total: number }[] = (() => {
    const all: Record<string, { done: number; total: number }> = {}
    for (const item of order.items) {
      const cname = item.course_name || 'Ostalo'
      if (!all[cname]) all[cname] = { done: 0, total: 0 }
      all[cname].total++
      if (item.status === 'ready') all[cname].done++
    }
    return Object.entries(all).map(([name, v]) => ({ name, ...v }))
  })()

  const fireCourse = async (courseName: string) => {
    for (const item of order.items) {
      if ((item.course_name || 'Ostalo') === courseName && item.status !== 'ready') {
        await api.updateKdsItem(item.id, 'ready')
      }
    }
    onAllReady(order.order_id)
  }

  const getItemStatus = (item: any) => {
    if (item.status === 'ready') return 'ready'
    if (item.elapsed_minutes > 15) return 'preparing'
    return 'new'
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchCurrentX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentX.current = e.touches[0].clientX
    const diff = touchCurrentX.current - touchStartX.current
    if (diff > 0) setSwipeOffset(Math.min(diff, 120))
  }

  const handleTouchEnd = () => {
    if (swipeOffset > 80) {
      onAllReady(order.order_id)
    }
    setSwipeOffset(0)
  }

  return (
    <div ref={cardRef}
         className={`kds-card ${urgent ? 'urgent' : order.elapsed_minutes > 10 ? 'waiting' : ''} ${isNew ? 'kds-new' : ''}`}
         role="article" aria-label={`Naročilo ${order.table_name}`}
         style={{ borderRadius: '16px', border: selected ? '2px solid var(--green)' : '2px solid var(--border)', overflow: 'hidden', transform: swipeOffset ? `translateX(${swipeOffset}px)` : undefined, transition: swipeOffset ? 'none' : 'transform 0.3s ease', opacity: swipeOffset > 80 ? 0.5 : 1 }}>
      {swipeOffset > 40 && (
        <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 24, fontWeight: 700, color: 'var(--green)', opacity: Math.min((swipeOffset - 40) / 60, 1) }}>
          ✓ Pripravljeno
        </div>
      )}
      <div className="kds-card-header" style={{ padding: '16px', background: 'var(--surface2)' }}
           onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        <div>
          <div className="kds-card-table" style={{ fontSize: '18px', fontWeight: '800' }}>{order.table_name}</div>
          <div className="kds-card-meta" style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {order.customer_name || '—'} • {order.item_count} art.
            {pendingCount < order.item_count && <span className="status-badge preparing" style={{ fontSize: '10px' }}>({pendingCount} čaka)</span>}
            <span className="kds-type-badge">{typeIcon}</span>
            <button onClick={() => printKitchenOrder({ id: order.order_id, items: order.items, customer_name: order.customer_name }, order.table_name)}
              className="kds-print-btn" title="Natisni" aria-label={`Natisni naročilo #${order.order_id}`}>🖨️</button>
            <button onClick={() => timerRunning ? completeTimer() : startTimer()}
              className="kds-timer-btn" title={timerRunning ? 'Označi kot pripravljeno' : 'Začni časovnik'}
              style={{ 
                background: timerRunning ? 'var(--amber)' : 'var(--surface)', 
                color: timerRunning ? '#fff' : 'var(--text2)',
                borderRadius: 8, border: 'none', padding: '4px 8px', cursor: 'pointer', fontSize: 14
              }}>
              {timerRunning ? '⏱️' : '⏰'}
            </button>
            <button onClick={() => onAllReady(order.order_id)} className="kds-ready-all-btn" title="Vsi pripravljeni"
                    aria-label={`Označi vse artikle kot pripravljene - naročilo #${order.order_id}`}
                    style={{ background: 'var(--green)', color: '#fff', borderRadius: '8px' }}>✓✓</button>
          </div>
          {order.notes && <div className="kds-order-note" style={{ marginTop: '8px' }}>📝 {order.notes}</div>}
          {(() => { try { const tags = JSON.parse(order.tags || '[]'); if (!tags.length) return null; return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>{tags.map((t: string, i: number) => <span key={i} className="status-badge new" style={{ fontSize: '10px' }}>{t}</span>)}</div> } catch { return null }})()}
          {courseProgress.length > 1 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              {courseProgress.map(cp => (
                <div key={cp.name} style={{ display: 'flex', alignItems: 'center', gap: 4, background: cp.done === cp.total ? 'var(--green)' : 'var(--surface)', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600, color: cp.done === cp.total ? '#fff' : 'var(--text2)' }}>
                  <span>{cp.name}</span>
                  <span style={{ background: cp.done === cp.total ? 'rgba(255,255,255,0.3)' : 'var(--border)', borderRadius: 4, padding: '0 4px', fontSize: 10 }}>{cp.done}/{cp.total}</span>
                  {cp.done < cp.total && (
                    <button onClick={() => fireCourse(cp.name)} title={`Pripravi vse: ${cp.name}`}
                      style={{ background: 'var(--amber)', color: '#fff', border: 'none', borderRadius: 4, padding: '0 4px', fontSize: 9, cursor: 'pointer', fontWeight: 700 }}>🔥</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="kds-card-time" style={{ textAlign: 'right' }}>
           <div className={`kds-card-minutes ${minColor}`} style={{ fontSize: '24px', fontWeight: '800' }} aria-live="polite">
             {Math.floor(order.elapsed_minutes)} min
          </div>
          <div className="kds-card-wait" style={{ fontSize: '12px', color: 'var(--text2)' }}>čakanja</div>
          {timerRunning && (
            <div style={{ 
              marginTop: 4, padding: '2px 8px', borderRadius: 99, 
              background: 'var(--amber)', color: '#fff', fontSize: 11, fontWeight: 600,
              display: 'inline-block'
            }}>
              ⏱️ Timer teče
            </div>
          )}
        </div>
      </div>
      {Object.entries(grouped).length > 0 ? Object.entries(grouped).map(([cname, citems]) => (
        <div key={cname} style={{ padding: '12px 16px' }}>
          <div className="kds-course-header" style={{ fontSize: '14px', fontWeight: '700', marginBottom: '10px', color: 'var(--text2)' }}>{cname}</div>
          {citems.map((item: any) => (
            <SwipeableItem key={item.id} item={item} onReady={onReady} getItemStatus={getItemStatus} />
          ))}
        </div>
      )) : (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--green)', fontSize: '15px', fontWeight: '700' }}>✅ Vsi artikli pripravljeni</div>
      )}
    </div>
  )
}

function SwipeableItem({ item, onReady, getItemStatus }: { item: any; onReady: (id: number) => void; getItemStatus: (item: any) => string }) {
  const startX = useRef(0)
  const [offset, setOffset] = useState(0)
  const [done, setDone] = useState(false)

  const onTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX }
  const onTouchMove = (e: React.TouchEvent) => {
    const diff = e.touches[0].clientX - startX.current
    if (diff > 0) setOffset(Math.min(diff, 100))
  }
  const onTouchEnd = () => {
    if (offset > 60) {
      setDone(true)
      setTimeout(() => onReady(item.id), 200)
    }
    setOffset(0)
  }

  if (done) return (
    <div className="kds-item" style={{ padding: '12px', background: 'var(--green-light)', borderRadius: '12px', marginBottom: '8px', textAlign: 'center', color: 'var(--green)', fontWeight: 700, animation: 'fadeIn 0.2s ease' }}>
      ✅ Pripravljeno
    </div>
  )

  return (
    <div className="kds-item" style={{ padding: '12px', background: 'var(--surface2)', borderRadius: '12px', marginBottom: '8px', position: 'relative', overflow: 'hidden', transform: offset ? `translateX(${offset}px)` : undefined, transition: offset ? 'none' : 'transform 0.3s ease', opacity: offset > 60 ? 0.3 : 1 }}
         onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      {offset > 30 && (
        <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--green)', fontWeight: 700, opacity: Math.min((offset - 30) / 40, 1) }}>
          ✓
        </div>
      )}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <div className="kds-item-name" style={{ fontSize: '16px', fontWeight: '700' }}>
            {item.quantity > 1 ? `${item.item_name} x${item.quantity}` : item.item_name}
          </div>
          <span className={`status-badge ${getItemStatus(item)}`} style={{ fontSize: '10px' }}>
            {getItemStatus(item) === 'ready' ? 'PRIPRAVLJENO' : getItemStatus(item) === 'preparing' ? 'PRIPRAVLJA SE' : 'NOVO'}
          </span>
        </div>
        <div className="kds-item-mods">
          {item.notes && <span className="kds-item-note">📝 {item.notes}</span>}
          {item.modifiers && (() => {
            try { const m = JSON.parse(item.modifiers); return m.map((x: any) => x.option_name).join(', ') } catch { return '' }
          })()}
        </div>
      </div>
      <div className="kds-item-actions" style={{ gap: '12px' }}>
        <div className="kds-item-time" style={{ fontSize: '12px', fontWeight: '600' }} aria-live="polite">{item.elapsed_minutes > 3 ? `${item.elapsed_minutes} min` : ''}</div>
        <button onClick={() => onReady(item.id)} className="kds-ready-btn"
                aria-label={`Označi kot pripravljeno: ${item.item_name}`}
                style={{ width: '40px', height: '40px', borderRadius: '10px', fontSize: '18px', fontWeight: '800', background: 'var(--green)', color: '#fff' }}>✓</button>
      </div>
    </div>
  )
}
