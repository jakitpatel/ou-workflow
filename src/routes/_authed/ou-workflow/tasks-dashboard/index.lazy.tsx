import { createLazyFileRoute } from '@tanstack/react-router'
import { TaskDashboardScreen } from '@/features/tasks/screens/TaskDashboardScreen'

export const Route = createLazyFileRoute('/_authed/ou-workflow/tasks-dashboard/')({
  component: TaskDashboardScreen,
})
