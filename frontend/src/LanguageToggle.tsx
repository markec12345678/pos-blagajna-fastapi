import { useState, useEffect } from 'react'

export function LanguageToggle({ style }: { style?: React.CSSProperties }) {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('pos_language') || 'sl' } catch { return 'sl' }
  })

  const toggle = () => {
    const next = lang === 'sl' ? 'en' : 'sl'
    setLang(next)
    localStorage.setItem('pos_language', next)
    window.location.reload()
  }

  return (
    <button onClick={toggle} style={{
      background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
      borderRadius: 8, padding: '6px 12px', color: '#fff', cursor: 'pointer',
      fontSize: 12, fontWeight: 600, ...style
    }}>
      {lang === 'sl' ? '🇬🇧 EN' : '🇸🇮 SL'}
    </button>
  )
}
