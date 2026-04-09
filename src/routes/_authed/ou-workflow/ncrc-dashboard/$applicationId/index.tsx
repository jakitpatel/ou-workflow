import { createFileRoute, redirect } from '@tanstack/react-router'
import { getAccessToken } from '@/auth/authService'
import { RouteErrorView } from '@/components/feedback/RouteErrorView'
import { getApplicationDetailQueryOptions } from '@/features/applications/hooks/useApplicationDetail'
import { ApplicationDetailScreen } from '@/features/applications/screens/ApplicationDetailScreen'
import { appQueryClient } from '@/shared/api/queryClient'

export const Route = createFileRoute('/_authed/ou-workflow/ncrc-dashboard/$applicationId/')({
  loader: async ({ params }) => {
    const token = getAccessToken()
    if (!token) {
      throw redirect({ to: '/login' })
    }

    return appQueryClient.ensureQueryData(
      getApplicationDetailQueryOptions({
        applicationId: params.applicationId,
        token,
      }),
    )
  },
  pendingComponent: () => <div className="p-8">Loading application...</div>,
  component: ApplicationDetailPage,
  errorComponent: ApplicationDetailRouteError,
})

function ApplicationDetailPage() {
  const data = Route.useLoaderData()

  return <ApplicationDetailScreen application={data} />
}

function ApplicationDetailRouteError({
  error,
  reset,
}: {
  error: unknown
  reset?: () => void
}) {
  return (
    <RouteErrorView
      error={error}
      reset={reset}
      title="Application details could not be loaded"
      description="The application detail view failed to load. You can retry without leaving the current route."
    />
  )
}
