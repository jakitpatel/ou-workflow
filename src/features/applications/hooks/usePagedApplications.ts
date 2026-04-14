import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchApplicants } from '@/features/applications/api'
import { useUser } from '@/context/UserContext'
import { applicationsQueryKeys } from '@/features/applications/model/queryKeys'
import { queryOptionDefaults } from '@/shared/api/queryOptions'
import { buildApplicationListParams } from './applicationListQuery'

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
  const params = buildApplicationListParams({
    searchTerm,
    statusFilter,
    priorityFilter,
    applicationId,
    myOnly,
    role,
    page,
    limit,
  })

  return useQuery({
    queryKey: applicationsQueryKeys.paged(params),
    queryFn: () =>
      fetchApplicants({
        token: token ?? undefined,
        ...params,
      }),
    enabled: enabled && !!token,
    placeholderData: keepPreviousData,
    ...queryOptionDefaults.applicationsList,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}
