import { useState, useEffect, useRef } from 'react'

interface ScanResult {
  type: string; id?: number; name?: string; barcode?: string;
  current_stock?: number; unit?: string; price?: number;
  category?: string; is_available?: boolean;
}

interface ScanHistory {
  id: number; ingredient_name: string; quantity: number; notes: string; created_at: string
}

export default function BarcodeInventory({ onNotify }: { onNotify: (msg: string) => void }) {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [history, setHistory] = useState<ScanHistory[]>([])
  const [mode, setMode] = useState<'scan' | 'update' | 'history'>('scan')
  const [updateQty, setUpdateQty] = useState('')
  const [updateAction, setUpdateAction] = useState<'set' | 'add' | 'subtract'>('add')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const headers = { ...JSON.parse(localStorage.getItem('auth') || '{}').headers }

  useEffect(() => { inputRef.current?.focus(); loadHistory() }, [])

  const lookupBarcode = async (barcode: string) => {
    if (!barcode.trim()) return
    setLoading(true)
    try {
      const r = await fetch(`/api/v1/barcode/lookup/${barcode.trim()}`, { headers }).then(r => r.json())
      setResult(r)
      if (r.type === 'not_found') {
        onNotify(`Barkod ${barcode} ni najden`)
      }
    } catch { onNotify('Napaka pri iskanju') }
    setLoading(false)
  }

  const updateStock = async () => {
    if (!result || !result.barcode || !updateQty) return
    setLoading(true)
    try {
      const r = await fetch('/api/v1/barcode/update-stock', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcode: result.barcode,
          quantity: parseFloat(updateQty),
          action: updateAction
        })
      }).then(r => r.json())
      if (r.error) {
        onNotify(r.error)
      } else {
        onNotify(r.message)
        setResult({ ...result, current_stock: r.new_stock })
        setUpdateQty('')
        loadHistory()
      }
    } catch { onNotify('Napaka pri posodabljanju') }
    setLoading(false)
  }

  const loadHistory = async () => {
    try {
      const r = await fetch('/api/v1/barcode/scan-history?limit=50', { headers }).then(r => r.json())
      setHistory(r.history || [])
    } catch {}
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim()) {
      lookupBarcode(input.trim())
      setInput('')
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ margin: '0 0 16px' }}>📱 Barkod sistem</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setMode('scan')} className={`btn btn-sm ${mode === 'scan' ? 'btn-primary' : 'btn-ghost'}`}>
          📷 Skeniraj
        </button>
        <button onClick={() => setMode('history')} className={`btn btn-sm ${mode === 'history' ? 'btn-primary' : 'btn-ghost'}`}>
          📜 Zgodovina ({history.length})
        </button>
      </div>

      {mode === 'scan' && (
        <div>
          <div style={{ background: 'var(--card, #fff)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: '#888', marginBottom: 4, display: 'block' }}>Skenirajte ali vnesite barkodo:</label>
            <input
              ref={inputRef}
              type="text"
              className="input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Vnesite barkodo in pritisnite Enter..."
              autoFocus
              style={{ fontSize: 18, padding: 14, letterSpacing: 2 }}
            />
          </div>

          {loading && <div style={{ textAlign: 'center', padding: 20 }}>⏳ Iskanje...</div>}

          {result && !loading && (
            <div style={{
              background: result.type === 'not_found' ? '#fef2f2' : 'var(--card, #fff)',
              borderRadius: 12, padding: 16, marginBottom: 16,
              border: result.type === 'not_found' ? '2px solid #ef4444' : '2px solid #22c55e'
            }}>
              {result.type === 'not_found' ? (
                <div>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>❌</div>
                  <div style={{ fontWeight: 600 }}>Barkod ni najden: {result.barcode}</div>
                  <div style={{ fontSize: 13, color: '#888', marginTop: 8 }}>
                    Želite ustvariti novo sestavino/izdelek?
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#888' }}>
                        {result.type === 'ingredient' ? '🧪 Sestavina' : '🍽️ Jed'}
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{result.name}</div>
                    </div>
                    <span style={{
                      padding: '4px 10px', borderRadius: 99, fontSize: 12,
                      background: result.type === 'ingredient' ? '#dbeafe' : '#dcfce7',
                      color: result.type === 'ingredient' ? '#1d4ed8' : '#16a34a'
                    }}>
                      {result.barcode || `#${result.id}`}
                    </span>
                  </div>

                  {result.type === 'ingredient' && (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                        <div style={{ background: '#f3f4f6', borderRadius: 8, padding: 10 }}>
                          <div style={{ fontSize: 11, color: '#888' }}>Trenutna zaloga</div>
                          <div style={{ fontSize: 18, fontWeight: 700 }}>
                            {result.current_stock} {result.unit}
                          </div>
                        </div>
                        <div style={{ background: '#f3f4f6', borderRadius: 8, padding: 10 }}>
                          <div style={{ fontSize: 11, color: '#888' }}>Cena</div>
                          <div style={{ fontSize: 18, fontWeight: 700 }}>€{result.price?.toFixed(2)}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        {[
                          { key: 'add', label: '➕ Dodaj', color: '#22c55e' },
                          { key: 'subtract', label: '➖ Odvzemi', color: '#ef4444' },
                          { key: 'set', label: '📝 Nastavi', color: '#3b82f6' }
                        ].map(a => (
                          <button key={a.key} onClick={() => setUpdateAction(a.key as any)}
                            style={{
                              flex: 1, padding: 10, border: `2px solid ${updateAction === a.key ? a.color : '#ddd'}`,
                              background: updateAction === a.key ? `${a.color}15` : '#fff',
                              borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: a.color
                            }}>
                            {a.label}
                          </button>
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        <input type="number" className="input" value={updateQty} onChange={e => setUpdateQty(e.target.value)}
                          placeholder="Količina" style={{ flex: 1, fontSize: 16, textAlign: 'center' }}
                          onKeyDown={e => e.key === 'Enter' && updateStock()} />
                        <button onClick={updateStock} className="btn btn-primary" disabled={!updateQty || loading}>
                          {loading ? '⏳' : '✅'} Shrani
                        </button>
                      </div>
                    </div>
                  )}

                  {result.type === 'menu_item' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                      <div style={{ background: '#f3f4f6', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: '#888' }}>Cena</div>
                        <div style={{ fontSize: 16, fontWeight: 700 }}>€{result.price?.toFixed(2)}</div>
                      </div>
                      <div style={{ background: '#f3f4f6', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: '#888' }}>Kategorija</div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{result.category}</div>
                      </div>
                      <div style={{ background: result.is_available ? '#dcfce7' : '#fef2f2', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: '#888' }}>Status</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: result.is_available ? '#16a34a' : '#dc2626' }}>
                          {result.is_available ? 'Na voljo' : 'Ni na voljo'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {mode === 'history' && (
        <div>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Ni zgodovine skeniranj</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {history.map(h => (
                <div key={h.id} style={{
                  background: 'var(--card, #fff)', borderRadius: 10, padding: 12,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{h.ingredient_name}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{h.notes}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: h.quantity >= 0 ? '#22c55e' : '#ef4444' }}>
                      {h.quantity >= 0 ? '+' : ''}{h.quantity}
                    </div>
                    <div style={{ fontSize: 10, color: '#888' }}>
                      {new Date(h.created_at).toLocaleString('sl-SI')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 20, padding: 16, background: '#f3f4f6', borderRadius: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>💡 Navodila:</div>
        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: '#666' }}>
          <li>Skenirajte barkodo s čitalnikom ali vnesite ročno</li>
          <li>Za sestavine: izberite dejanje (dodaj/odvzemi/nastavi) in količino</li>
          <li>Za jedi: prikažejo se podatki o izdelku</li>
          <li>Vsa skeniranja so zabeležena v zgodovini</li>
        </ul>
      </div>
    </div>
  )
}
