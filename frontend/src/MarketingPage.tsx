import { useState, useEffect } from 'react'

interface Campaign {
  id: number; name: string; type: string; subject: string; content: string;
  status: string; segment_filter: string;
  recipient_count: number; sent_count: number; opened_count: number;
  scheduled_at: string | null; sent_at: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#6b7280', scheduled: '#3b82f6', sending: '#f59e0b', sent: '#059669',
}
const STATUS_LABELS: Record<string, string> = {
  draft: 'Osnutek', scheduled: 'Načrtovano', sending: 'Pošiljanje...', sent: 'Poslano',
}

const API = '/api/v1/marketing'
const auth = () => ({ 'Authorization': 'Bearer ' + localStorage.getItem('pos_token'), 'Content-Type': 'application/json' })

export default function MarketingPage({ onNotify }: { onNotify: (m: string, isError?: boolean) => void }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [edit, setEdit] = useState<Campaign | null>(null)
  const [preview, setPreview] = useState<{ count: number; sample: any[] } | null>(null)
  const [sending, setSending] = useState(false)
  const [tab, setTab] = useState<'campaigns' | 'smtp' | 'sms' | 'whatsapp'>('campaigns')
  const [smtp, setSmtp] = useState({ host: '', port: '587', user: '', pass: '' })
  const [smsCfg, setSmsCfg] = useState({ provider: 'generic', api_key: '', sender: '' })
  const [waCfg, setWaCfg] = useState({ enabled: false, number: '' })

  const load = () => {
    fetch(`${API}/campaigns`, { headers: auth() }).then(r => r.json()).then(setCampaigns).catch(() => {})
  }
  useEffect(load, [])
  useEffect(() => {
    fetch('/api/v1/settings', { headers: auth() }).then(r => r.json()).then((settings: any[]) => {
      const get = (k: string) => settings.find((s: any) => s.key === k)?.value || ''
      setSmtp({ host: get('smtp_host'), port: get('smtp_port') || '587', user: get('smtp_user'), pass: get('smtp_pass') })
      setSmsCfg({ provider: get('sms_provider') || 'generic', api_key: get('sms_api_key'), sender: get('sms_sender') || 'Restavracija' })
      setWaCfg({ enabled: get('whatsapp_enabled') === '1', number: get('whatsapp_twilio_number') || '+14155238886' })
    }).catch(() => {})
  }, [])

  const empty = (): Campaign => ({
    id: 0, name: '', type: 'email', subject: '', content: '', status: 'draft',
    segment_filter: JSON.stringify({ is_member: false, has_email: true, has_phone: false, min_total_spent: 0, min_loyalty_points: 0 }),
    recipient_count: 0, sent_count: 0, opened_count: 0, scheduled_at: null, sent_at: null,
  })

  const sf = (c: Campaign) => { try { return JSON.parse(c.segment_filter) } catch { return {} } }

  const save = async () => {
    if (!edit) return
    try {
      const r = await fetch(edit.id ? `${API}/campaigns/${edit.id}` : `${API}/campaigns`, {
        method: edit.id ? 'PUT' : 'POST', headers: auth(), body: JSON.stringify(edit)
      })
      if (!r.ok) throw new Error()
      onNotify(edit.id ? 'Posodobljeno' : 'Ustvarjeno')
      setEdit(null); load()
    } catch { onNotify('Napaka pri shranjevanju', true) }
  }

  const previewSegment = async () => {
    if (!edit) return
    const r = await fetch(`${API}/preview`, {
      method: 'POST', headers: auth(), body: JSON.stringify({ segment_filter: sf(edit), branch_id: 0 })
    })
    if (r.ok) setPreview(await r.json())
  }

  const sendCampaign = async (id: number) => {
    if (!confirm('Pošljem kampanjo vsem prejemnikom?')) return
    setSending(true)
    try {
      const r = await fetch(`${API}/campaigns/${id}/send`, { method: 'POST', headers: auth() })
      if (!r.ok) throw new Error()
      onNotify('Kampanja poslana!')
      load()
    } catch { onNotify('Napaka pri pošiljanju', true) }
    setSending(false)
  }

  const remove = async (id: number) => {
    if (!confirm('Izbrišete kampanjo?')) return
    await fetch(`${API}/campaigns/${id}`, { method: 'DELETE', headers: auth() })
    onNotify('Izbrisano'); load()
  }

  const saveSmtp = async () => {
    const settings = [
      { key: 'smtp_host', value: smtp.host },
      { key: 'smtp_port', value: smtp.port },
      { key: 'smtp_user', value: smtp.user },
      { key: 'smtp_pass', value: smtp.pass },
    ]
    for (const s of settings) {
      await fetch('/api/v1/settings', { method: 'POST', headers: auth(), body: JSON.stringify(s) })
    }
    onNotify('SMTP nastavitve shranjene')
  }

  const saveSms = async () => {
    const settings = [
      { key: 'sms_provider', value: smsCfg.provider },
      { key: 'sms_api_key', value: smsCfg.api_key },
      { key: 'sms_sender', value: smsCfg.sender },
    ]
    for (const s of settings) {
      await fetch('/api/v1/settings', { method: 'POST', headers: auth(), body: JSON.stringify(s) })
    }
    onNotify('SMS nastavitve shranjene')
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>📧 Marketing</h2>
        <button onClick={() => setEdit(empty())} className="btn btn-primary">+ Nova kampanja</button>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        <button onClick={() => setTab('campaigns')} className={`btn btn-sm ${tab === 'campaigns' ? 'btn-primary' : 'btn-ghost'}`}>Kampanje</button>
        <button onClick={() => setTab('smtp')} className={`btn btn-sm ${tab === 'smtp' ? 'btn-primary' : 'btn-ghost'}`}>SMTP nastavitve</button>
        <button onClick={() => setTab('sms')} className={`btn btn-sm ${tab === 'sms' ? 'btn-primary' : 'btn-ghost'}`}>📱 SMS nastavitve</button>
        <button onClick={() => setTab('whatsapp')} className={`btn btn-sm ${tab === 'whatsapp' ? 'btn-primary' : 'btn-ghost'}`}>💬 WhatsApp</button>
      </div>

      {tab === 'sms' && (
        <div className="card" style={{ maxWidth: 400 }}>
          <h3 style={{ marginBottom: 12 }}>📱 SMS ponudnik</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <select className="input" value={smsCfg.provider} onChange={e => setSmsCfg({ ...smsCfg, provider: e.target.value })}>
              <option value="generic">Generic HTTP API</option>
              <option value="smsapi">SMSAPI.si</option>
              <option value="twilio">Twilio</option>
            </select>
            <input className="input" placeholder="API ključ" value={smsCfg.api_key} onChange={e => setSmsCfg({ ...smsCfg, api_key: e.target.value })} />
            <input className="input" placeholder="Pošiljatelj (npr. Restavracija)" value={smsCfg.sender} onChange={e => setSmsCfg({ ...smsCfg, sender: e.target.value })} />
            <button onClick={saveSms} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>💾 Shrani SMS</button>
          </div>
        </div>
      )}

      {tab === 'smtp' && (
        <div className="card" style={{ maxWidth: 400 }}>
          <h3 style={{ marginBottom: 12 }}>📨 SMTP strežnik</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input className="input" placeholder="Gostitelj (npr. smtp.gmail.com)" value={smtp.host} onChange={e => setSmtp({ ...smtp, host: e.target.value })} />
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" placeholder="Port" value={smtp.port} onChange={e => setSmtp({ ...smtp, port: e.target.value })} style={{ width: 80 }} />
              <input className="input" placeholder="Uporabniško ime" value={smtp.user} onChange={e => setSmtp({ ...smtp, user: e.target.value })} style={{ flex: 1 }} />
            </div>
            <input className="input" type="password" placeholder="Geslo" value={smtp.pass} onChange={e => setSmtp({ ...smtp, pass: e.target.value })} />
            <button onClick={saveSmtp} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>💾 Shrani SMTP</button>
          </div>
        </div>
      )}

      {tab === 'whatsapp' && (
        <div className="card" style={{ maxWidth: 400 }}>
          <h3 style={{ marginBottom: 12 }}>💬 WhatsApp obvestila</h3>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>
            Pošilja obvestila strankam prek Twilio WhatsApp API-ja ob spremembi statusa naročila (potrjeno, priprava, pripravljeno, dostava).
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
              <input type="checkbox" checked={waCfg.enabled} onChange={e => setWaCfg({ ...waCfg, enabled: e.target.checked })} />
              Omogoči WhatsApp obvestila
            </label>
            <input className="input" placeholder="Twilio WhatsApp številka (npr. +14155238886)" value={waCfg.number} onChange={e => setWaCfg({ ...waCfg, number: e.target.value })} />
            <p style={{ fontSize: 11, color: 'var(--text2)' }}>Uporablja Twilio API ključ iz SMS nastavitev (Account SID:Auth Token).</p>
            <button onClick={async () => {
              const settings = [
                { key: 'whatsapp_enabled', value: waCfg.enabled ? '1' : '0' },
                { key: 'whatsapp_twilio_number', value: waCfg.number },
              ]
              for (const s of settings) { await fetch('/api/v1/settings', { method: 'POST', headers: auth(), body: JSON.stringify(s) }) }
              onNotify('WhatsApp nastavitve shranjene')
            }} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>💾 Shrani WhatsApp</button>
          </div>
        </div>
      )}

      {tab === 'campaigns' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {campaigns.map(c => (
            <div key={c.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[c.status] || '#6b7280' }} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 700 }}>{c.name} <span style={{ fontSize: 11, color: 'var(--text2)' }}>{c.type === 'email' ? '📧' : '📱'}</span></div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                  {c.subject} • {c.recipient_count} prejemnikov • poslano: {c.sent_count} • odprto: {c.opened_count}
                </div>
              </div>
              <div style={{ fontSize: 12, color: STATUS_COLORS[c.status], fontWeight: 600 }}>{STATUS_LABELS[c.status]}</div>
              {c.status === 'draft' && (
                <button onClick={() => sendCampaign(c.id)} disabled={sending} className="btn btn-sm btn-primary">Pošlji</button>
              )}
              <button onClick={() => setEdit({ ...c, content: c.content || '' })} className="btn btn-sm btn-ghost">✏️</button>
              <button onClick={() => remove(c.id)} className="btn btn-sm btn-ghost" style={{ color: 'var(--red)' }}>🗑️</button>
            </div>
          ))}
          {!campaigns.length && <p style={{ color: 'var(--text2)', padding: 20, textAlign: 'center' }}>Ni kampanj.</p>}
        </div>
      )}

      {edit && (
        <div className="overlay" onClick={() => { setEdit(null); setPreview(null) }}>
          <div className="modal modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3>{edit.id ? 'Uredi' : 'Nova'} kampanja</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              <input className="input" placeholder="Ime kampanje" value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} />
              <div style={{ display: 'flex', gap: 8 }}>
                <select className="input" value={edit.type} onChange={e => setEdit({ ...edit, type: e.target.value })} style={{ flex: 1 }}>
                  <option value="email">📧 Email</option>
                  <option value="sms">📱 SMS</option>
                </select>
                <input className="input" placeholder="Zadeva (email)" value={edit.subject} onChange={e => setEdit({ ...edit, subject: e.target.value })} style={{ flex: 2 }} />
              </div>
              <textarea className="input" placeholder={edit.type === 'email' ? 'Vsebina emaila (HTML podprt)' : 'Vsebina SMS sporočila'} value={edit.content} onChange={e => setEdit({ ...edit, content: e.target.value })} style={{ minHeight: 120, resize: 'vertical', fontFamily: 'monospace' }} />

              <h4 style={{ margin: '8px 0 4px' }}>🎯 Segment prejemnikov</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 8, background: 'var(--bg2)', borderRadius: 8 }}>
                {(() => {
                  const f = sf(edit)
                  const setF = (key: string, val: any) => {
                    const nf = { ...f, [key]: val }
                    setEdit({ ...edit, segment_filter: JSON.stringify(nf) })
                  }
                  return (
                    <>
                      <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="checkbox" checked={!!f.is_member} onChange={e => setF('is_member', e.target.checked)} />
                        Samo člani (is_member)
                      </label>
                      <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="checkbox" checked={!!f.has_email} onChange={e => setF('has_email', e.target.checked)} />
                        Ima email
                      </label>
                      <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="checkbox" checked={!!f.has_phone} onChange={e => setF('has_phone', e.target.checked)} />
                        Ima telefon
                      </label>
                      <div style={{ display: 'flex', gap: 8, fontSize: 13 }}>
                        <label style={{ flex: 1 }}>Min. porabljeno:
                          <input className="input" type="number" value={f.min_total_spent || 0} onChange={e => setF('min_total_spent', parseFloat(e.target.value) || 0)} style={{ width: '100%', marginTop: 2 }} />
                        </label>
                        <label style={{ flex: 1 }}>Min. točk:
                          <input className="input" type="number" value={f.min_loyalty_points || 0} onChange={e => setF('min_loyalty_points', parseInt(e.target.value) || 0)} style={{ width: '100%', marginTop: 2 }} />
                        </label>
                      </div>
                    </>
                  )
                })()}
                <button onClick={previewSegment} className="btn btn-sm btn-ghost" style={{ alignSelf: 'flex-start', marginTop: 4 }}>🔍 Predogled segmenta</button>
                {preview !== null && (
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
                    <strong>{preview.count} strank</strong> ustreza segmentu.
                    {preview.sample.length > 0 && (
                      <ul style={{ margin: '4px 0 0 12px' }}>
                        {preview.sample.map((s: any) => <li key={s.id}>{s.name} — {s.email || s.phone}</li>)}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-btns" style={{ marginTop: 16 }}>
              <button onClick={save} className="btn btn-primary">💾 Shrani</button>
              <button onClick={() => { setEdit(null); setPreview(null) }} className="btn btn-ghost">Prekliči</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
