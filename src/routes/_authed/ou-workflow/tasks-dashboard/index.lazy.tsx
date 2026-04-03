import { createLazyFileRoute } from '@tanstack/react-router'
import { TaskDashboard } from '@/components/ou-workflow/TaskDashboard'

export const Route = createLazyFileRoute('/_authed/ou-workflow/tasks-dashboard/')({
  component: TaskDashboard,
})
