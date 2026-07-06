import { useEffect, useRef, useCallback } from 'react'

type WsEvent = { event: string; data: Record<string, any> }
type Handler = (evt: WsEvent) => void

export function useWebSocket(onEvent: Handler) {
  const wsRef = useRef<WebSocket | null>(null)
  const handlerRef = useRef(onEvent)
  handlerRef.current = onEvent

  const connect = useCallback(() => {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${proto}//${location.host}/ws`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'ping' }))
    }

    ws.onmessage = (msg) => {
      try {
        const parsed = JSON.parse(msg.data) as WsEvent
        handlerRef.current(parsed)
      } catch { /* ignore */ }
    }

    ws.onclose = () => {
      wsRef.current = null
      setTimeout(connect, 3000)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect])
}
