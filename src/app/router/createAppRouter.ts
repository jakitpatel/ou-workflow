import { createRouter } from '@tanstack/react-router'
import { appQueryClient } from '@/shared/api/queryClient'
import { NotFound } from './NotFound'
import { routeTree } from '@/routeTree.gen'

export const queryClient = appQueryClient

export const createAppRouter = () =>
  createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    defaultNotFoundComponent: NotFound,
    scrollRestoration: true,
    defaultStructuralSharing: true,
    defaultPreloadStaleTime: 0,
    basepath: import.meta.env.BASE_URL.replace(/\/$/, ''),
  })

export const appRouter = createAppRouter()

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof appRouter
    context: {
      queryClient: typeof queryClient
    }
  }
}
