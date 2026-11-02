import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PrelimDashboardContent } from './PrelimDashboardContent'

const state = vi.hoisted(() => ({ isRefreshing: false, isError: false }))

vi.mock('@/features/prelim/hooks/usePrelimDashboardState', () => ({
  usePrelimDashboardState: () => ({
    q: '', status: 'all', applicationId: undefined, applications: [], paginationMode: 'paged',
    page: 0, totalCount: 3, totalPages: 1, isRefreshing: state.isRefreshing,
    isLoading: false, isError: state.isError, error: new Error('FIX-fu list failure'),
    hasNextPage: false, isFetchingNextPage: false,
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

const list = () => screen.getByTestId('prelim-application-list')

describe('Intake dashboard stale results', () => {
  beforeEach(() => {
    state.isRefreshing = false
    state.isError = false
  })

  it('shows "Updating results..." and dims the list while a new filter loads', () => {
    state.isRefreshing = true
    render(<PrelimDashboardContent />)
    expect(screen.getByRole('status').textContent).toContain('Updating results...')
    expect(list().getAttribute('aria-busy')).toBe('true')
    expect(list().className).toContain('pointer-events-none')
  })

  it('shows no refresh signal for current results', () => {
    render(<PrelimDashboardContent />)
    expect(screen.queryByRole('status')).toBeNull()
    expect(list().getAttribute('aria-busy')).toBeNull()
    expect(list().className).not.toContain('opacity-50')
  })

  it('shows the error rather than the refresh signal when loading failed', () => {
    state.isRefreshing = true
    state.isError = true
    render(<PrelimDashboardContent />)
    expect(screen.queryByRole('status')).toBeNull()
  })
})
