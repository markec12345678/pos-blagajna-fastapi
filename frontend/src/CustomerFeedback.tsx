import { useState } from 'react'
import { LanguageToggle } from './LanguageToggle'

export default function CustomerFeedback() {
  const qp = new URLSearchParams(window.location.search)
  const orderId = parseInt(qp.get('order') || '0')
  const branchId = parseInt(qp.get('branch') || '0')

  const [score, setScore] = useState(0)
  const [food, setFood] = useState(0)
  const [service, setService] = useState(0)
  const [ambiance, setAmbiance] = useState(0)
  const [comment, setComment] = useState('')
  const [name, setName] = useState('')
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!score) return
    setSubmitting(true)
    try {
      await fetch('/api/v1/ratings/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId || undefined,
          branch_id: branchId || undefined,
          customer_name: name,
          score,
          food_quality: food || undefined,
          service_quality: service || undefined,
          ambiance: ambiance || undefined,
          comment: comment || undefined,
        })
      })
      setDone(true)
    } catch {
      alert('Napaka pri pošiljanju')
    }
    setSubmitting(false)
  }

  const Star = ({ n, value, set }: { n: number; value: number; set: (v: number) => void }) => (
    <span onClick={() => set(n)} style={{ fontSize: 32, cursor: 'pointer', color: n <= value ? '#f59e0b' : '#374151', transition: 'color 0.15s' }}>
      {n <= value ? '★' : '☆'}
    </span>
  )

  if (done) return (
    <div className="cf-container">
      <div className="cf-card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
        <h2>Hvala za oceno!</h2>
        <p style={{ color: 'var(--text2)', marginTop: 8 }}>Vaše mnenje nam pomaga izboljšati storitev.</p>
      </div>
    </div>
  )

  return (
    <div className="cf-container">
      <div className="cf-card">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🍽️</div>
              <h2>Ocenite svoj obisk</h2>
            </div>
            <LanguageToggle />
          </div>
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>Vaše mnenje nam veliko pomeni!</p>
        </div>

        <div className="cf-section">
          <label>Splošna ocena</label>
          <div>{[1, 2, 3, 4, 5].map(n => <Star key={n} n={n} value={score} set={setScore} />)}</div>
        </div>

        <div className="cf-section">
          <label>Hrana</label>
          <div>{[1, 2, 3, 4, 5].map(n => <Star key={n} n={n} value={food} set={setFood} />)}</div>
        </div>

        <div className="cf-section">
          <label>Postrežba</label>
          <div>{[1, 2, 3, 4, 5].map(n => <Star key={n} n={n} value={service} set={setService} />)}</div>
        </div>

        <div className="cf-section">
          <label>Vzdušje</label>
          <div>{[1, 2, 3, 4, 5].map(n => <Star key={n} n={n} value={ambiance} set={setAmbiance} />)}</div>
        </div>

        <div className="cf-section">
          <label>Komentar (neobvezno)</label>
          <textarea className="input" rows={3} placeholder="Vaše mnenje..." value={comment} onChange={e => setComment(e.target.value)} />
        </div>

        <div className="cf-section">
          <label>Ime (neobvezno)</label>
          <input className="input" placeholder="Vaše ime" value={name} onChange={e => setName(e.target.value)} />
        </div>

        <button onClick={submit} disabled={!score || submitting} className="btn btn-primary" style={{ width: '100%', marginTop: 8, padding: 12 }}>
          {submitting ? 'Pošiljam...' : 'Pošlji oceno'}
        </button>
      </div>
    </div>
  )
}
