import { Outlet, createFileRoute } from '@tanstack/react-router'
import { normalizeTaskApplicationId } from '@/features/tasks/model/applicationIdFilter'

export const Route = createFileRoute('/_authed/ou-workflow/tasks-dashboard')({
  validateSearch: (search) => ({
    ...(normalizeTaskApplicationId(search.applicationId) === undefined
      ? {}
      : { applicationId: normalizeTaskApplicationId(search.applicationId) }),
    qs: typeof search.qs === 'string' ? search.qs : '',
    days:
      search.days === 'pending' || search.days === 7 || search.days === '7'
        ? search.days === '7'
          ? 7
          : search.days
        : search.days === 30 || search.days === '30'
          ? 30
        : 'pending',
    page: Number.isFinite(Number(search.page)) ? Math.max(0, Number(search.page)) : 0,
  }),
  component: Outlet,
})
