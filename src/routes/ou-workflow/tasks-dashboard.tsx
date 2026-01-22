// routes/ou-workflow/tasks-dashboard.tsx (or _tasks-dashboard.tsx)
import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/ou-workflow/tasks-dashboard')({
  validateSearch: (search) => ({
    qs: typeof search.qs === 'string' ? search.qs : '',
    days:
      search.days === 'pending' || search.days === 7 || search.days === 30
        ? search.days
        : 'pending',
  }),
  component: Outlet,
})