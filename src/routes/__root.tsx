import { Outlet, createRootRoute, redirect, useRouterState } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanstackDevtools } from '@tanstack/react-devtools'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Navigation } from '@/components/ou-workflow/Navigation'

// ✅ Helper: handle subpath correctly (e.g. /dashboard/)
const LOGIN_PATH = `${import.meta.env.BASE_URL}login`

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    const userStr = localStorage.getItem('user')
    const isLoginPage = location.pathname === LOGIN_PATH || location.pathname === '/login' // handle both

    if (!userStr) {
      if (!isLoginPage) throw redirect({ to: LOGIN_PATH })
      return
    }

    const user = JSON.parse(userStr)
    const loginTime = user.loginTime ? new Date(user.loginTime).getTime() : null
    const now = Date.now()

    if (!loginTime || now - loginTime > 24 * 60 * 60 * 1000) {
      localStorage.removeItem('user')
      if (!isLoginPage) throw redirect({ to: LOGIN_PATH })
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
