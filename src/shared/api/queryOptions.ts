import type { DefaultOptions } from '@tanstack/react-query'

const NON_RETRYABLE_STATUS_CODES = new Set([400, 401, 403, 404, 422])

const getErrorStatus = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object') {
    return undefined
  }

  const maybeStatus = (error as { status?: unknown }).status
  return typeof maybeStatus === 'number' ? maybeStatus : undefined
}

export const shouldRetryApiQuery = (
  failureCount: number,
  error: unknown,
  maxRetries = 2,
): boolean => {
  const status = getErrorStatus(error)
  if (status && NON_RETRYABLE_STATUS_CODES.has(status)) {
    return false
  }

  return failureCount < maxRetries
}

export const appQueryDefaultOptions: DefaultOptions = {
  queries: {
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: shouldRetryApiQuery,
    refetchOnWindowFocus: false,
  },
  mutations: {
    retry: false,
  },
}

export const queryOptionDefaults = {
  applicationsList: {
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: shouldRetryApiQuery,
    refetchOnWindowFocus: false,
  },
  applicationsDetail: {
    refetchOnWindowFocus: false,
  },
  applicationScheduleAIngredients: {
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  },
  applicationScheduleBProducts: {
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  },
  tasksReferenceData: {
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  },
  prelimList: {
    retry: shouldRetryApiQuery,
    refetchOnWindowFocus: false,
  },
  prelimDetail: {
    refetchOnWindowFocus: false,
  },
  prelimKashrusDetails: {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  },
} as const
