import { useQuery } from '@tanstack/react-query'
import { fetchApplicants } from './../../../api' // adjust import as needed
import { useUser } from '@/context/UserContext';

export function useApplications() {
  const { token, strategy } = useUser();

  return useQuery({
  queryKey: ['applications', token, strategy],
  queryFn: () => fetchApplicants({ token, strategy }),
  enabled: strategy === 'none' || !!token,
  retry: (failureCount, error: any) => {
    if (error?.status && [400, 401, 403, 404].includes(error.status)) {
      return false; // don’t retry client errors
    }
    return failureCount < 2; // retry up to 2 times for server/network issues
  },
});
}