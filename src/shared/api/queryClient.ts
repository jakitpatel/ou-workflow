import { QueryClient } from '@tanstack/react-query'
import { appQueryDefaultOptions } from '@/shared/api/queryOptions'

export const createAppQueryClient = () =>
  new QueryClient({
    defaultOptions: appQueryDefaultOptions,
  })

export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      ...appQueryDefaultOptions,
      queries: {
        ...(appQueryDefaultOptions.queries ?? {}),
        retry: false,
      },
      mutations: {
        ...(appQueryDefaultOptions.mutations ?? {}),
        retry: false,
      },
    },
  })
