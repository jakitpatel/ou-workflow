import { StrictMode, type ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authlogin, isAuthenticated } from '@/auth/authService'
import { saveStoredAppPreferences } from '@/context/appPreferencesStorage'
import { useLoginSso } from './useLoginSso'

vi.mock('@/auth/authService', () => ({ authlogin: vi.fn(), isAuthenticated: vi.fn() }))
vi.mock('@/context/appPreferencesStorage', () => ({ saveStoredAppPreferences: vi.fn() }))
const preferences = {
  apiBaseUrl: 'https://dev.example.com',
  stageLayout: 'mixed' as const,
  paginationMode: 'infinite' as const,
  navigationMenuType: 'left' as const,
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(isAuthenticated).mockReturnValue(false)
  vi.mocked(authlogin).mockResolvedValue(undefined)
})

describe('automatic SSO', () => {
  it('starts once in StrictMode, saves preferences, and blocks overlapping manual requests', async () => {
    const wrapper = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>
    const { result, rerender } = renderHook(() => useLoginSso(preferences, ''), { wrapper })
    await waitFor(() => expect(authlogin).toHaveBeenCalledTimes(1))
    rerender()
    await act(() => result.current.startLogin())
    expect(authlogin).toHaveBeenCalledTimes(1)
    expect(saveStoredAppPreferences).toHaveBeenCalledWith(preferences)
    expect(result.current.isStartingLogin).toBe(true)
  })

  it.each(['?error=access_denied', '?error=', '?signedOut=1'])(
    'waits for manual login after %s, including a remount', async (search) => {
      const first = renderHook(() => useLoginSso(preferences, search))
      first.unmount()
      const { result } = renderHook(() => useLoginSso(preferences, search))
      expect(authlogin).not.toHaveBeenCalled()
      await act(() => result.current.startLogin())
      expect(authlogin).toHaveBeenCalledTimes(1)
    },
  )

  it('preserves localhost mock login and waits for a resolved server', async () => {
    const { rerender } = renderHook(({ apiBaseUrl }) => useLoginSso({ ...preferences, apiBaseUrl }, ''), {
      initialProps: { apiBaseUrl: '' },
    })
    expect(authlogin).not.toHaveBeenCalled()
    rerender({ apiBaseUrl: 'http://localhost:3001' })
    expect(authlogin).not.toHaveBeenCalled()
    rerender({ apiBaseUrl: preferences.apiBaseUrl })
    await waitFor(() => expect(authlogin).toHaveBeenCalledTimes(1))
  })

  it('does not start when already authenticated', () => {
    vi.mocked(isAuthenticated).mockReturnValue(true)
    renderHook(() => useLoginSso(preferences, ''))
    expect(authlogin).not.toHaveBeenCalled()
  })

  it('allows manual retry after failure without automatically retrying', async () => {
    vi.mocked(authlogin).mockRejectedValueOnce(new Error('storage unavailable'))
    const { result, rerender } = renderHook(() => useLoginSso(preferences, ''))
    await waitFor(() => expect(result.current.error).toContain('Unable to start'))
    expect(result.current.isStartingLogin).toBe(false)
    rerender()
    expect(authlogin).toHaveBeenCalledTimes(1)
    await act(() => result.current.startLogin())
    expect(authlogin).toHaveBeenCalledTimes(2)
  })

  it('continues login when preference storage fails', async () => {
    vi.mocked(saveStoredAppPreferences).mockImplementation(() => { throw new Error('storage') })
    renderHook(() => useLoginSso(preferences, ''))
    await waitFor(() => expect(authlogin).toHaveBeenCalledTimes(1))
  })
})
