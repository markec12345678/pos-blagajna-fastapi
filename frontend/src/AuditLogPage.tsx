import { useState, useEffect } from 'react'
import * as api from './api'

export default function AuditLogPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch('/api/v1/audit', { headers: api.authHeader() })
        setLogs(await r.json())
      } catch (e: any) { onNotify(e.message) }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="loading-state">Nalaganje...</div>

  return (
    <div className="audit-page">
      <h2>📋 Dnevnik dogodkov</h2>
      <div className="audit-table">
        <div className="audit-scroll">
          {logs.map((l: any) => (
            <div key={l.id} className="audit-row">
              <span className="audit-time">{new Date(l.created_at).toLocaleString('sl-SI')}</span>
              <span className="audit-action">{l.action}</span>
              <span className="audit-entity">{l.entity_type}#{l.entity_id}</span>
              <span className="audit-details">{l.details}</span>
            </div>
          ))}
          {!logs.length && <div className="audit-empty">Ni dogodkov</div>}
        </div>
      </div>
    </div>
  )
}
