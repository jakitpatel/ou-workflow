import { createLazyFileRoute } from '@tanstack/react-router'
import { NCRCDashboard } from '@/components/ou-workflow/NCRCDashboard'

export const Route = createLazyFileRoute('/_authed/ou-workflow/ncrc-dashboard/')({
  component: NCRCDashboard,
})
