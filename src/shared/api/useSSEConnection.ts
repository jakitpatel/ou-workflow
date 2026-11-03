import { useEffect, useRef } from 'react'
import { getAccessToken } from '@/auth/authService'
import { executeRequest } from '@/shared/api/httpClient'
import { isAppError } from '@/shared/api/errors'
import { createSSEParser } from '@/shared/api/sseParser'

// Allow two missed heartbeats when the server sends traffic every 15–30 seconds.
const STREAM_IDLE_TIMEOUT_MS = 60000
// The server sends a "connected" frame at once; silence before the first byte means the request
// is parked behind a busy worker, so give up and retry with backoff instead of hanging.
const STREAM_CONNECT_TIMEOUT_MS = 15000
// A hidden tab keeps its stream briefly, then releases the server thread until it is visible.
const HIDDEN_TAB_GRACE_MS = 60000
// Bound a server Retry-After so a bad header cannot stall live updates indefinitely.
const MAX_RETRY_AFTER_MS = 300000

function parseRetryAfter(value: string | null): number {
  if (!value) return 0
  const trimmed = value.trim()
  const ms = /^\d+$/.test(trimmed) ? Number(trimmed) * 1000 : Date.parse(trimmed) - Date.now()
  return Number.isFinite(ms) ? Math.min(MAX_RETRY_AFTER_MS, Math.max(0, ms)) : 0
}

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
    let hiddenTimer: ReturnType<typeof setTimeout> | undefined
    let retryMs = 3000
    let nextRetryMs = retryMs
    let lastEventId = ''
    // Each connect() owns one generation; an older generation must not reconnect or deliver events.
    let generation = 0
    let closeConnection: (() => void) | undefined
    let suspended = false
    let stopped = false
    async function connect() {
      const id = ++generation
      const isCurrent = () => !controller.signal.aborted && id === generation
      let reconnect = true
      let retryAfterMs = 0
      const requestController = new AbortController()
      let livenessTimer: ReturnType<typeof setTimeout> | undefined
      let timedOutAfterMs: number | undefined
      let connectedAt: number | undefined
      let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
      const close = () => {
        clearTimeout(livenessTimer)
        requestController.abort()
        void reader?.cancel().catch(() => {})
      }
      closeConnection = close
      const abortRequest = () => {
        clearTimeout(livenessTimer)
        requestController.abort()
      }
      controller.signal.addEventListener('abort', abortRequest, { once: true })
      const armLivenessTimer = (timeoutMs: number) => {
        clearTimeout(livenessTimer)
        livenessTimer = setTimeout(() => {
          timedOutAfterMs = timeoutMs
          requestController.abort()
          void reader?.cancel().catch(() => {})
        }, timeoutMs)
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
        // A request queued behind a busy server worker gets neither headers nor frames.
        armLivenessTimer(STREAM_CONNECT_TIMEOUT_MS)
        const response = await executeRequest(
          url,
          { headers, signal: requestController.signal, cache: 'no-store', timeoutMs: false },
          accessToken,
        )
        if (!isCurrent()) {
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
          retryAfterMs = parseRetryAfter(response.headers.get('retry-after'))
          await response.body?.cancel()
          throw new Error(`SSE connection rejected (${response.status})`)
        }
        const parse = createSSEParser(
          (data) => {
            if (!isCurrent()) return
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
          (eventId) => {
            // Keep the cursor on the last delivered event so a reconnect replays the rest.
            if (isCurrent()) lastEventId = eventId
          },
          (delay) => {
            retryMs = Math.min(2147483647, delay)
            nextRetryMs = retryMs
          },
        )
        reader = response.body.getReader()
        connectedAt = Date.now()
        const decoder = new TextDecoder()
        while (isCurrent()) {
          const { done, value } = await reader.read()
          if (timedOutAfterMs !== undefined) {
            throw new Error(`SSE stream timed out after ${timedOutAfterMs / 1000} seconds without data`)
          }
          if (done) break
          // Count raw traffic, including comment heartbeats and split SSE frames.
          if (value.byteLength) {
            nextRetryMs = retryMs
            armLivenessTimer(STREAM_IDLE_TIMEOUT_MS)
          }
          parse(decoder.decode(value, { stream: true }))
        }
      } catch (error) {
        if (isAppError(error) && error.code === 'AUTH_ERROR') reconnect = false
        if (isCurrent()) {
          console.error('SSE error', error)
          onErrorRef.current?.(new Event('error'))
        }
      } finally {
        clearTimeout(livenessTimer)
        controller.signal.removeEventListener('abort', abortRequest)
        reader?.releaseLock()
        if (closeConnection === close) closeConnection = undefined
        if (isCurrent()) {
          if (!reconnect) {
            stopped = true
          } else {
            // Reset after traffic or a stable connection, not merely successful headers.
            if (connectedAt !== undefined && Date.now() - connectedAt >= 30000) {
              nextRetryMs = retryMs
            }
            const maxDelay = Math.max(30000, retryMs)
            const delay = Math.min(maxDelay, Math.round(nextRetryMs * (1 + Math.random() * 0.2)))
            nextRetryMs = Math.min(maxDelay, nextRetryMs * 2)
            // A refusal such as 503 may ask for a longer wait; never retry sooner than that.
            timer = setTimeout(connect, Math.max(delay, retryAfterMs))
          }
        }
      }
    }
    // Close the stream when the tab stays hidden, so it stops holding a server worker thread.
    const suspend = () => {
      hiddenTimer = undefined
      if (stopped || controller.signal.aborted || document.visibilityState !== 'hidden') return
      suspended = true
      generation++
      clearTimeout(timer)
      closeConnection?.()
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (!suspended && hiddenTimer === undefined) hiddenTimer = setTimeout(suspend, HIDDEN_TAB_GRACE_MS)
        return
      }
      clearTimeout(hiddenTimer)
      hiddenTimer = undefined
      if (!suspended || controller.signal.aborted) return
      // Reconnect at once; Last-Event-ID replays whatever arrived while the tab was hidden.
      suspended = false
      nextRetryMs = retryMs
      void connect()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    onVisibilityChange()
    void connect()
    return () => {
      controller.abort()
      clearTimeout(timer)
      clearTimeout(hiddenTimer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      closeConnection?.()
    }
  }, [enabled, endpoint, token])
}
