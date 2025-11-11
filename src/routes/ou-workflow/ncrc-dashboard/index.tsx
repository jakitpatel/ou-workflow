import { createFileRoute } from '@tanstack/react-router'
import { NCRCDashboard } from '@/components/ou-workflow/NCRCDashboard'

export const Route = createFileRoute('/ou-workflow/ncrc-dashboard/')({
  component: NcrcDashboardWrapper,
})

function NcrcDashboardWrapper() {
  return (
    <NCRCDashboard />
  )
}
