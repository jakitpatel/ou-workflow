import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { fetchUserByRole } from '@/features/applications/api'
import { fetchApplicationTasks, fetchTaskRoles } from '@/features/tasks/api'
import { useUser } from '@/context/UserContext'
import { tasksQueryKeys } from '@/features/tasks/model/queryKeys'
import { queryOptionDefaults } from '@/shared/api/queryOptions'

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
