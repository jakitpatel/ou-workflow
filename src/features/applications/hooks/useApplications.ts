import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchApplicants } from '@/features/applications/api'
import { applicationsQueryKeys } from '@/features/applications/model/queryKeys'
import { queryOptionDefaults } from '@/shared/api/queryOptions'
import { useUser } from '@/context/UserContext'
import { buildApplicationListParams } from './applicationListQuery'

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
  const params = buildApplicationListParams({
    searchTerm,
    statusFilter,
    priorityFilter,
    page: offset,
    limit,
  })

  return useQuery({
    queryKey: applicationsQueryKeys.list(params),
    queryFn: () =>
      fetchApplicants({
        token: token ?? undefined,
        ...params,
      }),
    placeholderData: keepPreviousData,
    enabled: enabled && !!token,
    ...queryOptionDefaults.applicationsList,
  })
}
