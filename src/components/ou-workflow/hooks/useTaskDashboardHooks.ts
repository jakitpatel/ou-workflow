import { useQuery } from '@tanstack/react-query';
import { fetchApplicationTasks, fetchUserByRole, fetchTaskRoles } from '@/api'
import { useUser } from '@/context/UserContext'
import type { Task } from '@/types/application';
import type { UseQueryResult } from '@tanstack/react-query';

export function useTasks(applicationId?: string, searchTerm?: string, daysFilter: string | number | undefined = 'pending') {
  const { token } = useUser();

  return useQuery({
    queryKey: ['tasksplants', token, applicationId ?? 'all', searchTerm ?? '', daysFilter],
    queryFn: () =>
      fetchApplicationTasks({
        token: token ?? undefined,
        applicationId,
        searchTerm, // ✅ new param
        days: daysFilter === 'pending' ? undefined : daysFilter
      }),
    enabled: !!token,
  });
}

export function useUserListByRole(
  roleType: string,
  options?: { enabled?: boolean | Task }
) {
  const { token } = useUser();

  const enabled = !!((!!token) && (options?.enabled ?? true));

  return useQuery({
    queryKey: ["rc-list", roleType], // cache separate by role
    queryFn: () => fetchUserByRole({ 
      token: token ?? undefined,     // ✅ null → undefined
      endpoint: roleType 
    }),
    enabled,
    staleTime: Infinity,
    gcTime: Infinity, // ✅ replaced cacheTime
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
}

export function useFetchTaskRoles(): UseQueryResult<string[]> {
  const { token } = useUser();

  return useQuery({
    queryKey: ['taskroles'],
    queryFn: () =>
      fetchTaskRoles({
        token: token ?? undefined,
      }),
    enabled: !!token,
    // 🔒 Load once & never refetch automatically
    staleTime: Infinity,
    gcTime: Infinity,
    // 🚫 Prevent background refetches
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}