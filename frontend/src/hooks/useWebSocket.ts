import { useEffect, useRef } from 'react'

interface UseWebSocketOptions {
  onScanStart?: () => void
  onScanStatus?: (scanning: boolean) => void
  onScanComplete?: (newHotspots: number) => void
  onOpen?: () => void
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null)
  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  })

  useEffect(() => {
    let ws: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let cancelled = false

    const connect = () => {
      if (cancelled) return

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      ws = new WebSocket(`${protocol}//${window.location.hostname}:3001/ws`)
      wsRef.current = ws

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          switch (msg.type) {
            case 'scan:status':
              optionsRef.current.onScanStatus?.(msg.scanning)
              break
            case 'scan:start':
              optionsRef.current.onScanStart?.()
              break
            case 'scan:complete':
              optionsRef.current.onScanComplete?.(msg.new_hotspots ?? 0)
              break
          }
        } catch {
          // ignore malformed messages
        }
      }

      ws.onopen = () => {
        optionsRef.current.onOpen?.()
      }

      ws.onclose = () => {
        if (!cancelled) {
          reconnectTimer = setTimeout(connect, 3000)
        }
      }
    }

    connect()

    return () => {
      cancelled = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (ws) {
        ws.onclose = null
        ws.close()
      }
    }
  }, [])

  return wsRef
}
