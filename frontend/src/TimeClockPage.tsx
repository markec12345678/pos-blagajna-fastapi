import { useState, useEffect, useRef } from 'react'

export default function TimeClockPage({ onNotify: notifyProp }: { onNotify?: (msg: string) => void } = {}) {
  const onNotify = notifyProp || ((m: string) => {})
  const [pin, setPin] = useState('')
  const [step, setStep] = useState<'pin' | 'status'>('pin')
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [clockTime, setClockTime] = useState(new Date())
  const timerRef = useRef<any>(null)

  useEffect(() => {
    timerRef.current = setInterval(() => setClockTime(new Date()), 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  const pressKey = (k: string) => {
    if (pin.length >= 6) return
    setPin(p => p + k)
    setError('')
  }

  const clearPin = () => { setPin(''); setError('') }
  const backspace = () => setPin(p => p.slice(0, -1))

  const submitPin = async () => {
    if (pin.length < 3) { setError('Vnesi PIN (4 številke)'); return }
    setLoading(true); setError('')
    try {
      const r = await fetch(`/api/v1/shifts/clock-in-pin`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      }).then(r => { if (!r.ok) throw r; return r.json() })
      onNotify(`✅ ${r.action === 'clock_in' ? 'Prijavljen' : 'Odjavljen'}: ${r.user_name}`)
      setPin('')
      await loadStatus()
    } catch (e: any) {
      try { const d = await e.json(); setError(d.detail || 'Napaka') } catch { setError('Napaka pri prijavi') }
    }
    setLoading(false)
  }

  const loadStatus = async (p?: string) => {
    const currentPin = p || pin
    if (!currentPin) return
    try {
      const r = await fetch(`/api/v1/shifts/status-pin?pin=${encodeURIComponent(currentPin)}`).then(r => { if (!r.ok) throw r; return r.json() })
      setStatus(r)
      setStep('status')
    } catch { setStep('pin') }
  }

  const timeStr = clockTime.toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' })
  const dateStr = clockTime.toLocaleDateString('sl-SI', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  if (step === 'status' && status) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#fff', fontFamily: 'Arial, sans-serif', padding: 20
      }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 48, fontWeight: 300, letterSpacing: 2 }}>{timeStr}</div>
          <div style={{ fontSize: 16, color: '#94a3b8', marginTop: 4, textTransform: 'capitalize' }}>{dateStr}</div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: '32px 48px',
          textAlign: 'center', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', marginBottom: 32
        }}>
          <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>{status.user_name}</div>
          {status.is_clocked_in ? (
            <>
              <div style={{ fontSize: 64, marginBottom: 8 }}>🟢</div>
              <div style={{ fontSize: 20, color: '#22c55e', fontWeight: 600 }}>Prijavljen</div>
              <div style={{ fontSize: 14, color: '#94a3b8', marginTop: 4 }}>
                od {new Date(status.clock_in).toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div style={{ fontSize: 14, color: '#94a3b8' }}>
                Danes: {status.today_hours.toFixed(1)}h
              </div>
              <button onClick={async () => {
                try {
                  const r = await fetch(`/api/v1/shifts/clock-in-pin`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pin })
                  }).then(r => r.json())
                  onNotify(`👋 Odjavljen: ${r.user_name} (${r.hours}h)`)
                  await loadStatus()
                } catch { setStep('pin'); setPin('') }
              }} style={{
                marginTop: 24, padding: '12px 32px', fontSize: 16, fontWeight: 600,
                background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer'
              }}>🔴 Odjava</button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 64, marginBottom: 8 }}>🔴</div>
              <div style={{ fontSize: 20, color: '#94a3b8' }}>Trenutno nisi prijavljen</div>
              <div style={{ fontSize: 14, color: '#94a3b8', marginTop: 4 }}>
                Danes: {status.today_hours.toFixed(1)}h
              </div>
              <button onClick={async () => {
                try {
                  await fetch(`/api/v1/shifts/clock-in-pin`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pin })
                  }).then(r => r.json())
                  onNotify('✅ Prijavljen')
                  await loadStatus()
                } catch { setStep('pin'); setPin('') }
              }} style={{
                marginTop: 24, padding: '12px 32px', fontSize: 16, fontWeight: 600,
                background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer'
              }}>🟢 Prijava</button>
            </>
          )}
        </div>

        <button onClick={() => { setStep('pin'); setPin('') }} style={{
          padding: '10px 24px', fontSize: 14, color: '#94a3b8', background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, cursor: 'pointer'
        }}>← Drug PIN</button>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#fff', fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 48, fontWeight: 300, letterSpacing: 2, marginBottom: 4 }}>{timeStr}</div>
        <div style={{ fontSize: 14, color: '#94a3b8', textTransform: 'capitalize' }}>{dateStr}</div>
      </div>

      <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>🔑 Vnesi PIN</div>

      <div style={{
        display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 24, minHeight: 48
      }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            width: 20, height: 20, borderRadius: '50%',
            background: i < pin.length ? '#3b82f6' : 'rgba(255,255,255,0.15)',
            border: i < pin.length ? 'none' : '2px solid rgba(255,255,255,0.3)',
            transition: 'all 0.15s'
          }} />
        ))}
        {[4, 5].map(i => (
          <div key={i} style={{
            width: 20, height: 20, borderRadius: '50%',
            background: i < pin.length ? '#3b82f6' : 'rgba(255,255,255,0.15)',
            border: i < pin.length ? 'none' : '2px solid rgba(255,255,255,0.3)',
            transition: 'all 0.15s'
          }} />
        ))}
      </div>

      {error && <div style={{ color: '#ef4444', fontSize: 14, marginBottom: 16 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 80px)', gap: 12 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => (
          <button key={k} onClick={() => pressKey(String(k))} style={{
            padding: 20, fontSize: 24, fontWeight: 600, background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, color: '#fff',
            cursor: 'pointer', transition: 'all 0.1s'
          }}
            onMouseDown={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
            onMouseUp={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
          >{k}</button>
        ))}
        <button onClick={clearPin} style={{
          padding: 20, fontSize: 16, background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#94a3b8',
          cursor: 'pointer'
        }}>C</button>
        <button onClick={() => pressKey('0')} style={{
          padding: 20, fontSize: 24, fontWeight: 600, background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, color: '#fff',
          cursor: 'pointer', transition: 'all 0.1s'
        }}
          onMouseDown={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
          onMouseUp={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
        >0</button>
        <button onClick={backspace} style={{
          padding: 20, fontSize: 18, background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#94a3b8',
          cursor: 'pointer'
        }}>⌫</button>
      </div>

      {pin.length >= 3 && (
        <button onClick={submitPin} disabled={loading} style={{
          marginTop: 24, padding: '12px 48px', fontSize: 16, fontWeight: 600,
          background: loading ? '#64748b' : '#3b82f6', color: '#fff', border: 'none',
          borderRadius: 8, cursor: loading ? 'default' : 'pointer', transition: 'all 0.2s'
        }}>{loading ? '⏳' : '✅ Potrdi'}</button>
      )}

      <div style={{ marginTop: 40, fontSize: 12, color: '#64748b' }}>
        demo PIN: 1111 (admin), 2222 (cashier)
      </div>
    </div>
  )
}
