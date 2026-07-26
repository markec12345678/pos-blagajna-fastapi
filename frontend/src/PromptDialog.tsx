import { useState, useRef, useEffect } from 'react'

export function PromptDialog({ title, message, defaultValue = '', options, type = 'text', confirmLabel = 'Potrdi', cancelLabel = 'Prekliči', onConfirm, onCancel }: {
  title: string; message?: string; defaultValue?: string
  options?: { label: string; value: string }[]
  type?: 'text' | 'number' | 'select' | 'confirm'
  confirmLabel?: string; cancelLabel?: string
  onConfirm: (value: string) => void; onCancel: () => void
}) {
  const [value, setValue] = useState(defaultValue)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (type !== 'confirm' && type !== 'select') inputRef.current?.focus() }, [type])

  const handleSubmit = () => onConfirm(value)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
    if (e.key === 'Escape') onCancel()
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 380, padding: 20 }} onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>{title}</h3>
        {message && <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text2)', whiteSpace: 'pre-line' }}>{message}</p>}

        {type === 'select' && options ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {options.map(opt => (
              <button key={opt.value} onClick={() => { setValue(opt.value); onConfirm(opt.value) }}
                className={`btn ${value === opt.value ? 'btn-primary' : 'btn-ghost'}`}
                style={{ textAlign: 'left', justifyContent: 'flex-start' }}>
                {opt.label}
              </button>
            ))}
          </div>
        ) : type === 'confirm' ? (
          <p style={{ marginBottom: 16, fontSize: 14 }}>{message}</p>
        ) : (
          <input ref={inputRef} className="input" type={type} value={value}
            onChange={e => setValue(e.target.value)}
            style={{ width: '100%', marginBottom: 16, boxSizing: 'border-box' }} />
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {type !== 'select' && (
            <>
              <button onClick={onCancel} className="btn btn-ghost">{cancelLabel}</button>
              <button onClick={handleSubmit} className="btn btn-primary">{confirmLabel}</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
