import { render, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAppError } from '@/shared/api/errors'
import { fetchProfileLayout, fetchUserPerson } from '@/features/profile/api'
import { readLoginNotice, USER_DETAILS_UNAVAILABLE_NOTICE } from '@/features/auth/model/loginNotice'
import { AppPreferencesProvider } from './AppPreferencesContext'

const user = vi.hoisted(() => ({ logout: vi.fn() }))
vi.mock('@/context/UserContext', () => ({
  useUser: () => ({ token: 'token', username: 'shouki.benjamin', logout: user.logout }),
}))
vi.mock('@/features/profile/api', () => ({
  fetchUserPerson: vi.fn(),
  fetchProfileLayout: vi.fn(async () => []),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

const renderProvider = () => render(<AppPreferencesProvider><div /></AppPreferencesProvider>)

describe('PERSONTB failure after login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  it('on 502 Bad Gateway shows a message and signs out to the login screen', async () => {
    vi.mocked(fetchUserPerson).mockRejectedValue(
      createAppError('Request failed: 502 Bad Gateway', { status: 502 }),
    )
    renderProvider()

    await waitFor(() => expect(user.logout).toHaveBeenCalledOnce())
    expect(fetchUserPerson).toHaveBeenCalledWith({ token: 'token', username: 'shouki.benjamin' })
    expect(toast.error).toHaveBeenCalledWith(USER_DETAILS_UNAVAILABLE_NOTICE)
    // Kept for the login screen, which shows it after the Cognito logout redirect.
    expect(readLoginNotice()).toBe(USER_DETAILS_UNAVAILABLE_NOTICE)
    expect(fetchProfileLayout).not.toHaveBeenCalled()
  })

  it.each([500, 503, 404, undefined])('keeps the user signed in for other failures (status %s)', async (status) => {
    vi.mocked(fetchUserPerson).mockRejectedValue(
      status === undefined ? new Error('boom') : createAppError(`Request failed: ${status}`, { status }),
    )
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderProvider()

    await waitFor(() => expect(fetchProfileLayout).toHaveBeenCalled())
    expect(user.logout).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()
    expect(readLoginNotice()).toBeNull()
  })

  it('does nothing when the user details load', async () => {
    vi.mocked(fetchUserPerson).mockResolvedValue(null)
    renderProvider()
    await waitFor(() => expect(fetchProfileLayout).toHaveBeenCalled())
    expect(user.logout).not.toHaveBeenCalled()
  })
})
