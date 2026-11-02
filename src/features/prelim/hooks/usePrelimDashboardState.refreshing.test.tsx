import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { PRELIM_DASHBOARD_PAGE_SIZE } from '@/features/applications/lib/pagination'
import { usePrelimDashboardState } from './usePrelimDashboardState'

// Intake list: keepPreviousData keeps the last result on screen while a new filter loads, so the
// hook must flag it (as the NCRC dashboard does) for the UI to show "Updating results...".
const state = vi.hoisted(() => ({ q: '', isPlaceholderData: false }))

vi.mock('@/routes/_authed/ou-workflow/prelim-dashboard', () => ({
  Route: {
    useSearch: () => ({ q: state.q, status: 'all', page: 0 }),
    useNavigate: () => vi.fn(),
  },
}))
vi.mock('@/context/UserContext', () => ({ useUser: () => ({ token: 'token', username: 'tester' }) }))
vi.mock('@/context/AppPreferencesContext', () => ({ useAppPreferences: () => ({ paginationMode: 'paged' }) }))
vi.mock('@/hooks/useSSE', () => ({ useSSE: vi.fn() }))
vi.mock('@/features/tasks/hooks/useTaskActions', () => ({
  useTaskActions: () => ({
    executeAction: vi.fn(),
    completeTaskWithResult: vi.fn(),
    resolveSelectedAction: vi.fn(),
  }),
}))
vi.mock('@/features/prelim/hooks/usePrelimApplications', () => ({
  usePrelimApplications: () => ({
    data: { data: [], meta: { total_count: 0 } },
    isLoading: false,
    isError: false,
    error: null,
    isPlaceholderData: state.isPlaceholderData,
  }),
  useInfinitePrelimApplications: () => ({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    hasNextPage: false,
  }),
}))

let latest: ReturnType<typeof usePrelimDashboardState>
function Harness() {
  latest = usePrelimDashboardState()
  return null
}
const renderHarness = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Harness />
    </QueryClientProvider>,
  )

beforeEach(() => {
  state.q = ''
  state.isPlaceholderData = false
})

it('uses the shared Intake page size', () => {
  renderHarness()
  expect(latest.pageSize).toBe(PRELIM_DASHBOARD_PAGE_SIZE)
})

it('is not refreshing when the shown rows belong to the current filter', () => {
  renderHarness()
  expect(latest.isRefreshing).toBe(false)
})

it('flags placeholder (previous filter) rows as refreshing', () => {
  state.isPlaceholderData = true
  renderHarness()
  expect(latest.isRefreshing).toBe(true)
})

it('flags rows as refreshing while a typed search is still debouncing', () => {
  const view = renderHarness()
  state.q = 'FIX-fu search'
  view.rerender(
    <QueryClientProvider client={new QueryClient()}>
      <Harness />
    </QueryClientProvider>,
  )
  expect(latest.isRefreshing).toBe(true)
})
