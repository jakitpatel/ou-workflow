import { createFileRoute } from '@tanstack/react-router'
import { NCRCDashboard } from '@/components/ou-workflow/NCRCDashboard'

type DashboardSearch = {
  q: string
  status: string
  priority: string
  page: number
  applicationId?: number
}

export const Route = createFileRoute('/ou-workflow/ncrc-dashboard/')({
  validateSearch: (search): DashboardSearch => {
    return {
      q: typeof search.q === 'string' ? search.q : '',
      status: typeof search.status === 'string' ? search.status : 'all',
      priority: typeof search.priority === 'string' ? search.priority : 'all',
      page: Number.isFinite(Number(search.page)) ? Number(search.page) : 0,
      applicationId: search.applicationId ? Number(search.applicationId) : undefined,
    }
  },
  component: NCRCDashboard,
})
