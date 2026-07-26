import { useState, useEffect, useCallback } from 'react'
import { getQueueCount } from './offline-cache'
import { authHeader } from './api'

export default function OfflineIndicator() {
  const [offline, setOffline] = useState(!navigator.onLine)
  const [queued, setQueued] = useState(0)
  const [lastOnline, setLastOnline] = useState<Date | null>(null)
  const [reconnecting, setReconnecting] = useState(false)

  const checkQueue = useCallback(async () => {
    try {
      const count = await getQueueCount()
      setQueued(count)
    } catch {
      setQueued(0)
    }
  }, [])

  useEffect(() => {
    const goOff = () => {
      setOffline(true)
      setLastOnline(new Date())
    }
    const goOn = () => {
      setReconnecting(true)
      setOffline(false)
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage('sync')
      }
      setTimeout(() => { checkQueue(); setReconnecting(false) }, 3000)
    }

    window.addEventListener('offline', goOff)
    window.addEventListener('online', goOn)
    const iv = setInterval(checkQueue, 5000)
    checkQueue()

    const onSyncDone = (e: MessageEvent) => {
      if (e.data?.type === 'sync-done') {
        setQueued(e.data.remaining)
        setReconnecting(false)
      }
    }
    navigator.serviceWorker?.addEventListener('message', onSyncDone)

    return () => {
      window.removeEventListener('offline', goOff)
      window.removeEventListener('online', goOn)
      clearInterval(iv)
      navigator.serviceWorker?.removeEventListener('message', onSyncDone)
    }
  }, [checkQueue])

  function handleSync() {
    setReconnecting(true)
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage('sync')
    }
    setTimeout(() => { checkQueue(); setReconnecting(false) }, 3000)
  }

  function formatLastOnline(): string {
    if (!lastOnline) return ''
    const diff = Date.now() - lastOnline.getTime()
    if (diff < 60_000) return 'pred manj kot minuto'
    if (diff < 3_600_000) return `pred ${Math.floor(diff / 60_000)} min`
    return `pred ${Math.floor(diff / 3_600_000)} h`
  }

  if (!offline && !queued) return null

  return (
    <div className={`offline-banner ${offline ? 'offline' : 'syncing'}`}>
      {offline && !reconnecting && (
        <div className="offline-content">
          <span className="offline-icon">📵</span>
          <span>Povezava prekinjena</span>
          {lastOnline && <span className="last-online">Nazadnje povezano: {formatLastOnline()}</span>}
          <button className="reconnect-btn" onClick={handleSync}>
            Ponovno poveži
          </button>
        </div>
      )}
      {reconnecting && (
        <div className="offline-content">
          <span className="reconnecting-pulse">🔄 Ponovno povezujem...</span>
        </div>
      )}
      {!offline && queued > 0 && !reconnecting && (
        <span className="clickable" onClick={handleSync}>
          📤 {queued} čakajočih — klikni za sinhronizacijo
        </span>
      )}
    </div>
  )
}
