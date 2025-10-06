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

  const enabled = !!((strategy === 'none' || !!token) && (options?.enabled ?? true));

  return useQuery({
    queryKey: ['rcnames', token, strategy],
    queryFn: () => fetchRcs({ token, strategy }),
    enabled, // ✅ guaranteed boolean
  });
}