import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { fetchApplicationTasks, fetchRcs } from './../../../api' // adjust import as needed
import { useUser } from '@/context/UserContext'

export function useTasks() {
  const { token, strategy } = useUser()

  return useQuery({
    queryKey: ['tasksplants', token, strategy], // cache per user/strategy
    queryFn: () => fetchApplicationTasks({ token, strategy }), // pass token & strategy
    enabled: strategy === 'none' || !!token, // allow fetch if no-security or token exists
  })
}

export function useRCList(
  roleType: "NCRC" | "RFR",
  options?: { enabled?: boolean }
) {
  const { token, strategy } = useUser();

  const enabled = !!((strategy === "none" || !!token) && (options?.enabled ?? true));

  return useQuery({
    queryKey: ["rc-list", roleType], // cache separate by role
    queryFn: () => fetchRcs({ token, strategy, selectRoleType: roleType }),
    enabled,
    staleTime: Infinity,
    cacheTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
}