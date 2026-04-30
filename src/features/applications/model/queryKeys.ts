import type { FetchApplicantsRequest } from '@/features/applications/api'

type ApplicantsListParams = Omit<FetchApplicantsRequest, 'token'>

export const applicationsQueryKeys = {
  all: ['applications'] as const,
  lists: () => [...applicationsQueryKeys.all, 'list'] as const,
  list: (params: ApplicantsListParams) => [...applicationsQueryKeys.lists(), params] as const,
  paged: (params: ApplicantsListParams) =>
    [...applicationsQueryKeys.lists(), 'paged', params] as const,
  infinite: (params: ApplicantsListParams) =>
    [...applicationsQueryKeys.lists(), 'infinite', params] as const,
  details: () => [...applicationsQueryKeys.all, 'detail'] as const,
  detail: (applicationId?: string) =>
    [...applicationsQueryKeys.details(), applicationId ?? 'unknown'] as const,
  scheduleAIngredients: (applicationId?: string) =>
    [...applicationsQueryKeys.all, 'schedule-a-ingredients', applicationId ?? 'unknown'] as const,
  scheduleBProducts: (applicationId?: string) =>
    [...applicationsQueryKeys.all, 'schedule-b-products', applicationId ?? 'unknown'] as const,
} as const
