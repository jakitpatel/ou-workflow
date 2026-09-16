import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getAccessToken, refreshAccessToken, cognitoLogout } from '@/auth/authService'
import { useSSE } from './useSSE'

vi.mock('@/auth/authService', () => ({
  getAccessToken: vi.fn(),
  refreshAccessToken: vi.fn(),
  cognitoLogout: vi.fn(),
}))

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
    controller,
    cancel,
    response: new Response(body, { headers: { 'Content-Type': 'text/event-stream' } }),
  }
}

describe('useSSE', () => {
  beforeEach(() => {
    vi.mocked(getAccessToken).mockReturnValue(null)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('authenticates, parses split UTF-8 and multiline events, and cancels on unmount', async () => {
    const source = stream()
    const fetch = vi.fn().mockResolvedValue(source.response)
    vi.stubGlobal('fetch', fetch)
    const onMessage = vi.fn()
    const { unmount } = renderHook(() =>
      useSSE(onMessage, { token: 'access', endpoint: '/events/' }),
    )
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce())
    expect(new Headers(fetch.mock.calls[0][1].headers).get('Authorization')).toBe('Bearer access')
    const bytes = new TextEncoder().encode(': heartbeat\r\ndata: {"text":\r\ndata: "café"}\r\n\r\n')
    await act(async () => {
      for (const byte of bytes) source.controller.enqueue(new Uint8Array([byte]))
    })
    expect(onMessage).toHaveBeenCalledWith({ text: 'café' })
    unmount()
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true)
    expect(source.cancel).toHaveBeenCalledOnce()
  })

  it('refreshes a 401 and uses the refreshed token for the stream', async () => {
    const source = stream()
    vi.mocked(refreshAccessToken).mockResolvedValue('fresh')
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(source.response)
    vi.stubGlobal('fetch', fetch)
    const { unmount } = renderHook(() => useSSE(vi.fn(), { token: 'expired' }))
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
    expect(refreshAccessToken).toHaveBeenCalledOnce()
    expect(new Headers(fetch.mock.calls[1][1].headers).get('Authorization')).toBe('Bearer fresh')
    unmount()
  })

  it('reconnects with the event ID and latest token, and honors 204', async () => {
    vi.useFakeTimers()
    const source = stream()
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(source.response)
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetch)
    const { unmount } = renderHook(() => useSSE(vi.fn(), { token: 'original' }))
    await act(async () => {
      source.controller.enqueue(new TextEncoder().encode('id: 42\nretry: 1000\ndata: {}\n\n'))
      source.controller.close()
    })
    vi.mocked(getAccessToken).mockReturnValue('updated')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(fetch).toHaveBeenCalledTimes(2)
    const headers = new Headers(fetch.mock.calls[1][1].headers)
    expect(headers.get('Last-Event-ID')).toBe('42')
    expect(headers.get('Authorization')).toBe('Bearer updated')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60000)
    })
    expect(fetch).toHaveBeenCalledTimes(2)
    unmount()
  })

  it('stops after refresh failure', async () => {
    vi.useFakeTimers()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(refreshAccessToken).mockRejectedValue(new Error('expired session'))
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 401 }))
    vi.stubGlobal('fetch', fetch)
    const { unmount } = renderHook(() => useSSE(vi.fn(), { token: 'expired' }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60000)
    })
    expect(cognitoLogout).toHaveBeenCalledOnce()
    expect(fetch).toHaveBeenCalledOnce()
    unmount()
    vi.restoreAllMocks()
  })

  it('does not connect while disabled or without a token', () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    renderHook(() => useSSE(vi.fn()))
    renderHook(() => useSSE(vi.fn(), { token: 'access', enabled: false }))
    expect(fetch).not.toHaveBeenCalled()
  })
})
