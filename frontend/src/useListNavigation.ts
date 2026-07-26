import { useState, useEffect, useCallback } from 'react'

export function useListNavigation(count: number, onSelect?: (idx: number) => void) {
  const [activeIdx, setActiveIdx] = useState(-1)

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return
    if (e.key === 'ArrowDown' || e.key === 'j') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, count - 1))
    } else if (e.key === 'ArrowUp' || e.key === 'k') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      onSelect?.(activeIdx)
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActiveIdx(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActiveIdx(count - 1)
    }
  }, [count, activeIdx, onSelect])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  useEffect(() => {
    if (activeIdx >= 0) {
      const el = document.querySelector(`[data-list-idx="${activeIdx}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [activeIdx])

  return { activeIdx, setActiveIdx }
}
