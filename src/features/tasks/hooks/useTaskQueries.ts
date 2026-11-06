import { useInfiniteQuery, useQuery, type UseQueryResult } from '@tanstack/react-query'
import { fetchUserByRole } from '@/features/applications/api'
import { fetchApplicationTasks, fetchMentionUsers, fetchTaskRoles } from '@/features/tasks/api'
import { useUser } from '@/context/UserContext'
import { tasksQueryKeys } from '@/features/tasks/model/queryKeys'
import { queryOptionDefaults } from '@/shared/api/queryOptions'

const DEFAULT_TASKS_PAGE_LIMIT = 50

// The list filters (Pending / 7 / 30 Days, search, AppId, role, page size) without the page.
const listFiltersOf = (queryKey: readonly unknown[] | undefined) => {
  const params = queryKey?.[2]
  if (!params || typeof params !== 'object') return undefined
  return JSON.stringify({ ...(params as Record<string, unknown>), page: undefined })
}

// Keep the previous rows on screen only while paging through the same list. A different view
// (e.g. Pending -> 7 Days) must start empty, or the last view's tasks look like part of it.
export const isSameTaskListOtherPage = (
  previousKey: readonly unknown[] | undefined,
  nextKey: readonly unknown[],
) => {
  const previous = listFiltersOf(previousKey)
  return previous !== undefined && previous === listFiltersOf(nextKey)
}

export const getTasksQueryOptions = ({
  applicationId,
  searchTerm,
  daysFilter = 'pending',
  role,
  token,
  page = 0,
  limit = DEFAULT_TASKS_PAGE_LIMIT,
}: {
  applicationId?: string
  searchTerm?: string
  daysFilter?: string | number | undefined
  role?: string
  token?: string | null
  page?: number
  limit?: number
}) => ({
  queryKey: tasksQueryKeys.list({
    applicationId,
    searchTerm,
    daysFilter,
    role,
    page,
    limit,
  }),
  queryFn: () =>
    fetchApplicationTasks({
      token: token ?? undefined,
      applicationId,
      searchTerm,
      days: daysFilter === 'pending' ? undefined : daysFilter,
      role,
      page,
      limit,
    }),
})

export function useTasks(
  applicationId?: string,
  searchTerm?: string,
  daysFilter: string | number | undefined = 'pending',
  page = 0,
  limit = DEFAULT_TASKS_PAGE_LIMIT,
  enabled = true,
) {
  const { token, role } = useUser()
  const taskRole = role && role.toUpperCase() !== 'ALL' ? role : undefined

  const options = getTasksQueryOptions({
    applicationId,
    searchTerm,
    daysFilter,
    role: taskRole,
    token,
    page,
    limit,
  })

  return useQuery({
    ...options,
    enabled: enabled && !!token,
    placeholderData: (previousData, previousQuery) =>
      isSameTaskListOtherPage(previousQuery?.queryKey, options.queryKey) ? previousData : undefined,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useInfiniteTasks({
  applicationId,
  searchTerm,
  daysFilter = 'pending',
  limit = DEFAULT_TASKS_PAGE_LIMIT,
  enabled = true,
}: {
  applicationId?: string
  searchTerm?: string
  daysFilter?: string | number | undefined
  limit?: number
  enabled?: boolean
}) {
  const { token, role } = useUser()
  const taskRole = role && role.toUpperCase() !== 'ALL' ? role : undefined

  return useInfiniteQuery({
    queryKey: tasksQueryKeys.list({
      applicationId,
      searchTerm,
      daysFilter,
      role: taskRole,
      limit,
    }),
    queryFn: ({ pageParam = 0 }) =>
      fetchApplicationTasks({
        token: token ?? undefined,
        applicationId,
        searchTerm,
        days: daysFilter === 'pending' ? undefined : daysFilter,
        role: taskRole,
        page: pageParam,
        limit,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const meta = lastPage.meta
      if (!meta) return undefined

      const nextOffset = meta.offset + meta.limit
      if (nextOffset >= meta.total_count) return undefined
      if (lastPage.data.length < meta.limit) return undefined
      return nextOffset
    },
    enabled: enabled && !!token,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useUserListByRole(roleType: string, options?: { enabled?: boolean }) {
  const { token } = useUser()
  const enabled = !!token && (options?.enabled ?? true)

  return useQuery({
    queryKey: tasksQueryKeys.roleUserList(roleType),
    queryFn: () =>
      fetchUserByRole({
        token: token ?? undefined,
        endpoint: roleType,
      }),
    enabled,
    ...queryOptionDefaults.tasksReferenceData,
  })
}

export function useFetchTaskRoles(): UseQueryResult<string[]> {
  const { token } = useUser()

  return useQuery({
    queryKey: tasksQueryKeys.roles(),
    queryFn: () =>
      fetchTaskRoles({
        token: token ?? undefined,
      }),
    enabled: !!token,
    ...queryOptionDefaults.tasksReferenceData,
  })
}

export function useMentionUsers(options?: { enabled?: boolean }) {
  const { token } = useUser()
  const enabled = !!token && (options?.enabled ?? true)

  return useQuery({
    queryKey: tasksQueryKeys.mentionUsers(),
    queryFn: () =>
      fetchMentionUsers({
        token: token ?? undefined,
      }),
    enabled,
    ...queryOptionDefaults.tasksReferenceData,
  })
}
