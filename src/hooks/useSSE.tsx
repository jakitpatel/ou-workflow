import { useEffect, useRef, useState } from 'react'

export type SSEMessage = unknown

type UseSSEOptions = {
  endpoint?: string | null
  enabled?: boolean
  onError?: (error: Event) => void
}

export function useSSE(
  onMessage: (message: SSEMessage) => void,
  { endpoint = '/events', enabled = true, onError }: UseSSEOptions = {},
) {
  const onMessageRef = useRef(onMessage)
  const onErrorRef = useRef(onError)

  onMessageRef.current = onMessage
  onErrorRef.current = onError

  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  useEffect(() => {
    if (!enabled || !endpoint || typeof EventSource === 'undefined') return

    const eventSource = new EventSource(endpoint)

    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as SSEMessage
        onMessageRef.current(message)
      } catch (error) {
        console.error('Invalid SSE message', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('SSE error', error)
      onErrorRef.current?.(error)
    }

    return () => {
      eventSource.close()
    }
  }, [enabled, endpoint])
}

export function SSEMessageTester({ endpoint = '/events' }: { endpoint?: string }) {
  const [messages, setMessages] = useState<SSEMessage[]>([])

  useSSE(
    (message) => {
      setMessages((currentMessages) => [message, ...currentMessages].slice(0, 25))
    },
    { endpoint },
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
