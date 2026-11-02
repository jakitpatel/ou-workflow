import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { PRELIM_DASHBOARD_PAGE_SIZE } from '@/features/applications/lib/pagination'
import { usePrelimDashboardState } from './usePrelimDashboardState'

// Guards F4: the Intake pagination controls use PRELIM_DASHBOARD_PAGE_SIZE, so the hook must
// fetch pages of the same size.
const mocks = vi.hoisted(() => ({ paged: vi.fn(), infinite: vi.fn() }))

vi.mock('@/routes/_authed/ou-workflow/prelim-dashboard', () => ({
  Route: {
    useSearch: () => ({ q: '', status: 'all', page: 0 }),
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
  usePrelimApplications: (args: unknown) => {
    mocks.paged(args)
    return { data: { data: [], meta: { total_count: 0 } }, isLoading: false, isError: false, error: null }
  },
  useInfinitePrelimApplications: (args: unknown) => {
    mocks.infinite(args)
    return { data: undefined, isLoading: false, isError: false, error: null, hasNextPage: false }
  },
}))

function Harness() {
  usePrelimDashboardState()
  return null
}

it('fetches Intake pages of PRELIM_DASHBOARD_PAGE_SIZE rows', () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Harness />
    </QueryClientProvider>,
  )
  expect(mocks.paged).toHaveBeenCalledWith(expect.objectContaining({ limit: PRELIM_DASHBOARD_PAGE_SIZE }))
  expect(mocks.infinite).toHaveBeenCalledWith(expect.objectContaining({ limit: PRELIM_DASHBOARD_PAGE_SIZE }))
})
