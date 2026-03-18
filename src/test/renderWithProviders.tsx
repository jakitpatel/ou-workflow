import { type ReactElement, type ReactNode } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  createMemoryHistory,
} from '@tanstack/react-router'
import { UserProvider } from '@/context/UserContext'
import { createTestQueryClient } from '@/shared/api/queryClient'

type ProviderOptions = Omit<RenderOptions, 'wrapper'> & {
  queryClient?: QueryClient
  withRouter?: boolean
  initialEntries?: string[]
}

function BaseProviders({
  children,
  queryClient,
}: {
  children: ReactNode
  queryClient: QueryClient
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>{children}</UserProvider>
    </QueryClientProvider>
  )
}

function createTestRouter(ui: ReactElement, queryClient: QueryClient, initialEntries: string[]) {
  const rootRoute = createRootRoute({
    component: () => <Outlet />,
  })

  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => ui,
  })

  const routeTree = rootRoute.addChildren([indexRoute])

  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries }),
    context: { queryClient },
    defaultPreload: false,
  })
}

export function renderWithProviders(ui: ReactElement, options: ProviderOptions = {}) {
  const {
    queryClient = createTestQueryClient(),
    withRouter = false,
    initialEntries = ['/'],
    ...renderOptions
  } = options

  if (withRouter) {
    const router = createTestRouter(ui, queryClient, initialEntries)
    void router.load()

    return {
      queryClient,
      router,
      ...render(
        <BaseProviders queryClient={queryClient}>
          <RouterProvider router={router} />
        </BaseProviders>,
        renderOptions,
      ),
    }
  }

  return {
    queryClient,
    ...render(<BaseProviders queryClient={queryClient}>{ui}</BaseProviders>, renderOptions),
  }
}
