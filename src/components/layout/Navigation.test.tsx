import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LeftNavigation, Navigation } from './Navigation'
import { getStoredRfrRedirect } from '@/features/auth/model/rfrAccess'

const { logout, navigate } = vi.hoisted(() => ({ logout: vi.fn(), navigate: vi.fn() }))
const session = vi.hoisted(() => ({ role: 'ALL', roles: [] as Array<{ name: string }>, pathname: '/' }))

vi.mock('@/context/UserContext', () => ({
  useUser: () => ({ username: 'Test user', role: session.role, roles: session.roles, logout }),
}))
vi.mock('@/context/AppPreferencesContext', () => ({
  useAppPreferences: () => ({ apiBaseUrl: 'https://dev.example.com' }),
}))
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, search: _search, ...props }: { children: ReactNode; to: string; params?: { applicationId: string }; search?: unknown }) => (
    <a href={to.replace('$applicationId', params?.applicationId ?? '')} {...props}>{children}</a>
  ),
  useRouterState: () => session.pathname,
  useNavigate: () => navigate,
}))

beforeEach(() => {
  sessionStorage.clear()
  vi.clearAllMocks()
  session.role = 'ALL'
  session.roles = []
  session.pathname = '/'
})

describe('navigation sign-out', () => {
  it.each([false, true])('links back to the saved RFR application above Profile (collapsed: %s)', (collapsed) => {
    getStoredRfrRedirect('/ou-workflow/rfr-dashboard/421')
    session.pathname = '/profile'
    const view = render(<LeftNavigation collapsed={collapsed} onCollapsedChange={vi.fn()} />)
    const link = screen.getByRole('link', { name: 'Application Details' })
    expect(link.getAttribute('href')).toBe('/ou-workflow/rfr-dashboard/421')
    expect(link.nextElementSibling?.getAttribute('href')).toBe('/profile')
    expect(link.getAttribute('aria-current')).toBeNull()
    expect(screen.queryByText('Application Dashboard')).toBeNull()
    session.pathname = '/ou-workflow/rfr-dashboard/421'
    view.rerender(<LeftNavigation collapsed={collapsed} onCollapsedChange={vi.fn()} />)
    expect(screen.getByRole('link', { name: 'Application Details' }).getAttribute('aria-current')).toBe('page')
  })
  it.each(['top', 'left'] as const)('retains restricted menus on Profile after opening an RFR link in the %s layout', (layout) => {
    session.roles = [{ name: 'NCRC' }, { name: 'RFR' }]
    sessionStorage.setItem('user', JSON.stringify(session))
    getStoredRfrRedirect('/ou-workflow/rfr-dashboard/421')
    session.pathname = '/profile'
    render(layout === 'top' ? <Navigation /> : <LeftNavigation collapsed={false} onCollapsedChange={vi.fn()} />)
    expect(screen.queryByText('Application Dashboard')).toBeNull()
    expect(screen.queryByText('Application Intake')).toBeNull()
    expect(screen.queryByText('Tasks & Notifications')).toBeNull()
    if (layout === 'top') fireEvent.click(screen.getByRole('button', { name: 'User menu' }))
    expect(screen.getByText('Profile')).toBeTruthy()
    expect(screen.getByRole(layout === 'top' ? 'menuitem' : 'button', { name: /sign out/i })).toBeTruthy()
  })
  it.each(['top', 'left'] as const)('hides staff menus for an RFR-only account in the %s layout', (layout) => {
    session.roles = [{ name: 'RFR' }]
    render(layout === 'top' ? <Navigation /> : <LeftNavigation collapsed={false} onCollapsedChange={vi.fn()} />)
    expect(screen.queryByText('Application Dashboard')).toBeNull()
    expect(screen.queryByText('Application Intake')).toBeNull()
    expect(screen.queryByText('Tasks & Notifications')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Notifications' })).toBeNull()
    if (layout === 'top') fireEvent.click(screen.getByRole('button', { name: 'User menu' }))
    expect(screen.getByText('Profile')).toBeTruthy()
    expect(screen.getByRole(layout === 'top' ? 'menuitem' : 'button', { name: /sign out/i })).toBeTruthy()
  })

  it('restricts the dedicated RFR view even when staff opens it', () => {
    session.pathname = '/ou-workflow/rfr-dashboard/421'
    render(<LeftNavigation collapsed={false} onCollapsedChange={vi.fn()} />)
    expect(screen.queryByText('Application Dashboard')).toBeNull()
    expect(screen.getByText('Profile')).toBeTruthy()
  })

  it('preserves staff dashboard navigation', () => {
    render(<LeftNavigation collapsed={false} onCollapsedChange={vi.fn()} />)
    expect(screen.getByText('Application Dashboard')).toBeTruthy()
    expect(screen.getByText('Application Intake')).toBeTruthy()
    expect(screen.getByText('Tasks & Notifications')).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Application Details' })).toBeNull()
  })
  it.each(['top', 'left'] as const)('lets Cognito complete logout without mounting login in the %s layout', (layout) => {
    render(layout === 'top' ? <Navigation /> : <LeftNavigation collapsed={false} onCollapsedChange={vi.fn()} />)
    if (layout === 'top') fireEvent.click(screen.getByRole('button', { name: 'User menu' }))
    fireEvent.click(screen.getByRole(layout === 'top' ? 'menuitem' : 'button', { name: /sign out/i }))
    expect(logout).toHaveBeenCalledTimes(1)
    expect(navigate).not.toHaveBeenCalled()
  })
})
