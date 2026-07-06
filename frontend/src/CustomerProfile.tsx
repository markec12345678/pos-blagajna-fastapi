import { useState, useEffect } from 'react'

const API = '/api/v1/public'

interface CustomerData {
  id: number; name: string; phone: string; email: string;
  address: string; notes: string; loyalty_points: number;
  total_spent: number; is_member: boolean; created_at: string
}

interface OrderItem { item_name: string; quantity: number; total_price: number }
interface OrderSummary { id: number; total: number; status: string; order_type: string; notes: string; created_at: string | null; items: OrderItem[] }
interface LoyaltyTx { id: number; points: number; type: string; note: string | null; order_id: number | null; created_at: string | null }

export default function CustomerProfile({ token, onLogin, onLogout, onClose }: {
  token: string; onLogin: (token: string) => void; onLogout: () => void; onClose: () => void
}) {
  const [tab, setTab] = useState<'profile' | 'orders' | 'loyalty'>('profile')
  const [profile, setProfile] = useState<CustomerData | null>(null)
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [loyalty, setLoyalty] = useState<{ points: number; total_spent: number; transactions: LoyaltyTx[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState({ name: '', phone: '', email: '', address: '' })

  // Auth forms
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [loginPhone, setLoginPhone] = useState('')
  const [loginPw, setLoginPw] = useState('')
  const [regName, setRegName] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPw, setRegPw] = useState('')
  const [authErr, setAuthErr] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const headers = (t: string) => ({ 'Content-Type': 'application/json', 'X-Token': t })

  const doLogin = async () => {
    if (!loginPhone || !loginPw) return
    setAuthLoading(true); setAuthErr('')
    try {
      const r = await fetch(`${API}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: loginPhone, password: loginPw })
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.detail || 'Napaka')
      onLogin(d.token)
    } catch (e: any) { setAuthErr(e.message) }
    setAuthLoading(false)
  }

  const doRegister = async () => {
    if (!regName || !regPw) return
    setAuthLoading(true); setAuthErr('')
    try {
      const r = await fetch(`${API}/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: regName, phone: regPhone, email: regEmail, password: regPw })
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.detail || 'Napaka')
      onLogin(d.token)
    } catch (e: any) { setAuthErr(e.message) }
    setAuthLoading(false)
  }

  useEffect(() => {
    if (!token) return
    setLoading(true)
    Promise.all([
      fetch(`${API}/profile?token=${encodeURIComponent(token)}`).then(r => r.json()),
      fetch(`${API}/profile/orders?token=${encodeURIComponent(token)}`).then(r => r.json()),
      fetch(`${API}/profile/loyalty?token=${encodeURIComponent(token)}`).then(r => r.json()),
    ]).then(([p, o, l]) => {
      setProfile(p)
      setOrders(o || [])
      setLoyalty(l)
      setEditData({ name: p.name || '', phone: p.phone || '', email: p.email || '', address: p.address || '' })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [token])

  const saveProfile = async () => {
    try {
      await fetch(`${API}/profile?token=${encodeURIComponent(token)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      })
      setProfile(p => p ? { ...p, ...editData } : null)
      setEditMode(false)
    } catch {}
  }

  if (!token) return null

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>👤</div>
      <div>Nalaganje profila...</div>
    </div>
  )

  const renderProfile = () => (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>👤</div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{profile?.name}</div>
        <div style={{ fontSize: 13, color: '#64748b' }}>{profile?.phone}{profile?.email ? ` • ${profile.email}` : ''}</div>
      </div>

      {editMode ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          <input className="oo-input" placeholder="Ime" value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14 }} />
          <input className="oo-input" placeholder="Telefon" value={editData.phone} onChange={e => setEditData({ ...editData, phone: e.target.value })} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14 }} />
          <input className="oo-input" placeholder="E-pošta" value={editData.email} onChange={e => setEditData({ ...editData, email: e.target.value })} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14 }} />
          <input className="oo-input" placeholder="Naslov" value={editData.address} onChange={e => setEditData({ ...editData, address: e.target.value })} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={saveProfile} style={{ flex: 1, padding: '10px', background: '#059669', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>💾 Shrani</button>
            <button onClick={() => setEditMode(false)} style={{ padding: '10px 16px', background: '#f1f5f9', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14 }}>Prekliči</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          <div style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b', fontSize: 13 }}>📞 Telefon</span>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{profile?.phone || '—'}</span>
          </div>
          <div style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b', fontSize: 13 }}>✉️ E-pošta</span>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{profile?.email || '—'}</span>
          </div>
          <div style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b', fontSize: 13 }}>📍 Naslov</span>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{profile?.address || '—'}</span>
          </div>
          <button onClick={() => setEditMode(true)} style={{ width: '100%', padding: '10px', background: '#f1f5f9', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569' }}>✏️ Uredi profil</button>
        </div>
      )}

      {profile && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ background: '#f0fdf4', borderRadius: 12, padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>Zvestobne točke</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#059669', marginTop: 2 }}>{profile.loyalty_points}</div>
          </div>
          <div style={{ background: '#f0fdf4', borderRadius: 12, padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>Skupaj porabljeno</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#059669', marginTop: 2 }}>{profile.total_spent.toFixed(2)} €</div>
          </div>
        </div>
      )}
    </div>
  )

  const renderOrders = () => (
    <div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>📋 Zgodovina naročil</div>
      {orders.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#94a3b8', padding: 20, fontSize: 13 }}>Ni naročil</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {orders.map(o => (
            <div key={o.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>#{o.id}</span>
                <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 6, background: o.status === 'closed' ? '#dcfce7' : o.status === 'open' ? '#fef3c7' : '#fee2e2', color: o.status === 'closed' ? '#059669' : o.status === 'open' ? '#f59e0b' : '#ef4444', fontWeight: 600 }}>
                  {o.status === 'closed' ? 'Zaključeno' : o.status === 'open' ? 'Odprto' : o.status === 'cancelled' ? 'Preklicano' : o.status}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                {o.order_type === 'delivery' ? '🛵 Dostava' : '🥡 Za sabo'}
                {o.created_at && ` • ${new Date(o.created_at).toLocaleDateString('sl-SI', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
              </div>
              {o.items.slice(0, 3).map((item, i) => (
                <div key={i} style={{ fontSize: 12, color: '#475569', display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                  <span>{item.quantity}x {item.item_name}</span>
                  <span style={{ fontWeight: 600 }}>{item.total_price.toFixed(2)} €</span>
                </div>
              ))}
              {o.items.length > 3 && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>+{o.items.length - 3} več</div>}
              <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
                <span>Skupaj</span>
                <span style={{ color: '#059669' }}>{o.total.toFixed(2)} €</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderLoyalty = () => (
    <div>
      <div style={{ background: 'linear-gradient(135deg, #059669, #10b981)', borderRadius: 16, padding: 20, textAlign: 'center', color: '#fff', marginBottom: 16 }}>
        <div style={{ fontSize: 13, opacity: 0.9 }}>Zvestobne točke</div>
        <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: 2 }}>{loyalty?.points || 0}</div>
        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>100 točk = 1 € popusta</div>
      </div>

      <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 10 }}>📊 Zgodovina točk</div>
      {loyalty?.transactions.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#94a3b8', padding: 20, fontSize: 13 }}>Ni transakcij</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {loyalty?.transactions.map(tx => (
            <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: tx.points > 0 ? '#059669' : '#ef4444' }}>
                  {tx.points > 0 ? `+${tx.points}` : tx.points} točk
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  {tx.type === 'earn' ? 'Zasluženo' : tx.type === 'redeem' ? 'Unovčeno' : tx.type} 
                  {tx.note ? ` • ${tx.note}` : ''}
                  {tx.created_at ? ` • ${new Date(tx.created_at).toLocaleDateString('sl-SI')}` : ''}
                </div>
              </div>
              <span style={{ fontSize: 20 }}>{tx.points > 0 ? '⬆️' : '⬇️'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderAuth = () => (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setAuthMode('login')} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, background: authMode === 'login' ? '#059669' : '#e2e8f0', color: authMode === 'login' ? '#fff' : '#475569' }}>
          Prijava
        </button>
        <button onClick={() => setAuthMode('register')} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, background: authMode === 'register' ? '#059669' : '#e2e8f0', color: authMode === 'register' ? '#fff' : '#475569' }}>
          Registracija
        </button>
      </div>

      {authMode === 'login' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 4 }}>Prijavite se za hiter nakup in ogled zgodovine</div>
          <input placeholder="Telefon" value={loginPhone} onChange={e => setLoginPhone(e.target.value)} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} />
          <input placeholder="Geslo" type="password" value={loginPw} onChange={e => setLoginPw(e.target.value)} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }}
            onKeyDown={e => e.key === 'Enter' && doLogin()} />
          {authErr && <p style={{ color: '#ef4444', fontSize: 13, margin: 0 }}>{authErr}</p>}
          <button onClick={doLogin} disabled={authLoading} style={{ padding: '12px', borderRadius: 10, border: 'none', background: authLoading ? '#94a3b8' : '#059669', color: '#fff', fontSize: 15, fontWeight: 700, cursor: authLoading ? 'not-allowed' : 'pointer' }}>
            {authLoading ? 'Prijavljanje...' : '🔑 Prijava'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 4 }}>Ustvarite račun in prejmite 50 dobrodošlih točk! 🎉</div>
          <input placeholder="Ime *" value={regName} onChange={e => setRegName(e.target.value)} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} />
          <input placeholder="Telefon" value={regPhone} onChange={e => setRegPhone(e.target.value)} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} />
          <input placeholder="E-pošta" type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} />
          <input placeholder="Geslo *" type="password" value={regPw} onChange={e => setRegPw(e.target.value)} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }}
            onKeyDown={e => e.key === 'Enter' && doRegister()} />
          {authErr && <p style={{ color: '#ef4444', fontSize: 13, margin: 0 }}>{authErr}</p>}
          <button onClick={doRegister} disabled={authLoading} style={{ padding: '12px', borderRadius: 10, border: 'none', background: authLoading ? '#94a3b8' : '#059669', color: '#fff', fontSize: 15, fontWeight: 700, cursor: authLoading ? 'not-allowed' : 'pointer' }}>
            {authLoading ? 'Registracija...' : '🎉 Ustvari račun'}
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '16px 16px 0 0', maxWidth: 500, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 24 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            {!profile ? '👤 Moj račun' : tab === 'profile' ? '👤 Profil' : tab === 'orders' ? '📋 Naročila' : '⭐ Zvestoba'}
          </h2>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        {!profile ? (
          renderAuth()
        ) : (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              {(['profile', 'orders', 'loyalty'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: tab === t ? '#059669' : '#e2e8f0', color: tab === t ? '#fff' : '#475569' }}>
                  {t === 'profile' ? '👤 Profil' : t === 'orders' ? '📋 Naročila' : '⭐ Zvestoba'}
                </button>
              ))}
            </div>

            {tab === 'profile' && renderProfile()}
            {tab === 'orders' && renderOrders()}
            {tab === 'loyalty' && renderLoyalty()}

            <button onClick={() => { onLogout(); onClose() }} style={{ width: '100%', padding: '10px', marginTop: 16, background: 'transparent', border: '1px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', fontSize: 13, color: '#ef4444', fontWeight: 600 }}>
              🚪 Odjava
            </button>
          </>
        )}
      </div>
    </div>
  )
}
