import { createLazyFileRoute } from '@tanstack/react-router'
import { PrelimDashboard } from '@/components/ou-workflow/PrelimDashboard'

export const Route = createLazyFileRoute('/_authed/ou-workflow/prelim-dashboard/')({
  component: PrelimDashboard,
})
