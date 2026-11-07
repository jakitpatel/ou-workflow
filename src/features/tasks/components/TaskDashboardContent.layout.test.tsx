import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TaskDashboardContent } from './TaskDashboardContent'

const preferences = vi.hoisted(() => ({ navigationMenuType: 'top' as 'top' | 'left' }))
vi.mock('@/context/AppPreferencesContext', () => ({ useAppPreferences: () => preferences }))
// The screen's state is irrelevant here: drawers are closed, everything else reads as undefined
// (so not loading and no error).
vi.mock('@/features/tasks/hooks/useTaskDashboardState', () => ({
  useTaskDashboardState: () =>
    new Proxy({}, { get: (_, key) => (String(key).endsWith('State') ? { open: false } : undefined) }),
}))
vi.mock('./TaskDashboardHeader', () => ({ TaskDashboardHeader: () => <div data-testid="header" /> }))
vi.mock('./TaskDashboardTable', () => ({ TaskDashboardTable: () => <div data-testid="table" /> }))
vi.mock('./PlantHistoryModal', () => ({ PlantHistoryModal: () => null }))
vi.mock('./TaskPrelimResolutionDrawer', () => ({ TaskPrelimResolutionDrawer: () => null }))
vi.mock('@/components/ErrorDialog', () => ({ ErrorDialog: () => null }))
vi.mock('@/features/tasks/modals/ActionModal', () => ({ ActionModal: () => null }))
vi.mock('@/features/tasks/modals/ConditionalModal', () => ({ ConditionalModal: () => null }))
vi.mock('@/features/tasks/modals/UploadNdaModal', () => ({ UploadNdaModal: () => null }))
vi.mock('@/features/applications/components/CertificationStageDrawer', () => ({ CertificationStageDrawer: () => null }))
vi.mock('@/features/applications/components/ExternalVisitWaitDialog', () => ({ ExternalVisitWaitDialog: () => null }))
vi.mock('@/features/applications/components/ContractStageDrawer', () => ({ ContractStageDrawer: () => null }))
vi.mock('@/features/applications/components/InspectionAssignmentDrawer', () => ({ InspectionAssignmentDrawer: () => null }))
vi.mock('@/features/applications/components/InspectionInvoiceDrawer', () => ({ InspectionInvoiceDrawer: () => null }))
vi.mock('@/features/applications/components/InspectionVisitDateDrawer', () => ({ InspectionVisitDateDrawer: () => null }))
vi.mock('@/features/applications/components/ScheduleAIngredientsDrawer', () => ({ ScheduleAIngredientsDrawer: () => null }))
vi.mock('@/features/applications/components/ScheduleBProductsDrawer', () => ({ ScheduleBProductsDrawer: () => null }))

// PageShell's outer element: the header's grandparent (header -> column -> shell).
const shell = () => screen.getByTestId('header').parentElement!.parentElement!

describe('Tasks & Notifications page height', () => {
  it.each([
    ['top', 'h-[calc(100dvh-4rem)]'],
    ['left', 'h-dvh'],
  ] as const)('with the %s menu, fills exactly the visible height so the page itself does not scroll', (menu, height) => {
    preferences.navigationMenuType = menu
    render(<TaskDashboardContent />)
    expect(shell().classList.contains(height)).toBe(true)
    expect(shell().classList.contains('min-h-screen')).toBe(false)
    // Header and table share a flex column, so the table can take the remaining height.
    expect(screen.getByTestId('header').parentElement!.className).toContain('flex-col')
    expect(screen.getByTestId('table').parentElement).toBe(screen.getByTestId('header').parentElement)
  })
})
