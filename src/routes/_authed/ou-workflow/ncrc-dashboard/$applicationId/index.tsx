import { createFileRoute, redirect } from '@tanstack/react-router'
import { getAccessToken } from '@/auth/authService'
import { ApplicationManagementInterface } from '@/components/ou-workflow/ApplicationManagement'
import { getApplicationDetailQueryOptions } from '@/features/applications/hooks/useApplicationDetail'
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
})

function ApplicationDetailPage() {
  const data = Route.useLoaderData()

  return <ApplicationManagementInterface application={data} />
}
