import { useState, useEffect } from 'react'

export default function ReceiptsPage({ onNotify }: { onNotify: (m: string) => void }) {
  const [files, setFiles] = useState<{name: string; url: string}[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/v1/orders/receipt-files', { headers: { 'Content-Type': 'application/json' } })
      .then(r => r.json())
      .then((r: {name: string; url: string}[]) => setFiles(r))
      .catch(() => onNotify('Napaka pri nalaganju računov'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = files.filter(f => f.name.includes(search) || search === '')

  if (loading) return <div style={{ padding: 40 }}>Nalaganje...</div>

  return (
    <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{ marginBottom: 20 }}>Shranjeni računi</h2>
            
            <input 
              className="input" 
              placeholder="Išči po ID ali datumu..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', marginBottom: 20, maxWidth: 300 }}
            />

            {filtered.length === 0 && <p style={{ color: '#666' }}>Ni shranjenih računov.</p>}

            <div style={{ display: 'grid', gap: 12 }}>
              {filtered.map(file => {
                const orderId = file.name.replace('receipt-', '').replace('.html', '')
                return (
                  <div key={file.name} style={{
                    border: '1px solid var(--border)', borderRadius: 8, padding: 16,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <strong>#{orderId}</strong>
                      <div style={{ fontSize: 13, color: '#666' }}>Shranjen {file.name}</div>
                    </div>
                    <a 
                      href={file.url} 
                      target="_blank" 
                      className="btn btn-sm btn-primary"
                    >
                      Odpri
                    </a>
                  </div>
                )
              })}
            </div>
          </div>
  )
}