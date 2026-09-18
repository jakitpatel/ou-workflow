import { useContext, useEffect, useRef, useState } from 'react'
import { EventsContext } from '@/app/providers/EventsProvider'
import type { SSEMessage } from '@/shared/api/useSSEConnection'

export type { SSEMessage } from '@/shared/api/useSSEConnection'

// Local listeners only. The authenticated provider owns the network connection.
export function useSSE(
  onMessage: (message: SSEMessage) => void,
  { enabled = true, onError }: {
    enabled?: boolean
    onError?: (error: Event) => void
  } = {},
) {
  const subscribe = useContext(EventsContext)
  const onMessageRef = useRef(onMessage)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onMessageRef.current = onMessage
    onErrorRef.current = onError
  }, [onMessage, onError])

  useEffect(() => {
    if (!enabled || !subscribe) return
    return subscribe({
      onMessage: (message) => onMessageRef.current(message),
      onError: (event) => onErrorRef.current?.(event),
    })
  }, [enabled, subscribe])
}

export function SSEMessageTester({ endpoint = '/events/' }: { endpoint?: string }) {
  const [messages, setMessages] = useState<SSEMessage[]>([])

  useSSE(
    (message) => {
      setMessages((currentMessages) => [message, ...currentMessages].slice(0, 25))
    },
    {},
  )

  return (
    <section className="space-y-3 rounded border border-slate-200 bg-white p-4 text-sm">
      <div>
        <h2 className="text-base font-semibold text-slate-900">SSE Message Tester</h2>
        <p className="text-slate-600">Listening on {endpoint}</p>
      </div>
      <pre className="max-h-96 overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-50">
        {messages.length > 0 ? JSON.stringify(messages, null, 2) : 'Waiting for messages...'}
      </pre>
    </section>
  )
}
