import { useQuery } from '@tanstack/react-query'
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

export function useRCNames() {
  const { token, strategy } = useUser();

  return useQuery({
    queryKey: ['rcnames', token, strategy], // include strategy too for cache
    queryFn: () => fetchRcs({ token, strategy }),
    enabled: strategy === 'none' || !!token, // allow fetch for 'none' strategy too
  });
}