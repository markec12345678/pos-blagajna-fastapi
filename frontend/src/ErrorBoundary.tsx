import React, { Component, type ReactNode } from 'react'

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div style={{ padding: 40, textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontSize: 18, marginBottom: 8, color: 'var(--text)' }}>Nekaj je šlo narobe</h2>
          <p style={{ color: 'var(--text2, #666)', marginBottom: 20, fontSize: 14, maxWidth: 400, margin: '0 auto 20px' }}>
            {this.state.error?.message || 'Neznana napaka pri nalaganju strani'}
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{ padding: '8px 20px', background: 'var(--surface2, #f1f5f9)', color: 'var(--text)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}
            >
              Poskusi znova
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '8px 20px', background: '#059669', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}
            >
              Ponovno naloži
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
