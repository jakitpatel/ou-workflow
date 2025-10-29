import { createFileRoute } from '@tanstack/react-router'
import { TaskDashboard } from '@/components/ou-workflow/TaskDashboard'
export const Route = createFileRoute('/ou-workflow/tasks-dashboard/')({
  component: TaskDashboard,
})