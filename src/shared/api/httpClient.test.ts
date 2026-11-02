import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAppError, isAppError } from './errors'
import { executeRequest, fetchWithAuth } from './httpClient'

vi.mock('@/auth/authService', () => ({
  getAccessToken: vi.fn(), refreshAccessToken: vi.fn(), cognitoLogout: vi.fn(),
}))

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

describe('platform HTTP regressions', () => {
  it('recognizes only branded application errors, not browser DOMExceptions or lookalikes', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('DOMException', class BrowserDOMException extends Error {
      readonly code = 20
      constructor(message: string, name: string) { super(message); this.name = name }
    })
    const abort = new DOMException('aborted', 'AbortError')
    expect(abort).toBeInstanceOf(Error)
    expect(abort.code).toBe(20)
    expect(isAppError(abort)).toBe(false)
    expect(isAppError(Object.assign(new Error('foreign'), { code: 'API_ERROR' }))).toBe(false)
    expect(isAppError(createAppError('application'))).toBe(true)
    vi.stubGlobal('fetch', vi.fn((_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener('abort', () => reject(abort))
    })))
    const assertion = expect(executeRequest('/slow', { timeoutMs: 20 }, 'fixture')).rejects.toMatchObject({
      code: 'TIMEOUT_ERROR', message: 'Request timed out. Please try again.',
    })
    await vi.advanceTimersByTimeAsync(20)
    await assertion
  })


  it.each([
    ['generic-API guard (message + errors)', { message: 'Not authorized to write COMPANYTB through the generic API', errors: [{ title: 'Not authorized to write COMPANYTB through the generic API', code: '403' }] }, 'Not authorized to write COMPANYTB through the generic API'],
    ['SAFRS JSON:API errors only (title)', { errors: [{ title: 'Grant Security Error on User: rachel.levy does not have update access on entity: TaskInstance', code: '403' }] }, 'You do not have permission to make this change. Ask an administrator for access.'],
    ['SAFRS JSON:API errors (detail preferred)', { errors: [{ title: 'Forbidden', detail: 'Not authorized on this task', code: '403' }] }, 'Not authorized on this task'],
  ])('surfaces the server reason for a 403: %s', async (_label, body, reason) => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status: 403, statusText: 'FORBIDDEN' })))
    await expect(fetchWithAuth({ path: '/fixture', token: 'fixture' })).rejects.toMatchObject({
      status: 403, message: reason, details: body,
    })
  })

  it('falls back to the status line when the error body has no reason', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ errors: [{ title: ' ' }] }), { status: 403, statusText: 'FORBIDDEN' })))
    await expect(fetchWithAuth({ path: '/fixture', token: 'fixture' })).rejects.toMatchObject({
      status: 403, message: 'Request failed: 403 FORBIDDEN',
    })
  })

  it.each([200, 204])('accepts an empty %s response', async (status) => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status })))
    await expect(fetchWithAuth({ path: '/fixture', token: 'fixture' })).resolves.toBeUndefined()
  })

  it('wraps malformed successful JSON in an AppError', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{broken', { status: 200 })))
    const error: unknown = await fetchWithAuth({ path: '/fixture', token: 'fixture' }).catch((error: unknown) => error)
    expect(isAppError(error)).toBe(true)
    expect(error).toMatchObject({ status: 200, code: 'API_ERROR', message: expect.stringContaining('invalid JSON') })
  })

  it('still returns valid successful JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"ok":true}')))
    await expect(fetchWithAuth({ path: '/fixture', token: 'fixture' })).resolves.toEqual({ ok: true })
  })
})
