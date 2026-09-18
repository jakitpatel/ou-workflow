import { createFileRoute } from '@tanstack/react-router'
import { getAccessToken } from '@/auth/authService'
import { RouteErrorView } from '@/components/feedback/RouteErrorView'
import { getApplicationDetailQueryOptions } from '@/features/applications/hooks/useApplicationDetail'
import { ApplicationDetailScreen } from '@/features/applications/screens/ApplicationDetailScreen'
import { appQueryClient } from '@/shared/api/queryClient'

export const Route = createFileRoute('/_authed/ou-workflow/rfr-dashboard/$applicationId')({
  loader: ({ params }) => appQueryClient.ensureQueryData(
    getApplicationDetailQueryOptions({ applicationId: params.applicationId, token: getAccessToken() }),
  ),
  pendingComponent: () => <div className="p-8">Loading application...</div>,
  errorComponent: ({ error, reset }) => (
    <RouteErrorView error={error} reset={reset} title="Application details could not be loaded" />
  ),
  component: RfrApplicationPage,
})

function RfrApplicationPage() {
  const application = Route.useLoaderData()
  const { applicationId } = Route.useParams()
  return <ApplicationDetailScreen application={application} applicationId={applicationId} rfrView />
}
