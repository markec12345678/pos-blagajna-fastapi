import { useState, useEffect } from 'react'
import * as api from './api'

interface MessageLog {
  type: string; phone: string; channel: string; preview: string;
  success: boolean; customer_id: number; timestamp: string;
}

export default function MessagingPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'send' | 'bulk' | 'settings' | 'log'>('send')
  const [settings, setSettings] = useState<any>({})
  const [logs, setLogs] = useState<MessageLog[]>([])
  const [loading, setLoading] = useState(true)

  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [channel, setChannel] = useState('sms')
  const [sending, setSending] = useState(false)

  const [bulkMessage, setBulkMessage] = useState('')
  const [bulkChannel, setBulkChannel] = useState('sms')
  const [bulkFilter, setBulkFilter] = useState('all')
  const [sendingBulk, setSendingBulk] = useState(false)
  const [customers, setCustomers] = useState<any[]>([])
  const [selectedCustomers, setSelectedCustomers] = useState<number[]>([])

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [setRes, logRes, custRes] = await Promise.all([
        fetch('/api/v1/messaging/settings', { headers: api.authHeader() }).then(r => r.json()),
        fetch('/api/v1/messaging/log?limit=50', { headers: api.authHeader() }).then(r => r.json()),
        fetch('/api/v1/loyalty', { headers: api.authHeader() }).then(r => r.json()),
      ])
      setSettings(setRes)
      setLogs(logRes)
      setCustomers(custRes)
    } catch { onNotify('Napaka pri nalaganju') }
    setLoading(false)
  }

  const sendMessage = async () => {
    if (!phone || !message) return onNotify('Vpiši telefon in sporočilo')
    setSending(true)
    try {
      const r = await fetch('/api/v1/messaging/send', {
        method: 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, message, channel })
      }).then(r => r.json())
      if (r.ok) { onNotify('✅ Sporočilo poslano'); setMessage('') }
      else onNotify(r.error || 'Napaka pri pošiljanju')
      loadData()
    } catch { onNotify('Napaka') }
    setSending(false)
  }

  const sendBulk = async () => {
    if (!bulkMessage || selectedCustomers.length === 0) return onNotify('Izberi stranke in vpiši sporočilo')
    setSendingBulk(true)
    try {
      const r = await fetch('/api/v1/messaging/send-bulk', {
        method: 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_ids: selectedCustomers, message: bulkMessage, channel: bulkChannel })
      }).then(r => r.json())
      onNotify(`✅ Poslano: ${r.sent} uspešnih, ${r.failed} neuspešnih`)
      setBulkMessage(''); setSelectedCustomers([])
      loadData()
    } catch { onNotify('Napaka') }
    setSendingBulk(false)
  }

  const saveSettings = async () => {
    await fetch('/api/v1/messaging/settings', {
      method: 'PUT', headers: { ...api.authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    })
    onNotify('✅ Nastavitve shranjene')
  }

  const toggleCustomer = (id: number) => {
    setSelectedCustomers(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  }

  const selectAll = () => {
    const filtered = getFilteredCustomers()
    setSelectedCustomers(filtered.map(c => c.id))
  }

  const getFilteredCustomers = () => {
    if (bulkFilter === 'all') return customers.filter(c => c.phone)
    if (bulkFilter === 'members') return customers.filter(c => c.phone && c.points > 0)
    return customers.filter(c => c.phone)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>⏳ Nalaganje...</div>

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>📱 Sporočila (SMS/WhatsApp)</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: settings.configured ? '#059669' : '#f59e0b' }}>
            {settings.configured ? '✅ Twilio' : '⚠️ samo Log (dev)'}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {([
          { key: 'send', label: '📤 Pošlji' },
          { key: 'bulk', label: '📨 Množično' },
          { key: 'settings', label: '⚙️ Nastavitve' },
          { key: 'log', label: '📋 Dnevnik' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'send' && (
        <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 20, maxWidth: 500 }}>
          <h3 style={{ marginTop: 0 }}>📤 Pošlji sporočilo</h3>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <select className="input" value={channel} onChange={e => setChannel(e.target.value)} style={{ width: 120 }}>
                <option value="sms">📱 SMS</option>
                <option value="whatsapp">💬 WhatsApp</option>
              </select>
              <input className="input" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="Telefonska številka (+386...)" style={{ flex: 1 }} />
            </div>
            <textarea className="input" rows={4} value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Sporočilo..." style={{ resize: 'vertical' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#888' }}>{message.length} znakov</span>
              <button onClick={sendMessage} disabled={sending || !phone || !message} className="btn btn-primary">
                {sending ? '⏳' : '📤'} Pošlji
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'bulk' && (
        <div>
          <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>📨 Množično pošiljanje</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <select className="input" value={bulkChannel} onChange={e => setBulkChannel(e.target.value)} style={{ width: 120 }}>
                  <option value="sms">📱 SMS</option>
                  <option value="whatsapp">💬 WhatsApp</option>
                </select>
                <select className="input" value={bulkFilter} onChange={e => setBulkFilter(e.target.value)} style={{ width: 150 }}>
                  <option value="all">Vse s telefonom</option>
                  <option value="members">Samo člani</option>
                </select>
                <button onClick={selectAll} className="btn btn-sm btn-ghost">Označi vse ({getFilteredCustomers().length})</button>
              </div>
              <textarea className="input" rows={3} value={bulkMessage} onChange={e => setBulkMessage(e.target.value)}
                placeholder="Sporočilo za vse stranke..." style={{ resize: 'vertical' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#888' }}>Izbrano: {selectedCustomers.length} strank</span>
                <button onClick={sendBulk} disabled={sendingBulk || selectedCustomers.length === 0 || !bulkMessage} className="btn btn-primary">
                  {sendingBulk ? '⏳' : '📤'} Pošlji ({selectedCustomers.length})
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {getFilteredCustomers().map(c => (
              <div key={c.id} onClick={() => toggleCustomer(c.id)} style={{
                background: selectedCustomers.includes(c.id) ? '#eff6ff' : 'var(--card, #fff)',
                border: selectedCustomers.includes(c.id) ? '2px solid #3b82f6' : '1px solid var(--border)',
                borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 13
              }}>
                <div style={{ fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: '#888' }}>{c.phone}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 20, maxWidth: 500 }}>
          <h3 style={{ marginTop: 0 }}>⚙️ Nastavitve sporočil</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={settings.messaging_enabled === 'true'}
                onChange={e => setSettings((s: any) => ({ ...s, messaging_enabled: e.target.checked ? 'true' : 'false' }))} />
              Omogoči sporočila
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={settings.messaging_auto_receipt === 'true'}
                onChange={e => setSettings((s: any) => ({ ...s, messaging_auto_receipt: e.target.checked ? 'true' : 'false' }))} />
              Samodejno pošlji račun po plačilu
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={settings.messaging_auto_loyalty === 'true'}
                onChange={e => setSettings((s: any) => ({ ...s, messaging_auto_loyalty: e.target.checked ? 'true' : 'false' }))} />
              Obvestilo o zvestobi po plačilu
            </label>
            <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />
            <h4 style={{ margin: '0 0 4px', fontSize: 13 }}>Twilio nastavitve</h4>
            <input className="input" value={settings.twilio_account_sid || ''} onChange={e => setSettings((s: any) => ({ ...s, twilio_account_sid: e.target.value }))} placeholder="Account SID" />
            <input className="input" type="password" value={settings.twilio_auth_token || ''} onChange={e => setSettings((s: any) => ({ ...s, twilio_auth_token: e.target.value }))} placeholder="Auth Token" />
            <input className="input" value={settings.twilio_from_number || ''} onChange={e => setSettings((s: any) => ({ ...s, twilio_from_number: e.target.value }))} placeholder="From number (+386...)" />
            <input className="input" value={settings.twilio_whatsapp_number || ''} onChange={e => setSettings((s: any) => ({ ...s, twilio_whatsapp_number: e.target.value }))} placeholder="WhatsApp number" />
            <button onClick={saveSettings} className="btn btn-primary">💾 Shrani</button>
          </div>
        </div>
      )}

      {tab === 'log' && (
        <div>
          <div style={{ display: 'grid', gap: 6 }}>
            {logs.map((log, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'var(--card, #fff)', borderRadius: 8, padding: '10px 14px',
                border: '1px solid var(--border)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span>{log.channel === 'whatsapp' ? '💬' : '📱'}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{log.phone}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{log.preview}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 11, color: log.success ? '#059669' : '#ef4444' }}>
                    {log.success ? '✅' : '❌'}
                  </span>
                  <div style={{ fontSize: 10, color: '#aaa' }}>{log.type}</div>
                </div>
              </div>
            ))}
            {logs.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>Ni sporočil v dnevniku</div>}
          </div>
        </div>
      )}
    </div>
  )
}
