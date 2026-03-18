import type { FetchApplicantsRequest } from '@/features/applications/api'

type ApplicationListParams = Omit<FetchApplicantsRequest, 'token'>

const DEFAULT_APPLICATION_PAGE_LIMIT = 5

export const buildApplicationListParams = ({
  searchTerm,
  statusFilter,
  priorityFilter,
  applicationId,
  myOnly,
  role,
  page,
  limit,
}: ApplicationListParams): Required<Pick<FetchApplicantsRequest, 'page' | 'limit'>> &
  Omit<FetchApplicantsRequest, 'token' | 'page' | 'limit'> => ({
  searchTerm,
  statusFilter,
  priorityFilter,
  applicationId,
  myOnly,
  role,
  page: page ?? 0,
  limit: limit ?? DEFAULT_APPLICATION_PAGE_LIMIT,
})

export const defaultApplicationPageLimit = DEFAULT_APPLICATION_PAGE_LIMIT
