import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HomePage } from './HomePage'

const user = vi.hoisted(() => ({
  username: 'Tester', role: 'MIS', roles: [{ name: 'MIS' }],
}))
vi.mock('@/context/UserContext', () => ({ useUser: () => user }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock('@/components/layout/PageShell', () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock('@/features/applications/components/DashboardAppDialog', () => ({
  default: () => <div data-testid="management-dialog" />,
}))

afterEach(cleanup)
describe('home dashboard management', () => {
  it.each(['MIS', 'ALL'])('shows management for %s with MIS access', (role) => {
    user.role = role
    user.roles = [{ name: 'MIS' }]
    render(<HomePage />)
    expect(screen.getByText('Dashboard Management')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Delete Dashboard App' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Create Intake Application' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Create Dashboard App' }))
    expect(screen.getByTestId('management-dialog')).toBeTruthy()
  })

  it.each(['NCRC', 'DISPATCH', 'ALL'])('hides management for %s without MIS access', (role) => {
    user.role = role
    user.roles = [{ name: 'NCRC' }]
    render(<HomePage />)
    expect(screen.queryByText('Dashboard Management')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Create Dashboard App' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Delete Dashboard App' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Create Intake Application' })).toBeNull()
    expect(screen.queryByTestId('management-dialog')).toBeNull()
    expect(screen.getByText('Application Dashboard')).toBeTruthy()
  })

  it('hides an open dialog when the active role loses access', () => {
    user.role = 'MIS'
    user.roles = [{ name: 'MIS' }]
    const { rerender } = render(<HomePage />)
    fireEvent.click(screen.getByRole('button', { name: 'Create Dashboard App' }))
    user.role = 'NCRC'
    rerender(<HomePage />)
    expect(screen.queryByTestId('management-dialog')).toBeNull()
  })
})
