import { useState, useEffect } from 'react'
import { LanguageToggle } from './LanguageToggle'

export default function ReservationBooking() {
  const [step, setStep] = useState<'form' | 'slots' | 'done'>('form')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [guests, setGuests] = useState(2)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [slots, setSlots] = useState<any[]>([])
  const [selectedTime, setSelectedTime] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const searchSlots = async () => {
    if (!date) return
    setLoading(true)
    setError('')
    try {
      const r = await fetch(`/api/v1/public/reservations/available-slots?date_str=${date}&guests=${guests}`)
      if (r.ok) {
        const d = await r.json()
        if (d.slots?.length > 0) { setSlots(d.slots); setStep('slots') }
        else setError('Na ta dan ni prostih terminov.')
      } else setError('Napaka pri preverjanju terminov.')
    } catch { setError('Napaka pri povezavi.') }
    setLoading(false)
  }

  const submitReservation = async () => {
    if (!name || !selectedTime) return
    setLoading(true)
    setError('')
    try {
      const r = await fetch('/api/v1/public/reservations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: name, customer_phone: phone, customer_email: email,
          guests, reservation_time: `${date}T${selectedTime}:00`, notes
        })
      })
      if (r.ok) {
        setResult(await r.json())
        setStep('done')
      } else {
        const err = await r.json()
        setError(err.detail || 'Napaka pri ustvarjanju rezervacije.')
      }
    } catch { setError('Napaka pri povezavi.') }
    setLoading(false)
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 32, maxWidth: 440, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 4 }}>🍽️</div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Rezervacija</h1>
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Izberite termin za vaš obisk</p>
          </div>
          <LanguageToggle style={{ color: '#0f172a', border: '1px solid #e2e8f0', background: '#f8fafc' }} />
        </div>

        {step === 'form' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Datum</label>
              <input type="date" className="input" value={date} min={today}
                onChange={e => setDate(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Število oseb</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1, 2, 3, 4, 5, 6, 8, 10].map(n => (
                  <button key={n} onClick={() => setGuests(n)} style={{
                    flex: 1, padding: '8px 4px', border: `2px solid ${guests === n ? '#059669' : '#e2e8f0'}`,
                    borderRadius: 8, background: guests === n ? '#f0fdf4' : '#fff', cursor: 'pointer',
                    fontSize: 13, fontWeight: guests === n ? 700 : 400, color: '#0f172a', transition: 'all 0.15s'
                  }}>{n}</button>
                ))}
              </div>
            </div>
            <button onClick={searchSlots} disabled={loading || !date}
              style={{ width: '100%', padding: 14, background: '#059669', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? '⏳ Preverjam termine...' : 'Poišči termine'}
            </button>
          </div>
        )}

        {step === 'slots' && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
              {new Date(date).toLocaleDateString('sl-SI', { weekday: 'long', day: 'numeric', month: 'long' })}
              {' • '}{guests} {guests === 1 ? 'oseba' : 'oseb'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {slots.map(s => (
                <button key={s.time} onClick={() => setSelectedTime(s.time)}
                  style={{
                    padding: '12px 8px', border: `2px solid ${selectedTime === s.time ? '#059669' : '#e2e8f0'}`,
                    borderRadius: 10, background: selectedTime === s.time ? '#f0fdf4' : '#fff', cursor: 'pointer',
                    textAlign: 'center', transition: 'all 0.15s', opacity: s.limited ? 0.7 : 1
                  }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: selectedTime === s.time ? '#059669' : '#0f172a' }}>{s.time}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    {s.limited ? '⏳ Zadnje mize' : '✅ Prosto'}
                  </div>
                </button>
              ))}
            </div>

            {selectedTime && (
              <div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Ime in priimek *</label>
                  <input className="input" value={name} onChange={e => setName(e.target.value)}
                    placeholder="npr. Janez Novak" style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Telefon</label>
                  <input className="input" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="+386 40 123 456" style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Email (neobvezno)</label>
                  <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="email@example.com" style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Opomba (neobvezno)</label>
                  <textarea className="input" value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="Alergije, posebne želje..." style={{ width: '100%', boxSizing: 'border-box', minHeight: 50, resize: 'vertical' }} />
                </div>
                <button onClick={submitReservation} disabled={loading || !name}
                  style={{ width: '100%', padding: 14, background: '#059669', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer', opacity: loading || !name ? 0.6 : 1 }}>
                  {loading ? '⏳ Ustvarjam rezervacijo...' : `Rezerviraj ob ${selectedTime}`}
                </button>
              </div>
            )}

            <button onClick={() => setStep('form')} style={{ marginTop: 12, width: '100%', padding: 10, background: 'none', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, cursor: 'pointer', color: '#64748b' }}>
              ← Nazaj na izbiro datuma
            </button>
          </div>
        )}

        {step === 'done' && result && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
            <h2 style={{ margin: '0 0 4px', fontSize: 20, color: '#0f172a' }}>Rezervacija potrjena!</h2>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 16 }}>
              {new Date(date).toLocaleDateString('sl-SI', { weekday: 'long', day: 'numeric', month: 'long' })}
              {' ob '}{selectedTime}
            </p>
            <div className="card" style={{ padding: 16, marginBottom: 16, background: '#f8fafc', borderRadius: 12 }}>
              <div style={{ fontSize: 13, color: '#475569', marginBottom: 4 }}>📋 Št. rezervacije: <strong>#{result.id}</strong></div>
              <div style={{ fontSize: 13, color: '#475569' }}>👤 {name} • {guests} {guests === 1 ? 'oseba' : 'oseb'}</div>
              {result.table_assigned && <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>🪑 Miza #{result.table_assigned}</div>}
              {phone && <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>📞 {phone}</div>}
            </div>
            <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>
              Potrditev smo poslali na {email || 'vaš telefon'}.
            </p>
            <button onClick={() => { setStep('form'); setSelectedTime(''); setResult(null); setName(''); setPhone(''); setEmail(''); setNotes('') }}
              style={{ padding: '12px 24px', background: '#059669', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Nova rezervacija
            </button>
          </div>
        )}

        {error && <div style={{ marginTop: 12, padding: 10, background: '#fef2f2', color: '#dc2626', borderRadius: 8, fontSize: 13, textAlign: 'center' }}>{error}</div>}
      </div>
    </div>
  )
}
