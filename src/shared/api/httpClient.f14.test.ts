import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchWithAuth } from './httpClient'

vi.mock('@/auth/authService', () => ({
  getAccessToken: vi.fn(), refreshAccessToken: vi.fn(), cognitoLogout: vi.fn(),
}))

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

describe('platform HTTP regressions', () => {
  it.each(['Upstream said: duplicate key 16', '<html>Unavailable</html>'])(
    'preserves a non-JSON error response: %s', async (body) => {
      vi.stubGlobal('fetch', vi.fn(async () => new Response(body, { status: 500 })))
      await expect(fetchWithAuth({ path: '/fixture', token: 'fixture' })).rejects.toMatchObject({
        status: 500, code: 'API_ERROR', details: body,
      })
    },
  )

  it('preserves structured error details and the server message', async () => {
    const body = { message: 'Duplicate key', field: 'application' }
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status: 409 })))
    await expect(fetchWithAuth({ path: '/fixture', token: 'fixture' })).rejects.toMatchObject({
      status: 409, message: 'Duplicate key', details: body,
    })
  })
})
