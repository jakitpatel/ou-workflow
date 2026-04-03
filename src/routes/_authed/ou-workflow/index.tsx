import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/ou-workflow/')({
  validateSearch: () => ({}),

  beforeLoad: () => {
    throw redirect({
      to: '/ou-workflow/ncrc-dashboard',
      search: {
        q: '',
        status: 'all',
        priority: 'all',
        page: 0,
        myOnly: true,
      },
    })
  },

  component: Outlet,
})
