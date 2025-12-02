import { useQuery } from '@tanstack/react-query';
import { fetchApplicationTasks, fetchUserByRole } from './../../../api' // adjust import as needed
import { useUser } from '@/context/UserContext'
import type { Task } from '@/types/application';

export function useTasks(applicationId?: string, searchTerm?: string) {
  const { token, strategy } = useUser();

  return useQuery({
    queryKey: ['tasksplants', token, strategy, applicationId ?? 'all', searchTerm ?? ''],
    queryFn: () =>
      fetchApplicationTasks({
        token: token ?? undefined,
        strategy: strategy ?? undefined,
        applicationId,
        searchTerm, // ✅ new param
      }),
    enabled: strategy === 'none' || !!token,
  });
}

export function useUserListByRole(
  roleType: "NCRC" | "RFR",
  options?: { enabled?: boolean | Task }
) {
  const { token, strategy } = useUser();

  const enabled = !!((strategy === "none" || !!token) && (options?.enabled ?? true));

  return useQuery({
    queryKey: ["rc-list", roleType], // cache separate by role
    queryFn: () => fetchUserByRole({ 
      token: token ?? undefined,     // ✅ null → undefined
      strategy: strategy ?? undefined, // ✅ null → undefined
      selectRoleType: roleType 
    }),
    enabled,
    staleTime: Infinity,
    gcTime: Infinity, // ✅ replaced cacheTime
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
}