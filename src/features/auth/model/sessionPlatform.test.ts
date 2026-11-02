import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearTokens, getUserInfo, isAuthenticated, storeTokens } from './sessionManager'
import { exchangeAuthorizationCodeForTokens } from './cognitoOAuth'

const jwt = (payload: object) => `header.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.signature`
afterEach(() => clearTokens())

describe('session platform regressions', () => {
  it('decodes unpadded base64url and UTF-8 without logging tokens or claims', () => {
    const payload = { exp: Math.floor(Date.now() / 1000) + 3600, app_username: 'josé', email: 'a??>>@local.test', roles: ['NCRC'] }
    const token = jwt(payload)
    expect(/[-_]/.test(token.split('.')[1])).toBe(true)
    storeTokens({ accessToken: token, idToken: token })
    const log = vi.spyOn(console, 'log')
    const debug = vi.spyOn(console, 'debug')
    const error = vi.spyOn(console, 'error')
    expect(isAuthenticated()).toBe(true)
    expect(getUserInfo()).toMatchObject({ username: 'josé', email: payload.email, roles: [{ name: 'NCRC' }] })
    expect(log).not.toHaveBeenCalled()
    expect(debug).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })

  it('does not expose malformed payloads through parser errors', () => {
    const secret = 'FIX-fe3-platform-sensitive-claim'
    const token = `header.${Buffer.from(`{"secret":"${secret}" BROKEN`).toString('base64url')}.signature`
    storeTokens({ accessToken: token, idToken: token })
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(getUserInfo()).toBeNull()
    expect(isAuthenticated()).toBe(false)
    expect(sessionStorage.getItem('access_token')).toBeNull()
    expect(JSON.stringify(error.mock.calls)).not.toContain(secret)
    expect(error.mock.calls.every((args) => args.length === 1 && typeof args[0] === 'string')).toBe(true)
  })

  it('does not expose a token endpoint error response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('FIX-fe3-platform-sensitive-response', { status: 400 })))
    const log = vi.spyOn(console, 'error')
    await expect(exchangeAuthorizationCodeForTokens({ code: 'fixture', codeVerifier: 'fixture' })).rejects.toThrow('Sign-in token exchange failed (400).')
    expect(log).not.toHaveBeenCalled()
  })
})
