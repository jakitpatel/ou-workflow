import { afterEach, describe, expect, it } from 'vitest'
import { clearTokens, getUserInfo, storeTokens } from './sessionManager'

const createJwt = (payload: Record<string, unknown>) => {
  const encode = (value: Record<string, unknown>) =>
    btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.`
}

const getRoles = (roles: unknown) => {
  storeTokens({
    accessToken: createJwt({ app_username: 'AUTH.USER', roles }),
    idToken: createJwt({ email: 'auth@example.com' }),
  })

  return getUserInfo()?.roles
}

afterEach(() => {
  clearTokens()
})

describe('getUserInfo role claims', () => {
  it('maps an array claim', () => {
    expect(getRoles(['NCRC', 'DISPATCH'])).toEqual([{ name: 'NCRC' }, { name: 'DISPATCH' }])
  })

  it('maps a JSON-serialized array claim', () => {
    expect(getRoles('["NCRC","DISPATCH"]')).toEqual([{ name: 'NCRC' }, { name: 'DISPATCH' }])
  })

  it('maps comma-separated and single-role claims', () => {
    expect(getRoles('NCRC, DISPATCH')).toEqual([{ name: 'NCRC' }, { name: 'DISPATCH' }])
    expect(getRoles('NCRC')).toEqual([{ name: 'NCRC' }])
  })

  it('returns an empty list for absent or unsupported claims', () => {
    expect(getRoles(undefined)).toEqual([])
    expect(getRoles({ role: 'NCRC' })).toEqual([])
  })
})
