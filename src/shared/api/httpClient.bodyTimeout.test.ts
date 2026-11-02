import { afterEach, describe, expect, it, vi } from 'vitest'
import { executeRequest, fetchWithAuth } from './httpClient'
vi.mock('@/auth/authService', () => ({ getAccessToken: vi.fn(), refreshAccessToken: vi.fn(), cognitoLogout: vi.fn() }))
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })
describe('body deadline', () => {
  it.each([200, 500])('times out after %s headers while an abort-aware body never closes', async (status) => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn(async (_url, options: RequestInit) => new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"data":'))
        options.signal?.addEventListener('abort', () => controller.error(new DOMException('aborted', 'AbortError')))
      },
    }), { status })))
    const result = expect(fetchWithAuth({ path: '/stalled', token: 'test', timeoutMs: 50 })).rejects.toMatchObject({ code: 'TIMEOUT_ERROR' })
    await vi.advanceTimersByTimeAsync(50)
    await result
    expect(vi.getTimerCount()).toBe(0)
  })
  it('keeps the same deadline for a slow successful body and clears it after consumption', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new ReadableStream({
      start(controller) { setTimeout(() => { controller.enqueue(new TextEncoder().encode('{"ok":true}')); controller.close() }, 20) },
    }))))
    const result = fetchWithAuth({ path: '/slow', token: 'test', timeoutMs: 50 })
    await vi.advanceTimersByTimeAsync(20)
    await expect(result).resolves.toEqual({ ok: true })
    expect(vi.getTimerCount()).toBe(0)
  })
  it('retains the explicit SSE deadline opt-out', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new ReadableStream())))
    const response = await executeRequest('/events', { timeoutMs: false }, null)
    expect(response.body).not.toBeNull()
    expect(vi.getTimerCount()).toBe(0)
    await response.body?.cancel()
  })
})
