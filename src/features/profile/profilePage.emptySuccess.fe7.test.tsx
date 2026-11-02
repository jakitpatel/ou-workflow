import type { ComponentType, ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { Route } from '@/routes/_authed/profile'

// fe7: a preference save answered by an empty 200 used to show "Preferences updated" with nothing
// stored; it was only logged on a real failure. Now the user sees the error and no success mark.
const mocks = vi.hoisted(() => ({ toastError: vi.fn() }))
vi.mock('sonner', () => ({ toast: { error: mocks.toastError } }))
vi.mock('@/auth/authService', () => ({
  getAccessToken: vi.fn(() => 'token'), refreshAccessToken: vi.fn(), cognitoLogout: vi.fn(),
}))
vi.mock('@/context/UserContext', () => ({
  useUser: () => ({ email: 'fix-fe7@local.test', username: 'FIX-fe7-user', token: 'token', role: 'NCRC', roles: [], setRole: vi.fn() }),
}))
vi.mock('@/context/AppPreferencesContext', () => ({
  useAppPreferences: () => ({
    apiBaseUrl: 'http://api.test', stageLayout: 'horizontal', setStageLayout: vi.fn(),
    paginationMode: 'paged', setPaginationMode: vi.fn(),
    navigationMenuType: 'top', setNavigationMenuType: vi.fn(), userPerson: null,
  }),
}))
vi.mock('@/components/layout/PageShell', () => ({ PageShell: ({ children }: { children: ReactNode }) => <>{children}</> }))

const NOT_CONFIRMED = 'The server did not confirm the change. Nothing was saved.'
let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  mocks.toastError.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  fetchMock = vi.fn(async () => new Response('', { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

const renderProfile = () => {
  const ProfilePage = Route.options.component as ComponentType
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <ProfilePage />
    </QueryClientProvider>,
  )
}

it('shows the error and no success mark when the save is not confirmed', async () => {
  renderProfile()
  fireEvent.change(screen.getByDisplayValue('Horizontal (Classic)'), { target: { value: 'mixed' } })
  await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith(NOT_CONFIRMED))
  expect(String(fetchMock.mock.calls[0][0])).toContain('/api/WFUserProfile')
  expect(screen.queryByText('Preferences updated')).toBeNull()
})

it('still shows the success mark for a confirmed save', async () => {
  fetchMock.mockImplementation(async (url: string) => new Response(
    String(url).includes('/api/WFUserProfile?')
      ? '{"data":[]}'
      : '{"data":{"id":"5","type":"WFUserProfile","attributes":{}}}',
    { status: 201 },
  ))
  renderProfile()
  fireEvent.change(screen.getByDisplayValue('Horizontal (Classic)'), { target: { value: 'mixed' } })
  await screen.findByText('Preferences updated')
  expect(mocks.toastError).not.toHaveBeenCalled()
})
