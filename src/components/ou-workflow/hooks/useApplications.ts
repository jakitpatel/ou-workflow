import { useQuery } from '@tanstack/react-query'
import { fetchApplicants } from './../../../api' // adjust import as needed
import { useUser } from '@/context/UserContext';

export function useApplications() {
  const { token, strategy } = useUser();

  return useQuery({
    queryKey: ['applications', token, strategy], // cache per user/strategy
    queryFn: () => fetchApplicants({ token, strategy }),
    enabled: strategy === 'none' || !!token, // allow fetch if no-security or token exists
  });
}