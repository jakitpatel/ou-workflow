import { useInfiniteQuery } from '@tanstack/react-query'
import { fetchApplicants } from '@/features/applications/api'
import { useUser } from '@/context/UserContext'
import { applicationsQueryKeys } from '@/features/applications/model/queryKeys'
import { queryOptionDefaults } from '@/shared/api/queryOptions'
import { buildApplicationListParams } from './applicationListQuery'

export function useInfiniteApplications({
  searchTerm,
  statusFilter,
  priorityFilter,
  applicationId,
  myOnly,
  limit,
  enabled = true,
}: {
  searchTerm?: string
  statusFilter?: string
  priorityFilter?: string
  applicationId?: number
  myOnly?: string | boolean
  limit?: number
  enabled?: boolean
}) {
  const { token, role } = useUser()
  const baseParams = buildApplicationListParams({
    searchTerm,
    statusFilter,
    priorityFilter,
    applicationId,
    myOnly,
    role,
    page: 0,
    limit,
  })

  return useInfiniteQuery({
    queryKey: applicationsQueryKeys.infinite(baseParams),
    queryFn: ({ pageParam = 0 }) =>
      fetchApplicants({
        token: token ?? undefined,
        ...baseParams,
        page: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const { offset, limit: responseLimit, total_count } = lastPage.meta
      const nextOffset = offset + responseLimit
      if (nextOffset >= total_count) return undefined
      if (lastPage.data.length < responseLimit) return undefined
      return nextOffset
    },
    enabled: enabled && !!token,
    ...queryOptionDefaults.applicationsList,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}
