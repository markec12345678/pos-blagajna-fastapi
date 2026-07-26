import { useState, useCallback, useRef } from 'react'

export interface Toast {
  id: number; message: string; type: 'success' | 'error' | 'info' | 'warning'; duration: number
}

let _nextId = 0

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const remove = useCallback((id: number) => {
    const t = timers.current.get(id)
    if (t) { clearTimeout(t); timers.current.delete(id) }
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const add = useCallback((message: string, type: Toast['type'] = 'info', duration = type === 'error' ? 5000 : 3000) => {
    const id = ++_nextId
    setToasts(prev => [...prev.slice(-4), { id, message, type, duration }])
    const timer = setTimeout(() => remove(id), duration)
    timers.current.set(id, timer)
    return id
  }, [remove])

  const notify = useCallback((message: string, isError?: boolean) => {
    return add(message, isError ? 'error' : 'success')
  }, [add])

  return { toasts, notify, add, remove }
}

export function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  const colors: Record<string, { bg: string; border: string; icon: string }> = {
    success: { bg: 'rgba(5,150,105,0.95)', border: '#059669', icon: '✓' },
    error: { bg: 'rgba(220,38,38,0.95)', border: '#dc2626', icon: '✕' },
    warning: { bg: 'rgba(245,158,11,0.95)', border: '#f59e0b', icon: '⚠' },
    info: { bg: 'rgba(59,130,246,0.95)', border: '#3b82f6', icon: 'ℹ' },
  }

  if (!toasts.length) return null

  return (
    <div style={{
      position: 'fixed', top: 16, right: 16, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 380, pointerEvents: 'none'
    }}>
      {toasts.map(t => {
        const c = colors[t.type] || colors.info
        return (
          <div key={t.id} style={{
            background: c.bg, color: 'white', padding: '10px 36px 10px 14px', borderRadius: 10,
            borderLeft: `4px solid ${c.border}`, boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            fontSize: 13, fontWeight: 500, position: 'relative', pointerEvents: 'auto',
            animation: 'toastIn 0.3s ease', backdropFilter: 'blur(8px)'
          }}>
            <span style={{ marginRight: 8, fontWeight: 700 }}>{c.icon}</span>
            {t.message}
            <button onClick={() => onRemove(t.id)} style={{
              position: 'absolute', top: 6, right: 8, background: 'none', border: 'none',
              color: 'white', fontSize: 16, cursor: 'pointer', opacity: 0.7, padding: '0 4px'
            }} aria-label="Zapri">✕</button>
          </div>
        )
      })}
    </div>
  )
}
