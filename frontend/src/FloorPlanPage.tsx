import { useState, useEffect, useRef, useCallback } from 'react'

export default function FloorPlanPage({ onNotify }: { onNotify?: (msg: string, err?: boolean) => void }) {
  const [tables, setTables] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [branchId, setBranchId] = useState(0)
  const [dragging, setDragging] = useState<number | null>(null)
  const [showEditor, setShowEditor] = useState<any>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  const load = async () => {
    const [tr, br] = await Promise.all([
      fetch(`/api/v1/tables?branch_id=${branchId}`),
      fetch('/api/v1/branches')
    ])
    if (tr.ok) setTables(await tr.json())
    if (br.ok) setBranches(await br.json())
  }

  useEffect(() => { load() }, [branchId])

  const handleMouseDown = (id: number, e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(id)
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (dragging === null || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = Math.round(e.clientX - rect.left - 30)
    const y = Math.round(e.clientY - rect.top - 30)
    setTables(prev => prev.map(t => t.id === dragging ? { ...t, pos_x: Math.max(0, x), pos_y: Math.max(0, y) } : t))
  }, [dragging])

  const handleMouseUp = useCallback(async () => {
    if (dragging === null) return
    const table = tables.find(t => t.id === dragging)
    if (table) {
      await fetch(`/api/v1/tables/${dragging}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pos_x: table.pos_x, pos_y: table.pos_y })
      })
    }
    setDragging(null)
  }, [dragging, tables])

  useEffect(() => {
    if (dragging !== null) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [dragging, handleMouseMove, handleMouseUp])

  const saveTable = async () => {
    if (!showEditor) return
    const r = await fetch(`/api/v1/tables/${showEditor.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: showEditor.name, capacity: showEditor.capacity,
        shape: showEditor.shape, pos_x: showEditor.pos_x, pos_y: showEditor.pos_y
      })
    })
    if (r.ok) { onNotify?.('Miza posodobljena'); setShowEditor(null); load() }
    else onNotify?.('Napaka', true)
  }

  const deleteTable = async (id: number) => {
    if (!confirm('Izbrišem mizo?')) return
    const r = await fetch(`/api/v1/tables/${id}`, { method: 'DELETE' })
    if (r.ok) { onNotify?.('Miza izbrisana'); setShowEditor(null); load() }
    else onNotify?.('Napaka', true)
  }

  const addTable = async () => {
    const r = await fetch('/api/v1/tables', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Miza ${tables.length + 1}`, capacity: 4,
        pos_x: 50, pos_y: 50, shape: 'circle', branch_id: branchId || undefined
      })
    })
    if (r.ok) { onNotify?.('Miza dodana'); load() }
    else onNotify?.('Napaka', true)
  }

  const statusColors: Record<string, string> = {
    free: '#059669', occupied: '#ef4444', reserved: '#3b82f6', held: '#f59e0b'
  }

  return (
    <div>
      <div className="page-header">
        <h2>🏗️ Tloris</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="input" value={branchId} onChange={e => setBranchId(parseInt(e.target.value))}
            style={{ width: 180 }}>
            <option value={0}>Vse podružnice</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button className="btn btn-primary" onClick={addTable}>+ Dodaj mizo</button>
        </div>
      </div>

      <div ref={canvasRef} style={{
        position: 'relative', background: '#1e293b', borderRadius: 16, minHeight: 500,
        marginBottom: 16, overflow: 'hidden', border: '1px solid #334155'
      }}>
        <div style={{ position: 'absolute', top: 8, left: 8, fontSize: 11, color: '#64748b' }}>
          🖱️ Povleci mize za premikanje
        </div>
        <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 12, fontSize: 11 }}>
          <span style={{ color: '#059669' }}>🟢 Prosto</span>
          <span style={{ color: '#ef4444' }}>🔴 Zasedeno</span>
          <span style={{ color: '#3b82f6' }}>🔵 Rezervirano</span>
          <span style={{ color: '#f59e0b' }}>🟡 Zadržano</span>
        </div>

        {/* Grid dots */}
        {Array.from({ length: 30 }).map((_, i) =>
          Array.from({ length: 30 }).map((_, j) => (
            <div key={`${i}-${j}`} style={{
              position: 'absolute', left: j * 50 + 25, top: i * 50 + 25,
              width: 4, height: 4, borderRadius: '50%', background: '#334155',
              opacity: 0.5
            }} />
          ))
        )}

        {tables.map(t => {
          const color = statusColors[t.status] || '#94a3b8'
          const size = Math.min(40 + t.capacity * 10, 100)
          const isCircle = t.shape === 'circle'
          return (
            <div key={t.id} onMouseDown={e => handleMouseDown(t.id, e)}
              onClick={() => setShowEditor(t)}
              style={{
                position: 'absolute', left: t.pos_x, top: t.pos_y, cursor: 'grab',
                width: isCircle ? size : size * 1.4, height: isCircle ? size : size * 0.7,
                borderRadius: isCircle ? '50%' : 8,
                background: color + '25', border: `3px solid ${color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', transition: dragging === t.id ? 'none' : 'box-shadow 0.15s',
                boxShadow: dragging === t.id ? `0 0 20px ${color}60` : `0 2px 8px rgba(0,0,0,0.3)`,
                userSelect: 'none', zIndex: dragging === t.id ? 100 : 1
              }}>
              <div style={{ fontSize: Math.min(16, 8 + t.capacity * 2), fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
                {t.name.split(' ').pop()}
              </div>
              <div style={{ fontSize: 9, color: color, fontWeight: 600 }}>
                {t.capacity}🪑
              </div>
            </div>
          )
        })}

        {tables.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
            Ni miz. Klikni "+ Dodaj mizo"
          </div>
        )}
      </div>

      {showEditor && (
        <div className="overlay" onClick={() => setShowEditor(null)}>
          <div className="modal modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
            <h3 style={{ marginBottom: 16 }}>✏️ {showEditor.name}</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Ime</label>
              <input className="input" value={showEditor.name}
                onChange={e => setShowEditor((p: any) => ({ ...p, name: e.target.value }))}
                style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Kapaciteta</label>
              <input type="number" className="input" value={showEditor.capacity}
                onChange={e => setShowEditor((p: any) => ({ ...p, capacity: parseInt(e.target.value) || 4 }))}
                style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Oblika</label>
              <select className="input" value={showEditor.shape}
                onChange={e => setShowEditor((p: any) => ({ ...p, shape: e.target.value }))}
                style={{ width: '100%' }}>
                <option value="circle">Krog</option>
                <option value="rectangle">Pravokotnik</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, fontSize: 12, color: '#64748b' }}>
              <span>📍 X: {showEditor.pos_x}</span>
              <span>📍 Y: {showEditor.pos_y}</span>
              <span>📌 {showEditor.status}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={saveTable}>Shrani</button>
              <button className="btn" style={{ color: '#ef4444' }} onClick={() => deleteTable(showEditor.id)}>Izbriši</button>
              <button className="btn" onClick={() => setShowEditor(null)}>Prekliči</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
