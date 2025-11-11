import { Outlet, createFileRoute,redirect } from '@tanstack/react-router'
import { Navigation } from '@/components/ou-workflow/Navigation'
import { TaskProvider } from '@/context/TaskContext'

function OUWorkflowLayout() {

  return (
    <TaskProvider>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <Outlet />
      </div>
    </TaskProvider>
  )
}

export const Route = createFileRoute('/ou-workflow/')({
  beforeLoad: () => {
    throw redirect({ to: '/ou-workflow/ncrc-dashboard' })
  },
  component: OUWorkflowLayout,
})
