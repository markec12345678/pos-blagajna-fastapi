import { useState, useCallback } from 'react'

export function useBulkSelection<T extends { id: number }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkMode, setBulkMode] = useState(false)

  const toggle = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map(i => i.id)))
    }
  }, [items, selectedIds.size])

  const clear = useCallback(() => { setSelectedIds(new Set()); setBulkMode(false) }, [])

  const toggleBulkMode = useCallback(() => {
    if (bulkMode) clear()
    else setBulkMode(true)
  }, [bulkMode, clear])

  return {
    bulkMode,
    toggleBulkMode,
    selectedIds,
    selectedCount: selectedIds.size,
    isSelected: (id: number) => selectedIds.has(id),
    toggle,
    selectAll,
    clear,
    allSelected: items.length > 0 && selectedIds.size === items.length,
  }
}
