const PERMISSION_KEY = 'pos_push_permission'

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function sendNotification(title: string, options?: NotificationOptions) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  try {
    const n = new Notification(title, {
      icon: '/icon-192.svg',
      badge: '/icon-192.svg',
      tag: 'pos-kds',
      ...options,
    } as NotificationOptions)
    n.onclick = () => {
      window.focus()
      n.close()
    }
    setTimeout(() => n.close(), 8000)
  } catch {}
}

export function notifyNewOrder(orderId: number, tableName: string, itemCount: number) {
  sendNotification(`🍽️ Nova naročilo #${orderId}`, {
    body: `Miza ${tableName} — ${itemCount} artiklov`,
    tag: `pos-order-${orderId}`,
  })
}

export function notifyOrderReady(orderId: number, tableName: string) {
  sendNotification(`✅ Naročilo pripravljeno`, {
    body: `Miza ${tableName} — naročilo #${orderId} pripravljeno za strežbo`,
    tag: `pos-ready-${orderId}`,
  })
}

export function isPushSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator
}

export function getPermissionState(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}
