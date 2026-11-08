import { render, screen } from '@testing-library/react'
import type { ComponentType } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  readLoginNotice,
  storeLoginNotice,
  USER_DETAILS_UNAVAILABLE_NOTICE,
} from '@/features/auth/model/loginNotice'
import { Route } from '@/routes/_public/login'

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useLocation: () => '?signedOut=1',
}))
vi.mock('@/context/UserContext', () => ({ useUser: () => ({ login: vi.fn() }) }))
vi.mock('@/context/AppPreferencesContext', () => ({
  useAppPreferences: () => ({
    apiBaseUrl: 'https://api.example.test', setApiBaseUrl: vi.fn(),
    stageLayout: 'mixed', paginationMode: 'paged', navigationMenuType: 'top',
  }),
}))
vi.mock('@/features/auth/hooks/useLoginSso', () => ({
  useLoginSso: () => ({ isStartingLogin: false, error: '', startLogin: vi.fn() }),
}))
vi.mock('@/lib/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/utils')>()),
  getApiBaseUrl: () => 'https://api.example.test',
}))

const LoginPage = Route.options.component as ComponentType

describe('login screen notice', () => {
  beforeEach(() => sessionStorage.clear())

  it('shows the message left before sign-out, once', () => {
    storeLoginNotice(USER_DETAILS_UNAVAILABLE_NOTICE)
    const { unmount } = render(<LoginPage />)
    expect(screen.getByRole('alert').textContent).toBe(USER_DETAILS_UNAVAILABLE_NOTICE)
    expect(readLoginNotice()).toBeNull()
    unmount()

    render(<LoginPage />)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('shows no notice on a normal visit', () => {
    render(<LoginPage />)
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
