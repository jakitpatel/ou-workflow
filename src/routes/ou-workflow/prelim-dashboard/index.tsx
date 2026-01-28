import { createFileRoute } from '@tanstack/react-router'
import { PrelimDashboard } from '@/components/ou-workflow/PrelimDashboard'

export const Route = createFileRoute('/ou-workflow/prelim-dashboard/')({
  component: PrelimDashboard,
})