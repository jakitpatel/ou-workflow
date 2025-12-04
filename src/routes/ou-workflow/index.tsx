import { Outlet, createFileRoute,redirect } from '@tanstack/react-router'
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
  beforeLoad: () => {
    throw redirect({ to: '/ou-workflow/ncrc-dashboard' })
  },
  component: OUWorkflowLayout,
})
