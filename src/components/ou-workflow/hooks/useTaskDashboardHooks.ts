import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { fetchApplicants, fetchRcs } from './../../../api' // adjust import as needed
import { useUser } from '@/context/UserContext'

export function useTasks() {
  const { token, strategy } = useUser()

  return useQuery({
    queryKey: ['tasksplants', token, strategy], // cache per user/strategy
    queryFn: () => fetchApplicants({ token, strategy }), // pass token & strategy
    enabled: strategy === 'none' || !!token, // allow fetch if no-security or token exists
  })
}

export function useRCNames(options?: { enabled?: boolean }) {
  const { token, strategy } = useUser();

  const enabled = !!((strategy === "none" || !!token) && (options?.enabled ?? true));

  return useQuery({
    queryKey: ["rcnames"], // 👈 keep key stable (don’t include token/strategy)
    queryFn: () => fetchRcs({ token, strategy }),
    enabled,
    staleTime: Infinity,         // 👈 never stale
    cacheTime: Infinity,         // 👈 keep in memory until tab close
    refetchOnWindowFocus: false, // 👈 don’t refetch on focus
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
}