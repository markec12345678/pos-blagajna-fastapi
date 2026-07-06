import { useState, useEffect, useRef } from 'react'
import { getItemName, getItemDesc } from './i18n'
import { LanguageToggle } from './LanguageToggle'

const TAG_COLORS: Record<string, string> = {
  vegan: '#22c55e', vegetarian: '#86efac', 'gluten-free': '#fbbf24',
  spicy: '#ef4444', 'chef-special': '#a855f7', local: '#3b82f6',
  organic: '#10b981', 'sugar-free': '#f97316', seasonal: '#ec4899', signature: '#8b5cf6'
}

export default function MenuBoard() {
  const [data, setData] = useState<{ categories: { id: number; name: string; items: any[] }[] } | null>(null)
  const [catIdx, setCatIdx] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetch('/api/v1/public/menu/1').then(r => r.json()).then(setData).catch(() => {})
  }, [])

  useEffect(() => {
    if (!data?.categories.length) return
    timerRef.current = setInterval(() => {
      setCatIdx(i => (i + 1) % data.categories.length)
    }, 8000)
    return () => clearInterval(timerRef.current!)
  }, [data])

  if (!data) return <div style={{ background: '#0f172a', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 24 }}>⏳ Nalaganje menija...</div>

  const cat = data.categories[catIdx]
  if (!cat) return null

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      height: '100vh', width: '100vw', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif',
      position: 'fixed', top: 0, left: 0
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center', padding: '32px 0 12px',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 100%)',
        position: 'relative'
      }}>
        <div style={{ position: 'absolute', right: 24, top: 24 }}>
          <LanguageToggle />
        </div>
        <div style={{ fontSize: 28, fontWeight: 300, color: '#64748b', letterSpacing: 6, textTransform: 'uppercase' }}>
          {cat.name}
        </div>
        <div style={{
          width: 60, height: 3, background: '#f59e0b', borderRadius: 2,
          margin: '8px auto 0'
        }} />
      </div>

      {/* Items grid */}
      <div style={{
        flex: 1, overflow: 'hidden', padding: '20px 40px',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: 16, alignContent: 'center'
      }}>
        {cat.items.map((item: any, idx: number) => {
          const tags: string[] = (() => { try { return JSON.parse(item.tags || '[]') } catch { return [] } })()
          const allergens: string[] = (() => { try { return JSON.parse(item.allergens || '[]') } catch { return [] } })()
          return (
            <div key={item.id} style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16, padding: 20,
              display: 'flex', flexDirection: 'column',
              animation: idx % 2 === 0 ? 'fadeInUp 0.5s ease-out' : 'fadeInUp 0.5s ease-out 0.1s'
            }}>
              <div style={{ display: 'flex', gap: 16, flex: 1 }}>
                {item.image_url && (
                  <img src={item.image_url} alt="" style={{
                    width: 80, height: 80, borderRadius: 12, objectFit: 'cover',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 20, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>{getItemName(item, item.name)}</div>
                  {item.description && (
                    <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.4 }}>{getItemDesc(item, item.description)}</div>
                  )}
                  {tags.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                      {tags.map((tag: string) => (
                        <span key={tag} style={{
                          fontSize: 10, padding: '2px 8px', borderRadius: 8,
                          background: TAG_COLORS[tag.toLowerCase()] || '#475569',
                          color: '#fff', fontWeight: 600
                        }}>{tag}</span>
                      ))}
                    </div>
                  )}
                  {allergens.length > 0 && (
                    <div style={{ fontSize: 10, color: '#ef4444', marginTop: 4 }}>
                      ⚠️ {allergens.join(', ')}
                    </div>
                  )}
                </div>
              </div>
              <div style={{
                fontSize: 24, fontWeight: 700, color: '#f59e0b', marginTop: 12, textAlign: 'right'
              }}>
                {item.price.toFixed(2)} €
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{
        textAlign: 'center', padding: '16px 0', color: '#475569', fontSize: 12,
        borderTop: '1px solid rgba(255,255,255,0.05)'
      }}>
        {data.categories.map((c, i) => (
          <span key={c.id} style={{
            display: 'inline-block', width: 8, height: 8, borderRadius: 4,
            margin: '0 4px',
            background: i === catIdx ? '#f59e0b' : 'rgba(255,255,255,0.15)',
            transition: 'all 0.3s'
          }} />
        ))}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}