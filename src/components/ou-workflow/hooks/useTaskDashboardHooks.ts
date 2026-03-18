import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { fetchApplicationTasks, fetchTaskRoles, fetchUserByRole } from '@/api'
import { useUser } from '@/context/UserContext'
import { tasksQueryKeys } from '@/features/tasks/model/queryKeys'

export function useTasks(
  applicationId?: string,
  searchTerm?: string,
  daysFilter: string | number | undefined = 'pending',
) {
  const { token } = useUser()

  return useQuery({
    queryKey: tasksQueryKeys.list({
      applicationId,
      searchTerm,
      daysFilter,
    }),
    queryFn: () =>
      fetchApplicationTasks({
        token: token ?? undefined,
        applicationId,
        searchTerm,
        days: daysFilter === 'pending' ? undefined : daysFilter,
      }),
    enabled: !!token,
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
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
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
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}
