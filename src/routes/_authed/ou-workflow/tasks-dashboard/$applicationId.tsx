import { createFileRoute, redirect } from '@tanstack/react-router'
import { getAccessToken } from '@/auth/authService'
import { getTasksQueryOptions } from '@/features/tasks/hooks/useTaskQueries'
import { TaskDashboardScreen } from '@/features/tasks/screens/TaskDashboardScreen'
import { appQueryClient } from '@/shared/api/queryClient'

const normalizeTaskSearch = (search: Record<string, unknown>) => ({
  qs: typeof search.qs === 'string' ? search.qs : '',
  days:
    search.days === 'pending' || search.days === 7 || search.days === 30
      ? search.days
      : 'pending',
})

export const Route = createFileRoute(
  '/_authed/ou-workflow/tasks-dashboard/$applicationId',
)({
  loaderDeps: ({ search }) => normalizeTaskSearch(search as Record<string, unknown>),
  loader: async ({ params, deps }) => {
    const token = getAccessToken()
    if (!token) {
      throw redirect({ to: '/login' })
    }

    return appQueryClient.ensureQueryData(
      getTasksQueryOptions({
        applicationId: params.applicationId,
        searchTerm: deps.qs,
        daysFilter: deps.days,
        token,
      }),
    )
  },
  pendingComponent: () => <div className="p-8">Loading tasks...</div>,
  component: TaskDashboardScreen,
})
