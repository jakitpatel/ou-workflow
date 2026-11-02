import { useEffect, useRef } from 'react'
import { getAccessToken } from '@/auth/authService'
import { executeRequest } from '@/shared/api/httpClient'
import { isAppError } from '@/shared/api/errors'
import { createSSEParser } from '@/shared/api/sseParser'

// Allow two missed heartbeats when the server sends traffic every 15–30 seconds.
const STREAM_IDLE_TIMEOUT_MS = 60000

export type SSEMessage = {
  pushSeqNum?: unknown
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

export function useSSEConnection(
  onMessage: (message: SSEMessage) => void,
  { endpoint = '/events/', token, enabled = true, onError }: UseSSEOptions = {},
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
    let nextRetryMs = retryMs
    let lastEventId = ''
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
    async function connect() {
      let reconnect = true
      const requestController = new AbortController()
      let idleTimer: ReturnType<typeof setTimeout> | undefined
      let timedOut = false
      let connectedAt: number | undefined
      const abortRequest = () => {
        clearTimeout(idleTimer)
        requestController.abort()
      }
      controller.signal.addEventListener('abort', abortRequest, { once: true })
      const resetIdleTimer = () => {
        clearTimeout(idleTimer)
        idleTimer = setTimeout(() => {
          timedOut = true
          requestController.abort()
          void reader?.cancel().catch(() => {})
        }, STREAM_IDLE_TIMEOUT_MS)
      }
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
          { headers, signal: requestController.signal, cache: 'no-store', timeoutMs: false },
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
            if (controller.signal.aborted) return
            if (data.trim() === 'ping' || data.trim() === 'connected') return
            try {
              const message = JSON.parse(data) as SSEMessage
              if (!message || typeof message !== 'object' || Array.isArray(message)) return
              if (message.type === 'connected' || message.type === 'ping') return
              onMessageRef.current(message)
            } catch {
              console.error('Invalid SSE message')
            }
          },
          (id) => {
            lastEventId = id
          },
          (delay) => {
            retryMs = Math.min(2147483647, delay)
            nextRetryMs = retryMs
          },
        )
        reader = response.body.getReader()
        connectedAt = Date.now()
        resetIdleTimer()
        const decoder = new TextDecoder()
        while (!controller.signal.aborted) {
          const { done, value } = await reader.read()
          if (timedOut) throw new Error('SSE stream timed out after 60 seconds without data')
          if (done) break
          // Count raw traffic, including comment heartbeats and split SSE frames.
          if (value.byteLength) {
            nextRetryMs = retryMs
            resetIdleTimer()
          }
          parse(decoder.decode(value, { stream: true }))
        }
      } catch (error) {
        if (isAppError(error) && error.code === 'AUTH_ERROR') reconnect = false
        if (!controller.signal.aborted) {
          console.error('SSE error', error)
          onErrorRef.current?.(new Event('error'))
        }
      } finally {
        clearTimeout(idleTimer)
        controller.signal.removeEventListener('abort', abortRequest)
        reader?.releaseLock()
        reader = undefined
        if (reconnect && !controller.signal.aborted) {
          // Reset after traffic or a stable connection, not merely successful headers.
          if (connectedAt !== undefined && Date.now() - connectedAt >= 30000) {
            nextRetryMs = retryMs
          }
          const maxDelay = Math.max(30000, retryMs)
          const delay = Math.min(maxDelay, Math.round(nextRetryMs * (1 + Math.random() * 0.2)))
          nextRetryMs = Math.min(maxDelay, nextRetryMs * 2)
          timer = setTimeout(connect, delay)
        }
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
