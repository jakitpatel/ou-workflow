import { createFileRoute } from '@tanstack/react-router'

type PrelimDashboardSearch = {
  q: string
  status: string
  page: number
}

export const Route = createFileRoute('/_authed/ou-workflow/prelim-dashboard/')({
  validateSearch: (search): PrelimDashboardSearch => {
    return {
      q: typeof search.q === 'string' ? search.q : '',
      status: typeof search.status === 'string' ? search.status : 'all',
      page: Number.isFinite(Number(search.page)) ? Number(search.page) : 0,
    }
  },
})
