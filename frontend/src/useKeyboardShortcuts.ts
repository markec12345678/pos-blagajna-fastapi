import { useEffect, useRef } from 'react'

interface ShortcutMap {
  [key: string]: () => void
}

function normalizeKey(e: KeyboardEvent): string {
  const parts: string[] = []
  if (e.ctrlKey) parts.push('Ctrl')
  if (e.metaKey) parts.push('Meta')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  const key = e.key
  if (!['Control', 'Meta', 'Alt', 'Shift'].includes(key)) parts.push(key)
  return parts.join('+')
}

export function useKeyboardShortcuts(shortcuts: ShortcutMap, enabled = true) {
  const shortcutsRef = useRef(shortcuts)
  shortcutsRef.current = shortcuts

  useEffect(() => {
    if (!enabled) return
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT'
      const key = e.key
      const isFKey = key.startsWith('F') && key.length <= 3 && !isNaN(parseInt(key.slice(1)))

      if (isInput) {
        if (key === 'Escape') { (target as HTMLInputElement).blur(); return }
        if (!isFKey) return
      }

      const normalized = normalizeKey(e)
      if (shortcutsRef.current[normalized]) {
        e.preventDefault()
        shortcutsRef.current[normalized]()
        return
      }
      if (shortcutsRef.current[key]) {
        e.preventDefault()
        shortcutsRef.current[key]()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [enabled])
}

export const SHORTCUT_HELP = [
  { key: 'Ctrl+1', action: 'Blagajna (POS)' },
  { key: 'Ctrl+2', action: 'Kuhinja (KDS)' },
  { key: 'Ctrl+3', action: 'Nadzorna plošča' },
  { key: 'F1', action: 'Iskanje / PLU' },
  { key: 'F2', action: 'Tip naročila' },
  { key: 'F3', action: 'Iskanje stranke' },
  { key: 'F4', action: 'Natisni račun' },
  { key: 'F5', action: 'Natisni v kuhinjo' },
  { key: 'F9', action: 'Plačilo' },
  { key: 'F10', action: 'Zadrži naročilo' },
  { key: 'F12', action: 'Novo naročilo' },
  { key: 'Enter', action: 'Potrdi naročilo' },
  { key: 'Escape', action: 'Zapri / Prekliči' },
]
