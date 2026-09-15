import { useEffect, useRef, useState } from 'react'
import { getAccessToken } from '@/auth/authService'
import { executeRequest } from '@/shared/api/httpClient'
import { isAppError } from '@/shared/api/errors'
import { createSSEParser } from '@/shared/api/sseParser'

export type SSEMessage = {
  type?: unknown
  data?: {
    type?: unknown
    root_conversation_id?: unknown
    MessageId?: unknown
    MessageID?: unknown
    messageId?: unknown
    ToUser?: unknown
    toUser?: unknown
    to_user?: unknown
    [key: string]: unknown
  }
  root_conversation_id?: unknown
  MessageId?: unknown
  MessageID?: unknown
  messageId?: unknown
  ToUser?: unknown
  toUser?: unknown
  to_user?: unknown
  [key: string]: unknown
}

type UseSSEOptions = {
  token?: string | null
  endpoint?: string | null
  enabled?: boolean
  onError?: (error: Event) => void
}

export function useSSE(
  onMessage: (message: SSEMessage) => void,
  { endpoint = '/events', token, enabled = true, onError }: UseSSEOptions = {},
) {
  const onMessageRef = useRef(onMessage)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  useEffect(() => {
    if (!enabled || !endpoint || !(token ?? getAccessToken())) return
    const url = endpoint
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    let retryMs = 3000
    let lastEventId = ''
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
    async function connect() {
      let reconnect = true
      try {
        // Refresh stores the new token; prefer it over stale context on reconnect.
        const accessToken = getAccessToken() ?? token
        if (!accessToken || controller.signal.aborted) {
          reconnect = false
          return
        }
        const headers = new Headers({
          Authorization: `Bearer ${accessToken}`,
          Accept: 'text/event-stream',
        })
        if (lastEventId) headers.set('Last-Event-ID', lastEventId)
        const response = await executeRequest(
          url,
          { headers, signal: controller.signal, cache: 'no-store' },
          accessToken,
        )
        if (controller.signal.aborted) {
          await response.body?.cancel()
          return
        }
        if (response.status === 204) {
          reconnect = false
          await response.body?.cancel()
          return
        }
        if (response.status === 401 || response.status === 403) reconnect = false
        if (
          !response.ok ||
          !response.headers.get('content-type')?.toLowerCase().startsWith('text/event-stream') ||
          !response.body
        ) {
          await response.body?.cancel()
          throw new Error(`SSE connection rejected (${response.status})`)
        }
        const parse = createSSEParser(
          (data) => {
            try {
              const message = JSON.parse(data) as SSEMessage
              if (!controller.signal.aborted) onMessageRef.current(message)
            } catch (error) {
              console.error('Invalid SSE message', error)
            }
          },
          (id) => {
            lastEventId = id
          },
          (delay) => {
            retryMs = Math.min(30000, Math.max(1000, delay))
          },
        )
        reader = response.body.getReader()
        const decoder = new TextDecoder()
        while (!controller.signal.aborted) {
          const { done, value } = await reader.read()
          if (done) break
          parse(decoder.decode(value, { stream: true }))
        }
      } catch (error) {
        if (isAppError(error) && error.code === 'AUTH_ERROR') reconnect = false
        if (!controller.signal.aborted) {
          console.error('SSE error', error)
          onErrorRef.current?.(new Event('error'))
        }
      } finally {
        reader?.releaseLock()
        reader = undefined
        if (reconnect && !controller.signal.aborted) timer = setTimeout(connect, retryMs)
      }
    }
    void connect()
    return () => {
      controller.abort()
      clearTimeout(timer)
      void reader?.cancel().catch(() => {})
    }
  }, [enabled, endpoint, token])
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
