import { createLazyFileRoute } from '@tanstack/react-router'
import { PrelimDashboardScreen } from '@/features/prelim/screens/PrelimDashboardScreen'

export const Route = createLazyFileRoute('/_authed/ou-workflow/prelim-dashboard/')({
  component: PrelimDashboardScreen,
})
