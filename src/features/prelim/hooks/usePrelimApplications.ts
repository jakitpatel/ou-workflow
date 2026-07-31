import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { fetchPrelimApplications } from '@/features/prelim/api'
import { useUser } from '@/context/UserContext'
import { prelimQueryKeys } from '@/features/prelim/model/queryKeys'
import { queryOptionDefaults } from '@/shared/api/queryOptions'

const PAGE_LIMIT = 20

export function usePrelimApplications({
  searchTerm,
  statusFilter,
  applicationId,
  page,
  limit,
  enabled = true,
}: {
  searchTerm?: string
  statusFilter?: string
  applicationId?: number
  page: number
  limit?: number
  enabled?: boolean
}) {
  const { token } = useUser()
  const pageLimit = limit ?? PAGE_LIMIT

  return useQuery({
    queryKey: prelimQueryKeys.list({
      searchTerm,
      statusFilter,
      applicationId,
      page,
      limit: pageLimit,
    }),
    queryFn: () =>
      fetchPrelimApplications({
        token: token ?? undefined,
        searchTerm,
        statusFilter,
        applicationId,
        page,
        limit: pageLimit,
      }),
    enabled: enabled && !!token,
    placeholderData: keepPreviousData,
    ...queryOptionDefaults.prelimList,
  })
}

export function useInfinitePrelimApplications({
  searchTerm,
  statusFilter,
  applicationId,
  limit,
  enabled = true,
}: {
  searchTerm?: string
  statusFilter?: string
  applicationId?: number
  limit?: number
  enabled?: boolean
}) {
  const { token } = useUser()
  const pageLimit = limit ?? PAGE_LIMIT
  const params = {
    searchTerm,
    statusFilter,
    applicationId,
    page: 0,
    limit: pageLimit,
  }

  return useInfiniteQuery({
    queryKey: [...prelimQueryKeys.list(params), 'infinite'],
    queryFn: ({ pageParam = 0 }) =>
      fetchPrelimApplications({
        token: token ?? undefined,
        searchTerm,
        statusFilter,
        applicationId,
        page: pageParam,
        limit: pageLimit,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.meta.offset + lastPage.meta.limit
      if (nextOffset >= lastPage.meta.total_count) return undefined
      if (lastPage.data.length < lastPage.meta.limit) return undefined
      return nextOffset
    },
    enabled: enabled && !!token,
    ...queryOptionDefaults.prelimList,
  })
}
