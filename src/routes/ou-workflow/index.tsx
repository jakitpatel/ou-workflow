import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { Navigation } from '@/components/ou-workflow/Navigation'

function OUWorkflowLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <Outlet />
    </div>
  )
}

export const Route = createFileRoute('/ou-workflow/')({
  validateSearch: () => ({}), // ✅ THIS IS THE KEY LINE

  beforeLoad: () => {
    throw redirect({
      to: '/ou-workflow/ncrc-dashboard',
      search: {
        q: '',
        status: 'all',
        priority: 'all',
        page: 0,
        myOnly: true
      },
    })
  },

  component: OUWorkflowLayout,
})
