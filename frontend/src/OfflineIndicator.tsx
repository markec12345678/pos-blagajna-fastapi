import { useState, useEffect } from 'react'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open('pos-offline', 1)
    r.onupgradeneeded = () => {
      if (!r.result.objectStoreNames.contains('queue'))
        r.result.createObjectStore('queue', { keyPath: 'id' })
    }
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

export default function OfflineIndicator() {
  const [offline, setOffline] = useState(!navigator.onLine)
  const [queued, setQueued] = useState(0)

  useEffect(() => {
    const goOff = () => setOffline(true)
    const goOn = () => { setOffline(false); syncQueue() }
    window.addEventListener('offline', goOff)
    window.addEventListener('online', goOn)
    const iv = setInterval(checkQueue, 5000)
    checkQueue()
    return () => {
      window.removeEventListener('offline', goOff)
      window.removeEventListener('online', goOn)
      clearInterval(iv)
    }
  }, [])

  async function checkQueue() {
    if (!navigator.serviceWorker?.controller) return
    try {
      const db = await openDB()
      const tx = db.transaction('queue', 'readonly')
      const store = tx.objectStore('queue')
      const req = store.count()
      req.onsuccess = () => setQueued(req.result)
    } catch {}
  }

  async function syncQueue() {
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage('sync')
      setTimeout(checkQueue, 2000)
    }
  }

  if (!offline && !queued) return null

  return (
    <div className={`offline-banner ${offline ? 'offline' : 'syncing'}`}>
      {offline ? (
        <>📵 Brez povezave</>
      ) : (
        <span className="clickable" onClick={syncQueue}>
          📤 {queued} čakajočih — klikni za sinhronizacijo
        </span>
      )}
    </div>
  )
}
