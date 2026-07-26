const DB_NAME = 'pos-offline'
const DB_VERSION = 2

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('queue'))
        db.createObjectStore('queue', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('menu'))
        db.createObjectStore('menu', { keyPath: 'key' })
      if (!db.objectStoreNames.contains('tables'))
        db.createObjectStore('tables', { keyPath: 'key' })
      if (!db.objectStoreNames.contains('settings'))
        db.createObjectStore('settings', { keyPath: 'key' })
      if (!db.objectStoreNames.contains('orders'))
        db.createObjectStore('orders', { keyPath: 'key' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export interface QueuedRequest {
  id: number
  url: string
  method: string
  headers: Record<string, string>
  body: string | null
  ts: string
}

export async function cacheMenu(data: unknown): Promise<void> {
  const db = await openDB()
  const tx = db.transaction('menu', 'readwrite')
  tx.objectStore('menu').put({ key: 'menu', data, ts: Date.now() })
}

export async function getCachedMenu(): Promise<unknown | null> {
  const db = await openDB()
  return new Promise((resolve) => {
    const tx = db.transaction('menu', 'readonly')
    const req = tx.objectStore('menu').get('menu')
    req.onsuccess = () => resolve(req.result?.data ?? null)
    req.onerror = () => resolve(null)
  })
}

export async function cacheTables(data: unknown): Promise<void> {
  const db = await openDB()
  const tx = db.transaction('tables', 'readwrite')
  tx.objectStore('tables').put({ key: 'tables', data, ts: Date.now() })
}

export async function getCachedTables(): Promise<unknown | null> {
  const db = await openDB()
  return new Promise((resolve) => {
    const tx = db.transaction('tables', 'readonly')
    const req = tx.objectStore('tables').get('tables')
    req.onsuccess = () => resolve(req.result?.data ?? null)
    req.onerror = () => resolve(null)
  })
}

export async function cacheSettings(data: unknown): Promise<void> {
  const db = await openDB()
  const tx = db.transaction('settings', 'readwrite')
  tx.objectStore('settings').put({ key: 'settings', data, ts: Date.now() })
}

export async function getCachedSettings(): Promise<unknown | null> {
  const db = await openDB()
  return new Promise((resolve) => {
    const tx = db.transaction('settings', 'readonly')
    const req = tx.objectStore('settings').get('settings')
    req.onsuccess = () => resolve(req.result?.data ?? null)
    req.onerror = () => resolve(null)
  })
}

export async function cacheOrder(key: string, data: unknown): Promise<void> {
  const db = await openDB()
  const tx = db.transaction('orders', 'readwrite')
  tx.objectStore('orders').put({ key, data, ts: Date.now() })
}

export async function getCachedOrder(key: string): Promise<unknown | null> {
  const db = await openDB()
  return new Promise((resolve) => {
    const tx = db.transaction('orders', 'readonly')
    const req = tx.objectStore('orders').get(key)
    req.onsuccess = () => resolve(req.result?.data ?? null)
    req.onerror = () => resolve(null)
  })
}

export async function queueRequest(url: string, method: string, headers: Record<string, string>, body: string | null): Promise<void> {
  const db = await openDB()
  const tx = db.transaction('queue', 'readwrite')
  tx.objectStore('queue').put({
    id: Date.now() + Math.random(),
    url,
    method,
    headers,
    body,
    ts: new Date().toISOString(),
  })
}

export async function getQueueCount(): Promise<number> {
  const db = await openDB()
  return new Promise((resolve) => {
    const tx = db.transaction('queue', 'readonly')
    const req = tx.objectStore('queue').count()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(0)
  })
}

export async function getAllQueued(): Promise<QueuedRequest[]> {
  const db = await openDB()
  return new Promise((resolve) => {
    const tx = db.transaction('queue', 'readonly')
    const req = tx.objectStore('queue').getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve([])
  })
}

export async function removeQueued(id: number): Promise<void> {
  const db = await openDB()
  const tx = db.transaction('queue', 'readwrite')
  tx.objectStore('queue').delete(id)
}

export async function clearQueue(): Promise<void> {
  const db = await openDB()
  const tx = db.transaction('queue', 'readwrite')
  tx.objectStore('queue').clear()
}

export async function replayQueue(authHeader: () => Record<string, string>): Promise<number> {
  const items = await getAllQueued()
  let remaining = 0
  for (const item of items) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: { ...item.headers, ...authHeader() },
        body: item.body,
      })
      if (res.ok) {
        await removeQueued(item.id)
      } else {
        remaining++
      }
    } catch {
      remaining++
    }
  }
  return remaining
}
