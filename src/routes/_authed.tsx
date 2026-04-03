import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { Navigation } from '@/components/ou-workflow/Navigation'
import { isAuthenticated } from '@/auth/authService'

export const Route = createFileRoute('/_authed')({
  beforeLoad: () => {
    if (!isAuthenticated()) {
      sessionStorage.removeItem('user')
      throw redirect({ to: '/login' })
    }
  },
  component: AuthedLayout,
})

function AuthedLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navigation />
      <main className="flex-1 pt-16">
        <Outlet />
      </main>
    </div>
  )
}
