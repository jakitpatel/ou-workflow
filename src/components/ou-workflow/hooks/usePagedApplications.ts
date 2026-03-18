import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchApplicants } from '@/api'
import { useUser } from '@/context/UserContext'
import { applicationsQueryKeys } from '@/features/applications/model/queryKeys'

const PAGE_LIMIT = 5

export function usePagedApplications({
  searchTerm,
  statusFilter,
  priorityFilter,
  applicationId,
  myOnly,
  page,
  limit,
  enabled = true,
}: {
  searchTerm?: string
  statusFilter?: string
  priorityFilter?: string
  applicationId?: number
  myOnly?: string | boolean
  page: number
  limit?: number
  enabled?: boolean
}) {
  const { token, role } = useUser()

  return useQuery({
    queryKey: applicationsQueryKeys.paged({
      searchTerm,
      statusFilter,
      priorityFilter,
      page,
      applicationId,
      myOnly,
      role,
      limit: limit ?? PAGE_LIMIT,
    }),
    queryFn: () =>
      fetchApplicants({
        token: token ?? undefined,
        searchTerm,
        statusFilter,
        priorityFilter,
        applicationId,
        myOnly,
        role,
        page,
        limit: limit ?? PAGE_LIMIT,
      }),
    enabled: enabled && !!token,
    placeholderData: keepPreviousData,
    retry: (failureCount, error: any) => {
      if (error?.status && [400, 401, 403, 404, 422].includes(error.status)) {
        return false
      }
      return failureCount < 2
    },
  })
}
