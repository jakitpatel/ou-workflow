import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { authlogin } from './authService'
import { validateConfig } from './cognitoConfig'
import { storePendingOAuthState } from '@/features/auth/model/sessionManager'

vi.mock('./cognitoConfig', () => ({
  validateConfig: vi.fn(() => true),
  cognitoConfig: {
    domain: 'example.auth.us-east-1.amazoncognito.com',
    userPoolWebClientId: 'dashboard-client',
    oauth: { responseType: 'code', scope: ['openid', 'email'] },
  },
}))
vi.mock('@/features/auth/model/cognitoOAuth', () => ({
  getCognitoCallbackUrl: () => 'https://dashboard.example.com/cognito-directcallback',
  getCognitoLogoutUrl: () => 'https://dashboard.example.com/cognito-logout',
}))
vi.mock('@/features/auth/model/sessionManager', () => ({
  clearTokens: vi.fn(), getAccessToken: vi.fn(), getIdToken: vi.fn(), getUserInfo: vi.fn(),
  isAuthenticated: vi.fn(), refreshAccessToken: vi.fn(), storeAuthRedirect: vi.fn(),
  storePendingOAuthState: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(validateConfig).mockReturnValue(true)
  vi.stubGlobal('window', { location: { href: '' } })
})
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('Cognito authorization request', () => {
  it.each(['', 'OktaOIDC'])('preserves PKCE and callback with provider %s', async (provider) => {
    vi.stubEnv('VITE_COGNITO_IDP', provider)
    await authlogin()
    const url = new URL(window.location.href)
    const pending = vi.mocked(storePendingOAuthState).mock.calls[0][0]
    expect(url.pathname).toBe('/oauth2/authorize')
    expect(url.searchParams.get('identity_provider')).toBe(provider || null)
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('client_id')).toBe('dashboard-client')
    expect(url.searchParams.get('redirect_uri')).toBe('https://dashboard.example.com/cognito-directcallback')
    expect(url.searchParams.get('state')).toBe(pending.state)
    expect(pending.codeVerifier).toHaveLength(128)
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('code_challenge')).toMatch(/^[\w-]{43}$/)
    expect(url.searchParams.has('prompt')).toBe(false)
  })

  it('rejects invalid configuration before storing OAuth state or redirecting', async () => {
    vi.mocked(validateConfig).mockReturnValue(false)
    await expect(authlogin()).rejects.toThrow('configuration is incomplete')
    expect(storePendingOAuthState).not.toHaveBeenCalled()
    expect(window.location.href).toBe('')
  })
})
