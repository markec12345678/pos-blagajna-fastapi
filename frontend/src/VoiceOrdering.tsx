import { useState, useEffect, useRef, useCallback } from 'react'

interface MenuItem {
  id: number; name: string; price: number; category: string; reason?: string
}

interface ParsedOrder {
  type: string; items?: { id: number; name: string; quantity: number; notes: string }[]
  summary?: string; total_items?: number; command?: string; error?: string
}

const VOICE_ICONS = { listening: '🎙️', processing: '⏳', idle: '🎤', error: '⚠️', command: '⚡' }
const MAX_DURATION = 30000

export default function VoiceOrdering({ onAddToCart }: { onAddToCart: (item: MenuItem, qty?: number) => void }) {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [result, setResult] = useState<ParsedOrder | null>(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<'idle'|'listening'|'processing'|'error'|'command'>('idle')
  const [history, setHistory] = useState<{ text: string; time: string }[]>([])
  const [lang, setLang] = useState('sl-SI')
  const recognitionRef = useRef<any>(null)
  const timerRef = useRef<any>(null)

  const isSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const processText = useCallback(async (text: string) => {
    setStatus('processing')
    try {
      const r = await fetch('/api/v1/voice/parse-order', {
        method: 'POST',
        headers: { ...JSON.parse(localStorage.getItem('auth') || '{}').headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      }).then(r => r.json())
      setResult(r)
      if (r.type === 'command') {
        setStatus('command')
      } else if (r.type === 'error') {
        setStatus('error')
        setError(r.error || 'Napaka')
      } else {
        setStatus('idle')
      }
      setHistory(prev => [{ text, time: new Date().toLocaleTimeString('sl-SI') }, ...prev].slice(0, 20))
    } catch {
      setStatus('error')
      setError('Napaka pri komunikaciji z AI')
    }
  }, [])

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Govor ni podprt v tem brskalniku')
      return
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = lang
    recognition.interimResults = true
    recognition.continuous = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => { setListening(true); setStatus('listening'); setTranscript(''); setError(''); setResult(null) }
    recognition.onresult = (e: any) => {
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join(' ')
      setTranscript(t)
      if (e.results[0]?.isFinal) {
        processText(t)
        stopListening()
      }
    }
    recognition.onerror = (e: any) => {
      if (e.error !== 'no-speech') { setStatus('error'); setError(`Napaka: ${e.error}`) }
      else { setStatus('idle') }
      setListening(false)
    }
    recognition.onend = () => { setListening(false) }

    recognitionRef.current = recognition
    recognition.start()

    timerRef.current = setTimeout(() => { stopListening() }, MAX_DURATION)
  }, [lang, processText])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null }
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    setListening(false)
    if (status === 'listening') setStatus('idle')
  }, [status])

  const addParsedItems = () => {
    if (!result?.items) return
    for (const item of result.items) {
      onAddToCart(item as unknown as MenuItem, item.quantity)
    }
    setResult(null)
  }

  if (!isSupported) {
    return (
      <div style={{ textAlign: 'center', padding: 20 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔇</div>
        <div style={{ fontSize: 14, color: '#888' }}>Glasovno naročanje ni podprto v tem brskalniku</div>
        <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>Uporabite Chrome za najboljšo izkušnjo</div>
      </div>
    )
  }

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <h3 style={{ margin: 0 }}>🎙️ Glasovno naročanje</h3>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <label style={{ fontSize: 12 }}>Jezik:</label>
        <select className="input" value={lang} onChange={e => setLang(e.target.value)} style={{ width: 120, fontSize: 12 }}>
          <option value="sl-SI">Slovenščina</option>
          <option value="en-US">English</option>
          <option value="hr-HR">Hrvaščina</option>
        </select>
      </div>

      <button
        onClick={listening ? stopListening : startListening}
        style={{
          width: 120, height: 120, borderRadius: '50%',
          background: listening ? '#ef4444' : status === 'processing' ? '#f59e0b' : '#3b82f6',
          border: 'none', cursor: 'pointer',
          fontSize: 48, color: '#fff',
          boxShadow: listening ? '0 0 30px #ef444480' : '0 4px 20px rgba(0,0,0,.2)',
          transition: 'all .3s',
          animation: listening ? 'pulse 1.5s infinite' : 'none'
        }}
      >
        {VOICE_ICONS[status]}
      </button>

      <style>{`@keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

      {transcript && (
        <div style={{ background: '#f0f4ff', borderRadius: 10, padding: 12, width: '100%', maxWidth: 400 }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>
            {status === 'listening' ? '🔴 Snemam...' : '📝 Razumem:'}
          </div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{transcript}</div>
        </div>
      )}

      {status === 'processing' && <div style={{ fontSize: 14, color: '#f59e0b' }}>🤖 AI razume naročilo...</div>}

      {result?.type === 'order' && result.items && result.items.length > 0 && (
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ background: '#f0fdf4', borderRadius: 10, padding: 12, border: '1px solid #22c55e' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
              ✅ {result.summary || `Razumljeno: ${result.total_items} artiklov`}
            </div>
            <div style={{ display: 'grid', gap: 4 }}>
              {result.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span>{item.quantity}× {item.name}</span>
                  <span style={{ color: '#888' }}>{item.notes && `(${item.notes})`}</span>
                </div>
              ))}
            </div>
            <button onClick={addParsedItems} className="btn btn-success btn-sm" style={{ marginTop: 10, width: '100%' }}>
              ➕ Dodaj v košarico
            </button>
          </div>
        </div>
      )}

      {result?.type === 'command' && result.command && (
        <div style={{ background: '#fef3c7', borderRadius: 10, padding: 12, border: '1px solid #f59e0b', width: '100%', maxWidth: 400 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>⚡ Ukaz: {result.command}</div>
        </div>
      )}

      {result?.type === 'error' && (
        <div style={{ background: '#fef2f2', borderRadius: 10, padding: 12, border: '1px solid #ef4444', width: '100%', maxWidth: 400 }}>
          <div style={{ fontSize: 13, color: '#ef4444' }}>❌ {result.error}</div>
        </div>
      )}

      {error && status === 'error' && (
        <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>
      )}

      <div style={{ width: '100%', maxWidth: 400, marginTop: 8 }}>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>💡 Primeri:</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
          {['2× Burgerja', 'Kavo prosim', 'Eno pivo in čips', 'Počisti košarico', 'Razdeli račun', 'Iskanje solata'].map((e, i) => (
            <div key={i} style={{ background: '#f3f4f6', borderRadius: 6, padding: '6px 8px', fontSize: 11, color: '#555', cursor: 'pointer' }}
              onClick={() => processText(e)}>
              "{e}"
            </div>
          ))}
        </div>
      </div>

      {history.length > 0 && (
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>📜 Zgodovina:</div>
          <div style={{ maxHeight: 120, overflowY: 'auto' }}>
            {history.map((h, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0', borderBottom: '1px solid #eee' }}>
                <span>{h.text}</span>
                <span style={{ color: '#888' }}>{h.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
