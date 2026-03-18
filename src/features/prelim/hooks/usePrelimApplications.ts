import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchPrelimApplications } from '@/features/prelim/api'
import { useUser } from '@/context/UserContext'
import { prelimQueryKeys } from '@/features/prelim/model/queryKeys'
import { queryOptionDefaults } from '@/shared/api/queryOptions'

const PAGE_LIMIT = 20

export function usePrelimApplications({
  searchTerm,
  statusFilter,
  page,
  limit,
  enabled = true,
}: {
  searchTerm?: string
  statusFilter?: string
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
      page,
      limit: pageLimit,
    }),
    queryFn: () =>
      fetchPrelimApplications({
        token: token ?? undefined,
        searchTerm,
        statusFilter,
        page,
        limit: pageLimit,
      }),
    enabled: enabled && !!token,
    placeholderData: keepPreviousData,
    ...queryOptionDefaults.prelimList,
  })
}
