import { Outlet, createRootRoute, redirect, useRouterState } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanstackDevtools } from '@tanstack/react-devtools'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Navigation } from '@/components/ou-workflow/Navigation'
import { isAuthenticated } from "@/components/auth/authService"

// Normalize base: remove trailing slash
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '') || ''

// Normalize pathname by removing BASE prefix
function normalizePath(pathname: string) {
  return pathname.startsWith(BASE)
    ? pathname.slice(BASE.length) || '/'
    : pathname
}

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    const userStr = localStorage.getItem('user')

    // Normalize incoming route
    const path = normalizePath(location.pathname)

    const isLoginPage = path === '/login'
    const isCallbackDirectPage = path === '/cognito-directcallback'
    const isCognitoLogoutPage = path === '/cognito-logout'

    // Allow these routes without authentication
    if (isLoginPage || isCallbackDirectPage || isCognitoLogoutPage) {
      return
    }

    // Require auth for all other routes
    if (!userStr) {
      throw redirect({ to: '/login' })
    }

    if (!isAuthenticated()) {
      localStorage.removeItem('user')
      throw redirect({ to: '/login' })
    }
  },

  component: RootLayout,
})

function RootLayout() {
  const route = useRouterState()

  const path = normalizePath(route.location.pathname)
  const isLoginPage = path === '/login'

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {!isLoginPage && <Navigation />}

      <main className="flex-1">
        <Outlet />
      </main>

      <ReactQueryDevtools initialIsOpen={false} />
      <TanstackDevtools
        config={{ position: 'bottom-left' }}
        plugins={[
          { name: 'Tanstack Router', render: <TanStackRouterDevtoolsPanel /> },
        ]}
      />
    </div>
  )
}
