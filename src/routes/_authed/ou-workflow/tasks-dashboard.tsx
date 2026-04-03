import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/ou-workflow/tasks-dashboard')({
  validateSearch: (search) => ({
    qs: typeof search.qs === 'string' ? search.qs : '',
    days:
      search.days === 'pending' || search.days === 7 || search.days === 30
        ? search.days
        : 'pending',
  }),
  component: Outlet,
})
