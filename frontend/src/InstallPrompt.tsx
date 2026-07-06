import { useState, useEffect } from 'react'

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<any>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferred(e)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = async () => {
    if (!deferred) return
    deferred.prompt()
    const result = await deferred.userChoice
    if (result.outcome === 'accepted') setShow(false)
    setDeferred(null)
  }

  if (!show) return null

  return (
    <div style={{
      position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 9999,
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '12px 16px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      display: 'flex', alignItems: 'center', gap: 12, maxWidth: 400, margin: '0 auto'
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 8, background: '#059669',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, fontWeight: 'bold', color: '#fff', flexShrink: 0
      }}>P</div>
      <div style={{ flex: 1, fontSize: 13 }}>
        <div style={{ fontWeight: 600 }}>Namesti POS aplikacijo</div>
        <div style={{ color: 'var(--text2)', fontSize: 12 }}>Dodaj na začetni zaslon za hiter dostop</div>
      </div>
      <button onClick={install} className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>Namesti</button>
      <button onClick={() => setShow(false)} className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 16 }}>✕</button>
    </div>
  )
}
