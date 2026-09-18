import { render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { Route } from '@/routes/_authed/profile'
import { getStoredRfrRedirect } from '@/features/auth/model/rfrAccess'

vi.mock('@/context/UserContext', () => ({
  useUser: () => ({
    username: 'RFR.User', email: 'rfr@example.com', role: 'ALL',
    roles: [{ name: 'NCRC' }, { name: 'RFR' }], setRole: vi.fn(),
  }),
}))
vi.mock('@/context/AppPreferencesContext', () => ({
  useAppPreferences: () => ({
    apiBaseUrl: '', stageLayout: 'horizontal', paginationMode: 'paged', navigationMenuType: 'left',
  }),
}))
vi.mock('@/features/profile/hooks/useSaveProfileLayoutMutation', () => ({
  useSaveProfileLayoutMutation: () => ({ mutate: vi.fn(), isPending: false }),
}))

beforeEach(() => sessionStorage.clear())
const ProfilePage = Route.options.component!

it('hides role switching on Profile after entering the RFR application', () => {
  getStoredRfrRedirect('/ou-workflow/rfr-dashboard/421')
  render(<ProfilePage />)
  expect(screen.queryByRole('combobox', { name: 'Select user role' })).toBeNull()
  expect(screen.getByText('RFR application access is active for this session.')).toBeTruthy()
})

it('keeps role selection available for ordinary staff sessions', () => {
  render(<ProfilePage />)
  expect(screen.getByRole('combobox', { name: 'Select user role' })).toBeTruthy()
})
