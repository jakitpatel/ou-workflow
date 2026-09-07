import { afterEach, describe, expect, it, vi } from 'vitest'
import { getApiBaseUrl } from '@/lib/utils'
import { registerUserContext, resolveApiBaseUrl } from './httpClient'

describe('build API URL', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    registerUserContext({ apiBaseUrl: null })
  })

  it.each(['development', 'staging', 'production'])('uses the active %s build URL despite legacy configuration', (mode) => {
    const url = `https://${mode}.example.com`
    vi.stubEnv('MODE', mode)
    vi.stubEnv('VITE_API_CLIENT_URL', ` ${url} `)
    vi.stubGlobal('__APP_CONFIG__', { API_CLIENT_URL1: 'https://legacy.example.com' })
    registerUserContext({ apiBaseUrl: 'https://previous-build.example.com' })
    expect(getApiBaseUrl()).toBe(url)
    expect(resolveApiBaseUrl()).toBe(url)
  })

  it('does not fall back to a stored server when the build URL is missing', () => {
    vi.stubEnv('VITE_API_CLIENT_URL', '')
    registerUserContext({ apiBaseUrl: 'https://previous-build.example.com' })
    expect(resolveApiBaseUrl()).toBe('')
  })
})
