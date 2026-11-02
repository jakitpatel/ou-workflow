import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useNcrcDashboardState } from './useNcrcDashboardState'
import { NCRC_DASHBOARD_PAGE_SIZE } from '@/features/applications/lib/pagination'

const mocks = vi.hoisted(() => ({
  paged: vi.fn(),
  infinite: vi.fn(),
  paginationMode: 'paged' as 'paged' | 'infinite',
  pagedResult: {} as Record<string, unknown>,
}))

vi.mock('@/context/UserContext', () => ({ useUser: () => ({ token: 'token', username: 'tester' }) }))
vi.mock('@/context/AppPreferencesContext', () => ({
  useAppPreferences: () => ({ paginationMode: mocks.paginationMode }),
}))
vi.mock('@/hooks/useSSE', () => ({ useSSE: vi.fn() }))
vi.mock('@/features/tasks/api', () => ({
  fetchMyMessages: vi.fn(), markTaskNoteAsRead: vi.fn(), updateTaskNoteTag: vi.fn(),
}))
vi.mock('@/features/tasks/hooks/useTaskMutations', () => ({
  useCreateTaskNoteMutation: () => ({ isPending: false, mutateAsync: vi.fn() }),
}))
vi.mock('@/features/applications/hooks/usePagedApplications', () => ({
  usePagedApplications: (args: unknown) => {
    mocks.paged(args)
    return mocks.pagedResult
  },
}))
vi.mock('@/features/applications/hooks/useInfiniteApplications', () => ({
  useInfiniteApplications: (args: unknown) => {
    mocks.infinite(args)
    return { isLoading: false, isError: false, error: null, data: undefined, hasNextPage: false }
  },
}))

type Search = Parameters<typeof useNcrcDashboardState>[0]['search']
let latest: ReturnType<typeof useNcrcDashboardState>

function Harness({ search, navigate }: { search: Search; navigate: () => void }) {
  latest = useNcrcDashboardState({ search, navigate })
  return null
}

const baseSearch: Search = { q: '', status: 'all', priority: 'all', page: 0, myOnly: false }

const renderState = (search: Partial<Search> = {}) => {
  const navigate = vi.fn()
  const client = new QueryClient()
  const view = render(
    <QueryClientProvider client={client}>
      <Harness search={{ ...baseSearch, ...search }} navigate={navigate} />
    </QueryClientProvider>,
  )
  const rerender = (next: Partial<Search>) =>
    view.rerender(
      <QueryClientProvider client={client}>
        <Harness search={{ ...baseSearch, ...next }} navigate={navigate} />
      </QueryClientProvider>,
    )
  return { navigate, rerender }
}

describe('useNcrcDashboardState filters and paging', () => {
  beforeEach(() => {
    mocks.paged.mockReset()
    mocks.infinite.mockReset()
    mocks.paginationMode = 'paged'
    mocks.pagedResult = {
      isLoading: false, isError: false, error: null, isPlaceholderData: false,
      data: { data: [], meta: { total_count: 120 } },
    }
  })

  it('fetches with the shared page size and reports it to the controls (F4)', () => {
    renderState()
    expect(mocks.paged).toHaveBeenLastCalledWith(expect.objectContaining({ limit: NCRC_DASHBOARD_PAGE_SIZE }))
    expect(latest.pageSize).toBe(NCRC_DASHBOARD_PAGE_SIZE)
    expect(latest.totalPages).toBe(3)
  })

  it('keeps a non-zero page instead of resetting it on every page change (F4)', () => {
    const { navigate, rerender } = renderState()
    latest.handleNext()
    expect(navigate).toHaveBeenCalledTimes(1)
    rerender({ page: 50 })
    expect(navigate).toHaveBeenCalledTimes(1)
    expect(mocks.paged).toHaveBeenLastCalledWith(expect.objectContaining({ page: 50 }))
  })

  it.each([
    ['urgent', 'CRITICAL'],
    ['medium', 'NORMAL'],
    ['high', 'HIGH'],
    ['CRITICAL', 'CRITICAL'],
    ['all', 'all'],
  ])('sends priority %s as the WF_Priorities code %s (F9)', (priority, expected) => {
    renderState({ priority })
    expect(mocks.paged).toHaveBeenLastCalledWith(expect.objectContaining({ priorityFilter: expected }))
    expect(latest.priority).toBe(expected)
  })

  it('flags previous results shown while a new filter loads (F11)', () => {
    mocks.pagedResult = { ...mocks.pagedResult, isPlaceholderData: true }
    renderState({ status: 'NEW' })
    expect(latest.isRefreshing).toBe(true)
  })

  it('flags results as stale while a typed search is still debouncing (F11)', () => {
    const { rerender } = renderState({ q: 'company' })
    expect(latest.isRefreshing).toBe(false)
    rerender({ q: 'chaos-slow' })
    expect(latest.isRefreshing).toBe(true)
  })

  it('does not flag fresh results (F11)', () => {
    renderState()
    expect(latest.isRefreshing).toBe(false)
  })
})
