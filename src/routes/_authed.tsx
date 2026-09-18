import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { LeftNavigation, Navigation } from '@/components/layout/Navigation'
import { isAuthenticated } from '@/auth/authService'
import { useAppPreferences } from '@/context/AppPreferencesContext'
import { storeAuthRedirect } from '@/features/auth/model/sessionManager'
import { AuthenticatedEventsProvider } from '@/app/providers/EventsProvider'

export const Route = createFileRoute('/_authed')({
  beforeLoad: ({ location }) => {
    if (!isAuthenticated()) {
      sessionStorage.removeItem('user')
      storeAuthRedirect(location.href)
      throw redirect({ to: '/login' })
    }
  },
  component: AuthedLayout,
})

function AuthedLayout() {
  return (
    <AuthenticatedEventsProvider>
      <AuthedNavigationLayout />
    </AuthenticatedEventsProvider>
  )
}

function AuthedNavigationLayout() {
  const { navigationMenuType } = useAppPreferences()
  const [leftNavCollapsed, setLeftNavCollapsed] = useState(false)

  if (navigationMenuType === 'left') {
    return (
      <div className="min-h-screen bg-gray-50">
        <LeftNavigation collapsed={leftNavCollapsed} onCollapsedChange={setLeftNavCollapsed} />
        <main
          className={`min-h-screen transition-[padding] duration-200 ${
            leftNavCollapsed ? 'pl-16' : 'pl-64'
          }`}
        >
          <Outlet />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navigation />
      <main className="flex-1 pt-16">
        <Outlet />
      </main>
    </div>
  )
}
