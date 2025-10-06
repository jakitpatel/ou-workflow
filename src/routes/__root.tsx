import { Outlet, createRootRoute, redirect } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanstackDevtools } from '@tanstack/react-devtools'

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    const userStr = localStorage.getItem('user')
    const isLoginPage = location.pathname === '/login'

    // If no user, always force login
    if (!userStr) {
      if (!isLoginPage) {
        throw redirect({ to: '/login' })
      }
      return
    }

    const user = JSON.parse(userStr)
    const loginTime = user.loginTime ? new Date(user.loginTime).getTime() : null
    const now = Date.now()

    // 24 hours = 86400000 ms
    if (!loginTime || now - loginTime > 24 * 60 * 60 * 1000) {
      localStorage.removeItem('user')
      if (!isLoginPage) {
        throw redirect({ to: '/login' })
      }
    }

    // otherwise user is still valid → let them continue
  },
  component: () => (
    <>
      <Outlet />
      <TanstackDevtools
        config={{
          position: 'bottom-left',
        }}
        plugins={[
          {
            name: 'Tanstack Router',
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
    </>
  ),
})
