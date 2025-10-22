import { useQuery } from '@tanstack/react-query';
import { fetchApplicationTasks, fetchRcs } from './../../../api' // adjust import as needed
import { useUser } from '@/context/UserContext'

export function useTasks(applicationId?: string) {
  const { token, strategy } = useUser();

  return useQuery({
    queryKey: ['tasksplants', token, strategy, applicationId ?? 'all'],
    queryFn: () => fetchApplicationTasks({ 
      token: token ?? undefined,     // ✅ null → undefined
      strategy: strategy ?? undefined, // ✅ null → undefined
      applicationId 
    }),
    enabled: strategy === 'none' || !!token, // ✅ always fetch if user is authorized
  });
}

export function useRCList(
  roleType: "NCRC" | "RFR",
  options?: { enabled?: boolean }
) {
  const { token, strategy } = useUser();

  const enabled = !!((strategy === "none" || !!token) && (options?.enabled ?? true));

  return useQuery({
    queryKey: ["rc-list", roleType], // cache separate by role
    queryFn: () => fetchRcs({ 
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