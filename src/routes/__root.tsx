import { Outlet, createRootRoute, redirect } from '@tanstack/react-router'
import { useUser } from '@/context/UserContext'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanstackDevtools } from '@tanstack/react-devtools'

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    const user = localStorage.getItem('user')
    const isLoginPage = location.pathname === '/login'

    if (!user && !isLoginPage) {
      throw redirect({ to: '/login' })
    }
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
