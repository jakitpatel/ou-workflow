import { createFileRoute } from '@tanstack/react-router'
import { TaskDashboard } from '@/components/ou-workflow/TaskDashboard'

export const Route = createFileRoute('/ou-workflow/tasks-dashboard/$applicationId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { applicationId } = Route.useParams()

  return <TaskDashboard applicationId={applicationId} />
}