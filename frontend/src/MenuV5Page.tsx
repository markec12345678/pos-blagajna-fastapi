import { useState, useEffect } from 'react'
import * as api from './api'

export default function MenuV5Page({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tab, setTab] = useState<'nutrition' | 'allergens' | 'scaling' | 'cost'>('nutrition')
  const [nutrition, setNutrition] = useState<any>(null)
  const [allergens, setAllergens] = useState<any>(null)
  const [scaling, setScaling] = useState<any>(null)
  const [cost, setCost] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/menu-v5/nutrition', { headers: api.h() }).then(r => r.json()).then(setNutrition),
      fetch('/api/v1/menu-v5/allergens', { headers: api.h() }).then(r => r.json()).then(setAllergens),
      fetch('/api/v1/menu-v5/recipe-scaling', { headers: api.h() }).then(r => r.json()).then(setScaling),
      fetch('/api/v1/menu-v5/cost-per-recipe', { headers: api.h() }).then(r => r.json()).then(setCost),
    ]).catch(() => onNotify('Napaka')).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'nutrition', label: '🥗 Hranilna vrednost' },
    { key: 'allergens', label: '⚠️ Alergeni' },
    { key: 'scaling', label: '📏 Merjenje' },
    { key: 'cost', label: '💰 Strošek/recept' },
  ] as const

  return (
    <div className="page-container-sm">
      <div className="page-header-sm"><h2 className="page-title">🍽️ Meni V5</h2></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>{t.label}</button>
        ))}
      </div>
      {loading ? <div className="card" style={{ padding: 32, textAlign: 'center' }}>Nalaganje...</div> : (
        <>
          {tab === 'nutrition' && nutrition && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                {[
                  { label: 'Kalorije', value: `${nutrition.avg_calories} kcal`, color: '#ef4444' },
                  { label: 'Beljakovine', value: `${nutrition.avg_protein}g`, color: '#3b82f6' },
                  { label: 'Maščobe', value: `${nutrition.avg_fat}g`, color: '#f59e0b' },
                  { label: 'Ogljikovi hidrati', value: `${nutrition.avg_carbs}g`, color: '#22c55e' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: '#888' }}>{s.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {nutrition.items?.map((item: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>{item.name}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, fontSize: 12 }}>
                    <div>🔥 {item.calories} kcal</div>
                    <div>🥩 {item.protein}g</div>
                    <div>🧈 {item.fat}g</div>
                    <div>🌾 {item.carbs}g</div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#888', marginTop: 4 }}>
                    <span>Vlaknine: {item.fiber}g</span>
                    <span>Natrij: {item.sodium}mg</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'allergens' && allergens && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Artikli z alergeni</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b' }}>{allergens.items_with_allergens}/{allergens.total_items}</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Skladnost</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>{allergens.compliance}%</div>
                </div>
              </div>
              {allergens.allergen_types?.map((a: any, i: number) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>⚠️ {a.name}</span>
                    <span style={{ color: '#f59e0b', fontWeight: 700 }}>{a.count} artiklov</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {a.items?.map((item: string, j: number) => (
                      <span key={j} style={{ background: '#fef3c7', color: '#d97706', padding: '1px 6px', borderRadius: 4, fontSize: 10 }}>{item}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'scaling' && scaling && (
            <div>
              {scaling.recipes?.map((r: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>{r.name} (bazno: {r.portions} obrokov, {r.base_cost} €)</div>
                  {r.scaled?.map((s: any, j: number) => (
                    <div key={j} style={{ background: '#f8fafc', borderRadius: 4, padding: 8, marginBottom: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 12 }}>{s.portions} obrokov</span>
                        <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 12 }}>{s.cost} €</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#666' }}>
                        {Object.entries(s.ingredients || {}).map(([k, v], idx) => (
                          <span key={idx} style={{ marginRight: 12 }}>{k}: {v as string}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
          {tab === 'cost' && cost && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Povp. marža</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>{cost.avg_margin}%</div>
                </div>
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Skupaj strošek mesec</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#ef4444' }}>{cost.total_food_cost_month?.toLocaleString()} €</div>
                </div>
              </div>
              {cost.recipes?.map((r: any, i: number) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{r.name}</span>
                    <span style={{ fontWeight: 700, color: r.margin > 60 ? '#22c55e' : '#f59e0b' }}>{r.margin}% marža</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12 }}>
                    <div>Strošek: <b>{r.food_cost} €</b></div>
                    <div>Cena: <b>{r.price} €</b></div>
                    <div>Prodanih: <b>{r.servings_month}</b></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}