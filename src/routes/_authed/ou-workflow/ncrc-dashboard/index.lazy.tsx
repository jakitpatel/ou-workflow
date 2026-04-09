import { createLazyFileRoute } from '@tanstack/react-router'
import { NcrcDashboardScreen } from '@/features/applications/screens/NcrcDashboardScreen'

export const Route = createLazyFileRoute('/_authed/ou-workflow/ncrc-dashboard/')({
  component: NcrcDashboardScreen,
})
