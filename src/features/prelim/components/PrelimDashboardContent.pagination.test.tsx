import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PRELIM_DASHBOARD_PAGE_SIZE } from '@/features/applications/lib/pagination'
import { PrelimDashboardContent } from './PrelimDashboardContent'

const state = vi.hoisted(() => ({ page: 0, totalCount: 0 }))

vi.mock('@/features/prelim/hooks/usePrelimDashboardState', () => ({
  usePrelimDashboardState: () => ({
    q: '', status: 'all', applicationId: undefined, applications: [], paginationMode: 'paged',
    page: state.page, totalCount: state.totalCount, totalPages: 0,
    isLoading: false, isError: false, error: null, hasNextPage: false, isFetchingNextPage: false,
    sentinelRef: { current: null }, handleFirst: vi.fn(), handlePrev: vi.fn(), handleNext: vi.fn(),
    handleLast: vi.fn(), expandedTaskPanel: null, setExpandedTaskPanel: vi.fn(), selectedId: null,
    setSelectedId: vi.fn(), applicationDetails: null, isDetailsLoading: false,
    applicationDetailsError: null, updateSearch: vi.fn(), handleTaskAction: vi.fn(),
    handleCancelTask: vi.fn(), showActionModal: null, setShowActionModal: vi.fn(),
    showConditionModal: null, setShowConditionModal: vi.fn(), selectedAction: null,
    executeAction: vi.fn(), errorDialogRef: { current: null },
  }),
}))
vi.mock('@/features/tasks/notes/useTaskNotesDrawerState', () => ({
  useTaskNotesDrawerState: () => ({
    drawer: null,
    activeNotes: { incoming: [], outgoing: [], mention: [], private: [] },
    activeLoading: { incoming: false, outgoing: false, mention: false, private: false },
    openDrawer: vi.fn(),
    closeDrawer: vi.fn(),
  }),
}))
vi.mock('@/context/UserContext', () => ({ useUser: () => ({ username: 'tester' }) }))
vi.mock('@/components/layout/PageShell', () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock('@/features/prelim/components/PrelimDashboardFilters', () => ({ PrelimDashboardFilters: () => null }))
vi.mock('@/features/prelim/components/PrelimDashboardList', () => ({ PrelimDashboardList: () => null }))
vi.mock('@/features/prelim/components/PrelimApplicationDetailsDrawer', () => ({
  PrelimApplicationDetailsDrawer: () => null,
}))
vi.mock('@/features/tasks/modals/ActionModal', () => ({ ActionModal: () => null }))
vi.mock('@/features/tasks/modals/ConditionalModal', () => ({ ConditionalModal: () => null }))
vi.mock('@/features/tasks/notes/TaskNotesDrawer', () => ({ TaskNotesDrawer: () => null }))
vi.mock('@/components/ErrorDialog', () => ({ ErrorDialog: () => null }))

const button = (name: string) => screen.getByRole('button', { name }) as HTMLButtonElement

describe('Intake dashboard pagination (F4)', () => {
  beforeEach(() => {
    state.page = 0
    state.totalCount = 0
  })

  it('summarises 7 intake applications on one page', () => {
    state.totalCount = 7
    const { container } = render(<PrelimDashboardContent />)
    expect(container.textContent).toContain('Showing 1-7 of 7 applications')
    expect(container.textContent).toContain('Page 1 of 1')
    expect(button('Next').disabled).toBe(true)
    expect(button('Last').disabled).toBe(true)
  })

  it('pages by the size the intake hook fetches', () => {
    state.totalCount = PRELIM_DASHBOARD_PAGE_SIZE * 2 + 1
    state.page = PRELIM_DASHBOARD_PAGE_SIZE
    const { container } = render(<PrelimDashboardContent />)
    expect(container.textContent).toContain(
      `Showing ${PRELIM_DASHBOARD_PAGE_SIZE + 1}-${PRELIM_DASHBOARD_PAGE_SIZE * 2} of`,
    )
    expect(container.textContent).toContain('Page 2 of 3')
    expect(button('Next').disabled).toBe(false)
  })

  it('shows an empty result as 0-0 and Page 0 of 0', () => {
    const { container } = render(<PrelimDashboardContent />)
    expect(container.textContent).toContain('Showing 0-0 of 0 applications')
    expect(container.textContent).toContain('Page 0 of 0')
  })
})
