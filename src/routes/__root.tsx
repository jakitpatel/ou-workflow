import { Outlet, createRootRoute, redirect, useRouterState } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanstackDevtools } from '@tanstack/react-devtools'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Navigation } from '@/components/ou-workflow/Navigation'

// ✅ Normalize base: remove trailing slash
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '') || ''
const LOGIN_PATH = `${BASE}/login`
const CALLBACK_PATH = `${BASE}/cognito-callback`
const CALLBACK_DIRECT_PATH = `${BASE}/cognito-directcallback`

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    const userStr = localStorage.getItem('user')
    const isLoginPage =
      location.pathname === LOGIN_PATH || location.pathname === '/login'

    const isCallbackPage =
      location.pathname === CALLBACK_PATH || location.pathname === '/cognito-callback'

    const isCallbackDirectPage =
      location.pathname === CALLBACK_DIRECT_PATH || location.pathname === '/cognito-directcallback'

    // ✅ Allow login and callback screen without auth
    if (isLoginPage || isCallbackPage || isCallbackDirectPage) return

    if (!userStr) {
      throw redirect({ to: '/login' })
    }

    const user = JSON.parse(userStr)
    const loginTime = new Date(user.loginTime).getTime()
    const now = Date.now()

    if (!loginTime || now - loginTime > 24 * 60 * 60 * 1000) {
      localStorage.removeItem('user')
      throw redirect({ to: '/login' })
    }
  },
  component: RootLayout,
})

function RootLayout() {
  const route = useRouterState()
  const isLoginPage =
    route.location.pathname === LOGIN_PATH || route.location.pathname === '/login'

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* ✅ Show nav everywhere except /login */}
      {!isLoginPage && <Navigation />}

      <main className="flex-1">
        <Outlet />
      </main>

      <ReactQueryDevtools initialIsOpen={false} />
      <TanstackDevtools
        config={{ position: 'bottom-left' }}
        plugins={[
          {
            name: 'Tanstack Router',
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
    </div>
  )
}
