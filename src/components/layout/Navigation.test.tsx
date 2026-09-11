import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LeftNavigation, Navigation } from './Navigation'

const { logout, navigate } = vi.hoisted(() => ({ logout: vi.fn(), navigate: vi.fn() }))

vi.mock('@/context/UserContext', () => ({
  useUser: () => ({ username: 'Test user', role: 'ALL', logout }),
}))
vi.mock('@/context/AppPreferencesContext', () => ({
  useAppPreferences: () => ({ apiBaseUrl: 'https://dev.example.com' }),
}))
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  useRouterState: () => '/',
  useNavigate: () => navigate,
}))

beforeEach(() => vi.clearAllMocks())

describe('navigation sign-out', () => {
  it.each(['top', 'left'] as const)('lets Cognito complete logout without mounting login in the %s layout', (layout) => {
    render(layout === 'top' ? <Navigation /> : <LeftNavigation collapsed={false} onCollapsedChange={vi.fn()} />)
    if (layout === 'top') fireEvent.click(screen.getByRole('button', { name: 'User menu' }))
    fireEvent.click(screen.getByRole(layout === 'top' ? 'menuitem' : 'button', { name: /sign out/i }))
    expect(logout).toHaveBeenCalledTimes(1)
    expect(navigate).not.toHaveBeenCalled()
  })
})
