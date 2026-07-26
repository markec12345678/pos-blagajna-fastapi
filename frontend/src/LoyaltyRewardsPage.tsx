import { useState, useEffect } from 'react'

interface Reward {
  id: number; name: string; description: string; points_cost: number;
  reward_type: string; value: number; min_tier: string | null;
  max_redemptions: number | null; current_redemptions: number; is_active: boolean
}

interface CustomerStatus {
  current_points: number; tier: string;
  redeemable_rewards: Reward[]; recent_redemptions: any[]
}

const TIER_ICONS: Record<string, string> = { bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎' }
const TIER_COLORS: Record<string, string> = { bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700', platinum: '#e5e4e2' }
const TYPE_LABELS: Record<string, string> = {
  discount: '💰 Popust', free_item: '🎁 Brezplačen artikel', free_delivery: '🚚 Brezplačna dostava', special_offer: '⭐ Posebna ponudba'
}

export default function LoyaltyRewardsPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [rewards, setRewards] = useState<Reward[]>([])
  const [customerStatus, setCustomerStatus] = useState<CustomerStatus | null>(null)
  const [customerId, setCustomerId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'catalog' | 'manage' | 'redeem'>('catalog')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', points_cost: 100, reward_type: 'discount', value: 0, min_tier: '', max_redemptions: 0 })

  const headers = { ...JSON.parse(localStorage.getItem('auth') || '{}').headers }

  useEffect(() => { loadRewards() }, [])

  const loadRewards = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/v1/loyalty-rewards/?active_only=false', { headers }).then(r => r.json())
      setRewards(r.rewards || [])
    } catch { onNotify('Napaka') }
    setLoading(false)
  }

  const loadCustomerStatus = async (id: number) => {
    try {
      const r = await fetch(`/api/v1/loyalty-rewards/customer/${id}`, { headers }).then(r => r.json())
      if (!r.error) setCustomerStatus(r)
      else onNotify(r.error)
    } catch { onNotify('Napaka') }
  }

  const createReward = async () => {
    try {
      const r = await fetch('/api/v1/loyalty-rewards/', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, min_tier: form.min_tier || null, max_redemptions: form.max_redemptions || null })
      }).then(r => r.json())
      if (r.id) { setShowCreate(false); loadRewards(); onNotify('Nagrada ustvarjena') }
      else onNotify(r.error || 'Napaka')
    } catch { onNotify('Napaka') }
  }

  const deleteReward = async (id: number) => {
    try {
      await fetch(`/api/v1/loyalty-rewards/${id}`, { method: 'DELETE', headers })
      loadRewards()
      onNotify('Nagrada izbrisana')
    } catch { onNotify('Napaka') }
  }

  const redeemReward = async (rewardId: number) => {
    if (!customerId) { onNotify('Vnesite ID stranke'); return }
    try {
      const r = await fetch('/api/v1/loyalty-rewards/redeem', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reward_id: rewardId, customer_id: customerId })
      }).then(r => r.json())
      if (r.message) {
        onNotify(r.message)
        loadCustomerStatus(customerId)
      } else onNotify(r.error || 'Napaka')
    } catch { onNotify('Napaka') }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ margin: '0 0 16px' }}>🎁 Katalog nagrad</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { key: 'catalog', label: '🛍️ Katalog' },
          { key: 'redeem', label: '🔄 Unovči' },
          { key: 'manage', label: '⚙️ Upravljaj' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Catalog view */}
      {tab === 'catalog' && (
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>⏳ Nalaganje...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {rewards.filter(r => r.is_active).map(reward => (
                <div key={reward.id} style={{
                  background: 'var(--card, #fff)', borderRadius: 12, padding: 16,
                  border: '1px solid #eee', position: 'relative'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ fontSize: 28 }}>
                      {reward.reward_type === 'discount' ? '💰' : reward.reward_type === 'free_item' ? '🎁' : reward.reward_type === 'free_delivery' ? '🚚' : '⭐'}
                    </div>
                    <span style={{
                      padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 700,
                      background: '#fef3c7', color: '#92400e'
                    }}>
                      {reward.points_cost} točk
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{reward.name}</div>
                  <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>{reward.description}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: '#888' }}>{TYPE_LABELS[reward.reward_type]}</span>
                    {reward.value > 0 && <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>€{reward.value.toFixed(2)}</span>}
                    {reward.min_tier && (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: `${TIER_COLORS[reward.min_tier]}20`, color: TIER_COLORS[reward.min_tier] }}>
                        {TIER_ICONS[reward.min_tier]} {reward.min_tier}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Redeem view */}
      {tab === 'redeem' && (
        <div>
          <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: '#888' }}>ID stranke</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <input type="number" className="input" value={customerId || ''} onChange={e => setCustomerId(parseInt(e.target.value) || null)}
                placeholder="Vnesite ID stranke..." style={{ flex: 1 }} />
              <button onClick={() => customerId && loadCustomerStatus(customerId)} className="btn btn-primary">🔍</button>
            </div>
          </div>

          {customerStatus && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 32 }}>{TIER_ICONS[customerStatus.tier]}</div>
                  <div style={{ fontSize: 12, color: '#888', textTransform: 'capitalize' }}>{customerStatus.tier}</div>
                </div>
                <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b' }}>{customerStatus.current_points}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>točk</div>
                </div>
              </div>

              {customerStatus.redeemable_rewards.length > 0 ? (
                <div>
                  <h3 style={{ fontSize: 14, marginBottom: 8 }}>🎁 Unovčljive nagrade:</h3>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {customerStatus.redeemable_rewards.map(reward => (
                      <div key={reward.id} style={{
                        background: 'var(--card, #fff)', borderRadius: 10, padding: 12,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{reward.name}</div>
                          <div style={{ fontSize: 12, color: '#888' }}>{reward.points_cost} točk • {reward.value > 0 ? `€${reward.value.toFixed(2)}` : ''}</div>
                        </div>
                        <button onClick={() => redeemReward(reward.id)} className="btn btn-sm btn-primary">
                          🔄 Unovči
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 20, color: '#888' }}>Ni unovčljivih nagrad</div>
              )}

              {customerStatus.recent_redemptions.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h3 style={{ fontSize: 14, marginBottom: 8 }}>📜 Zadnja unovčenja:</h3>
                  {customerStatus.recent_redemptions.map((red, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eee', fontSize: 13 }}>
                      <span>{red.note}</span>
                      <span style={{ color: '#888' }}>-{red.points} točk</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Manage view */}
      {tab === 'manage' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button onClick={() => setShowCreate(true)} className="btn btn-sm btn-primary">+ Dodaj nagrado</button>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            {rewards.map(reward => (
              <div key={reward.id} style={{
                background: 'var(--card, #fff)', borderRadius: 10, padding: 12,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                opacity: reward.is_active ? 1 : 0.6
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600 }}>{reward.name}</span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#f3f4f6' }}>
                      {reward.points_cost} točk
                    </span>
                    {!reward.is_active && <span style={{ fontSize: 11, color: '#ef4444' }}>Neaktivno</span>}
                  </div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                    {TYPE_LABELS[reward.reward_type]} {reward.value > 0 ? `€${reward.value.toFixed(2)}` : ''}
                    {reward.max_redemptions && ` • ${reward.current_redemptions}/${reward.max_redemptions}`}
                  </div>
                </div>
                <button onClick={() => deleteReward(reward.id)} className="btn btn-sm btn-ghost" style={{ color: '#ef4444' }}>
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: '#00000050', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 24, width: '90%', maxWidth: 400 }}>
            <h3 style={{ marginTop: 0 }}>➕ Nova nagrada</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#888' }}>Ime</label>
                <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888' }}>Opis</label>
                <input className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#888' }}>Točke</label>
                  <input type="number" className="input" value={form.points_cost} onChange={e => setForm({ ...form, points_cost: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#888' }}>Vrednost (€)</label>
                  <input type="number" className="input" value={form.value} onChange={e => setForm({ ...form, value: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888' }}>Tip</label>
                <select className="input" value={form.reward_type} onChange={e => setForm({ ...form, reward_type: e.target.value })}>
                  <option value="discount">💰 Popust</option>
                  <option value="free_item">🎁 Brezplačen artikel</option>
                  <option value="free_delivery">🚚 Brezplačna dostava</option>
                  <option value="special_offer">⭐ Posebna ponudba</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888' }}>Min. tier</label>
                <select className="input" value={form.min_tier} onChange={e => setForm({ ...form, min_tier: e.target.value })}>
                  <option value="">Vsi</option>
                  <option value="bronze">🥉 Bronze</option>
                  <option value="silver">🥈 Silver</option>
                  <option value="gold">🥇 Gold</option>
                  <option value="platinum">💎 Platinum</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCreate(false)} className="btn btn-ghost">Prekliči</button>
              <button onClick={createReward} className="btn btn-primary" disabled={!form.name || form.points_cost <= 0}>Shrani</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
