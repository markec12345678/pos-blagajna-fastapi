import { useState, useEffect, useRef } from 'react'
import * as api from './api'

export default function TablesPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [tables, setTables] = useState<any[]>([])
  const [mode, setMode] = useState<'grid' | 'floor'>('floor')
  const [editing, setEditing] = useState<any>(null)
  const [dragId, setDragId] = useState<number | null>(null)
  const floorRef = useRef<HTMLDivElement>(null)

  const load = () => api.getTables().then(setTables)
  useEffect(() => { load() }, [])

  const saveTable = async (data: any) => {
    if (!data.name) return
    try {
      if (data.id) {
        await fetch(`/api/v1/tables/${data.id}`, { method: 'PUT', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        onNotify(`Miza "${data.name}" posodobljena`)
      } else {
        await fetch('/api/v1/tables', { method: 'POST', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, pos_x: 100, pos_y: 100 }) })
        onNotify(`Miza "${data.name}" dodana`)
      }
      setEditing(null); load()
    } catch (e: any) { onNotify(e.message) }
  }

  const del = async (t: any) => {
    if (!confirm(`Izbriši mizo "${t.name}"?`)) return
    await fetch(`/api/v1/tables/${t.id}`, { method: 'DELETE', headers: api.authHeader() })
    onNotify(`Miza "${t.name}" izbrisana`); load()
  }

  const handleMouseDown = (e: React.MouseEvent, id: number) => {
    if (mode !== 'floor') return
    setDragId(id)
  }

  useEffect(() => {
    if (dragId === null || mode !== 'floor') return
    const handleMouseMove = (e: MouseEvent) => {
      if (!floorRef.current) return
      const rect = floorRef.current.getBoundingClientRect()
      const x = Math.round(e.clientX - rect.left - 25)
      const y = Math.round(e.clientY - rect.top - 25)
      const clampedX = Math.max(0, Math.min(x, floorRef.current.clientWidth - 50))
      const clampedY = Math.max(0, Math.min(y, floorRef.current.clientHeight - 50))
      setTables(prev => prev.map(t => t.id === dragId ? { ...t, pos_x: clampedX, pos_y: clampedY } : t))
    }
    const handleMouseUp = async () => {
      const t = tables.find(t => t.id === dragId)
      if (t) {
        await fetch(`/api/v1/tables/${t.id}`, { method: 'PUT', headers: { ...api.authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ pos_x: t.pos_x, pos_y: t.pos_y }) })
      }
      setDragId(null)
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragId, mode, tables])

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>🪑 Mize</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setMode('grid')} className={`btn btn-sm ${mode === 'grid' ? 'btn-primary' : 'btn-ghost'}`}>📋 Seznam</button>
          <button onClick={() => setMode('floor')} className={`btn btn-sm ${mode === 'floor' ? 'btn-primary' : 'btn-ghost'}`}>🏠 Tloris</button>
          <button onClick={() => setEditing({ name: '', capacity: 4, shape: 'circle' })} className="btn btn-primary btn-sm">+ Miza</button>
        </div>
      </div>

      {mode === 'floor' ? (
        <div ref={floorRef} style={{
          position: 'relative', width: '100%', height: 500, border: '2px dashed var(--border)',
          borderRadius: 12, background: 'var(--bg2)', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: 8, left: 8, fontSize: 11, color: '#94a3b8' }}>
            📍 Povleci mize za premikanje • {tables.length} miz
          </div>
          {tables.map(t => (
            <div key={t.id} style={{
              position: 'absolute', left: t.pos_x || 100, top: t.pos_y || 100,
              cursor: dragId === t.id ? 'grabbing' : 'grab',
              userSelect: 'none', zIndex: dragId === t.id ? 10 : 1,
            }}
              onMouseDown={e => handleMouseDown(e, t.id)}
            >
              <div style={{
                width: 50, height: t.shape === 'rectangle' ? 40 : 50,
                borderRadius: t.shape === 'rectangle' ? 8 : '50%',
                background: t.status === 'free' ? 'var(--green)' : t.status === 'occupied' ? 'var(--orange)' : 'var(--red)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: 10, fontWeight: 700, boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                transition: 'box-shadow 0.15s',
                opacity: dragId === t.id ? 0.8 : 1,
              }}>
                <span>{t.number || t.id}</span>
                <span style={{ fontSize: 8, opacity: 0.8 }}>{t.capacity}👤</span>
              </div>
              <div style={{ textAlign: 'center', fontSize: 10, marginTop: 2, fontWeight: 600, color: '#475569' }}>
                {t.name}
              </div>
              <button onClick={e => { e.stopPropagation(); window.open(`/table-pay?table=${t.id}`, '_blank') }}
                title="QR plačilo" style={{
                  position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%',
                  border: 'none', background: 'var(--primary)', color: '#fff', fontSize: 11, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1
                }}>💰
              </button>
            </div>
          ))}
          {tables.length === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              Dodajte mize za prikaz tlorisa
            </div>
          )}
        </div>
      ) : (
        <div className="card">
          {tables.map(t => (
            <div key={t.id} className="item-row" style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
              <div className="item-info">
                <span className="item-name">{t.name}</span>
                <span className="item-desc">{t.capacity} oseb • {t.status === 'free' ? 'Prosta' : t.status === 'occupied' ? 'Zasedena' : 'Rezervirana'}</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => window.open(`/table-pay?table=${t.id}`, '_blank')} className="btn btn-xs btn-ghost" title="QR plačilo">💰</button>
                <button onClick={() => setEditing({ id: t.id, name: t.name, capacity: t.capacity, shape: t.shape || 'circle' })} className="btn btn-xs btn-ghost">✏️</button>
                <button onClick={() => del(t)} className="btn btn-xs btn-ghost">🗑️</button>
              </div>
            </div>
          ))}
          {tables.length === 0 && <p style={{ color: 'var(--text2)', padding: 12 }}>Ni miz</p>}
        </div>
      )}

      {editing && (
        <div className="overlay" onClick={() => setEditing(null)}>
          <div className="modal modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 320 }}>
            <h3>{editing.id ? 'Uredi mizo' : 'Nova miza'}</h3>
            <input className="input" placeholder="Ime mize" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
            <input className="input" type="number" placeholder="Kapaciteta" value={editing.capacity} onChange={e => setEditing({ ...editing, capacity: parseInt(e.target.value) || 4 })} style={{ marginTop: 8 }} />
            <select className="input" value={editing.shape || 'circle'} onChange={e => setEditing({ ...editing, shape: e.target.value })} style={{ marginTop: 8 }}>
              <option value="circle">Krog</option>
              <option value="rectangle">Pravokotnik</option>
            </select>
            <div className="modal-btns" style={{ marginTop: 16 }}>
              <button onClick={() => saveTable(editing)} className="btn btn-primary" disabled={!editing.name.trim()}>Shrani</button>
              <button onClick={() => setEditing(null)} className="btn btn-ghost">Prekliči</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}