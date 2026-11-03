import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getAccessToken } from '@/auth/authService'
import { useSSEConnection } from '@/shared/api/useSSEConnection'

vi.mock('@/auth/authService', () => ({
  getAccessToken: vi.fn(),
  refreshAccessToken: vi.fn(),
  cognitoLogout: vi.fn(),
}))

const encoder = new TextEncoder()

function stream() {
  let controller!: ReadableStreamDefaultController<Uint8Array>
  const cancel = vi.fn()
  const body = new ReadableStream<Uint8Array>({
    start(value) {
      controller = value
    },
    cancel,
  })
  return {
    send: (text: string) => controller.enqueue(encoder.encode(text)),
    cancel,
    response: new Response(body, { headers: { 'Content-Type': 'text/event-stream' } }),
  }
}

// A request parked behind a busy server worker: no headers, ever, until aborted.
function parkedFetch(_url: string, options: RequestInit) {
  return new Promise<Response>((_resolve, reject) => {
    options.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
  })
}

let visibility: DocumentVisibilityState = 'visible'
function setVisibility(state: DocumentVisibilityState) {
  visibility = state
  document.dispatchEvent(new Event('visibilitychange'))
}

const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms) })
const signalOf = (fetch: ReturnType<typeof vi.fn>, call: number) =>
  (fetch.mock.calls[call][1] as RequestInit).signal as AbortSignal

describe('useSSEConnection capacity behaviour', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    visibility = 'visible'
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility })
    vi.mocked(getAccessToken).mockReturnValue(null)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    delete (document as { visibilityState?: unknown }).visibilityState
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it('abandons a request with no frame after 15 seconds and reconnects with backoff', async () => {
    const fetch = vi.fn(parkedFetch)
    vi.stubGlobal('fetch', fetch)
    const onError = vi.fn()
    const { unmount } = renderHook(() => useSSEConnection(vi.fn(), { token: 'access', onError }))
    await advance(14999)
    expect(fetch).toHaveBeenCalledOnce()
    expect(signalOf(fetch, 0).aborted).toBe(false)
    await advance(1)
    expect(signalOf(fetch, 0).aborted).toBe(true)
    expect(onError).toHaveBeenCalledOnce()
    // Backoff 3 s, then the next parked request times out and backs off 6 s.
    await advance(2999)
    expect(fetch).toHaveBeenCalledOnce()
    await advance(1)
    expect(fetch).toHaveBeenCalledTimes(2)
    await advance(15000 + 5999)
    expect(fetch).toHaveBeenCalledTimes(2)
    await advance(1)
    expect(fetch).toHaveBeenCalledTimes(3)
    unmount()
    await advance(120000)
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('times out a stream whose headers arrive but which sends no frame', async () => {
    const source = stream()
    const fetch = vi.fn().mockResolvedValueOnce(source.response).mockImplementation(parkedFetch)
    vi.stubGlobal('fetch', fetch)
    const { unmount } = renderHook(() => useSSEConnection(vi.fn(), { token: 'access' }))
    await advance(14999)
    expect(source.cancel).not.toHaveBeenCalled()
    await advance(1)
    expect(source.cancel).toHaveBeenCalledOnce()
    await advance(3000)
    expect(fetch).toHaveBeenCalledTimes(2)
    unmount()
  })

  it('keeps a connection whose heartbeat arrives before the timeout', async () => {
    const source = stream()
    const fetch = vi.fn().mockResolvedValue(source.response)
    vi.stubGlobal('fetch', fetch)
    const onError = vi.fn()
    const { unmount } = renderHook(() => useSSEConnection(vi.fn(), { token: 'access', onError }))
    await advance(14000)
    await act(async () => { source.send(': ping\n\n') })
    await advance(50000)
    expect(source.cancel).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
    expect(fetch).toHaveBeenCalledOnce()
    unmount()
  })

  it('closes the stream when the tab stays hidden past the grace period, without reporting an error', async () => {
    const source = stream()
    const fetch = vi.fn().mockResolvedValue(source.response)
    vi.stubGlobal('fetch', fetch)
    const onError = vi.fn()
    const { unmount } = renderHook(() => useSSEConnection(vi.fn(), { token: 'access', onError }))
    await act(async () => { source.send('data: {"type":"connected"}\n\n') })
    setVisibility('hidden')
    await advance(30000)
    await act(async () => { source.send(': ping\n\n') })
    await advance(29999)
    expect(source.cancel).not.toHaveBeenCalled()
    await advance(1)
    expect(source.cancel).toHaveBeenCalledOnce()
    expect(signalOf(fetch, 0).aborted).toBe(true)
    await advance(600000)
    expect(fetch).toHaveBeenCalledOnce()
    expect(onError).not.toHaveBeenCalled()
    unmount()
  })

  it('keeps the same connection when the tab returns within the grace period', async () => {
    const source = stream()
    const fetch = vi.fn().mockResolvedValue(source.response)
    vi.stubGlobal('fetch', fetch)
    const { unmount } = renderHook(() => useSSEConnection(vi.fn(), { token: 'access' }))
    await act(async () => { source.send('data: {"type":"connected"}\n\n') })
    setVisibility('hidden')
    await advance(45000)
    setVisibility('visible')
    await act(async () => { source.send(': ping\n\n') })
    await advance(59999)
    expect(source.cancel).not.toHaveBeenCalled()
    expect(fetch).toHaveBeenCalledOnce()
    unmount()
  })

  it('reconnects once with the last event id when the tab becomes visible after a close', async () => {
    const first = stream()
    const second = stream()
    const fetch = vi.fn().mockResolvedValueOnce(first.response).mockResolvedValueOnce(second.response)
    vi.stubGlobal('fetch', fetch)
    const onMessage = vi.fn()
    const { unmount } = renderHook(() => useSSEConnection(onMessage, { token: 'access' }))
    await act(async () => { first.send('id: 7\ndata: {"type":"refresh_messages"}\n\n') })
    setVisibility('hidden')
    await advance(60000)
    expect(first.cancel).toHaveBeenCalledOnce()
    expect(fetch).toHaveBeenCalledOnce()
    setVisibility('visible')
    setVisibility('visible')
    await advance(0)
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(new Headers((fetch.mock.calls[1][1] as RequestInit).headers).get('Last-Event-ID')).toBe('7')
    await act(async () => { second.send('id: 8\ndata: {"type":"reload_workflow_application"}\n\n') })
    expect(onMessage).toHaveBeenCalledTimes(2)
    await advance(30000)
    expect(fetch).toHaveBeenCalledTimes(2)
    unmount()
  })

  it('backs off repeated 503 refusals and honours Retry-After instead of looping', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 503, headers: { 'Retry-After': '20' } }))
      .mockImplementation(() => Promise.resolve(new Response(null, { status: 503 })))
    vi.stubGlobal('fetch', fetch)
    const { unmount } = renderHook(() => useSSEConnection(vi.fn(), { token: 'access' }))
    await advance(0)
    expect(fetch).toHaveBeenCalledOnce()
    // Backoff alone would retry after 3 s; the server asked for 20 s.
    await advance(19999)
    expect(fetch).toHaveBeenCalledOnce()
    await advance(1)
    expect(fetch).toHaveBeenCalledTimes(2)
    let calls = 2
    for (const delay of [6000, 12000, 24000, 30000]) {
      await advance(delay - 1)
      expect(fetch).toHaveBeenCalledTimes(calls)
      await advance(1)
      expect(fetch).toHaveBeenCalledTimes(++calls)
    }
    unmount()
  })
})
