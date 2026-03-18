import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchApplicants } from '@/api'
import { useUser } from '@/context/UserContext'
import { applicationsQueryKeys } from '@/features/applications/model/queryKeys'

export function useApplications({
  searchTerm,
  statusFilter,
  priorityFilter,
  offset,
  limit,
  enabled,
}: {
  searchTerm?: string
  statusFilter?: string
  priorityFilter?: string
  offset?: number
  limit?: number
  enabled?: boolean
}) {
  const { token } = useUser()

  return useQuery({
    queryKey: applicationsQueryKeys.list({
      searchTerm,
      statusFilter,
      priorityFilter,
      page: offset,
      limit,
    }),
    queryFn: () =>
      fetchApplicants({
        token: token ?? undefined,
        searchTerm,
        statusFilter,
        priorityFilter,
        page: offset,
        limit,
      }),
    placeholderData: keepPreviousData,
    enabled: enabled && !!token,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.status && [400, 401, 403, 404, 422].includes(error.status)) {
        return false
      }
      return failureCount < 2
    },
  })
}
