import { useQuery } from '@tanstack/react-query'
import { fetchApplicants } from '@/api' // adjust import as needed
import { useUser } from '@/context/UserContext';

export function useApplications({
  searchTerm,
  statusFilter,
  priorityFilter,
}: {
  searchTerm?: string;
  statusFilter?: string;
  priorityFilter?: string;
}) {
  const { token, strategy } = useUser();

  return useQuery({
    queryKey: ['applications', { token, strategy, searchTerm, statusFilter, priorityFilter }],
    //staleTime: 1000 * 60 * 5, // 5 minutes cache
    //keepPreviousData: true,   // keep list visible during refetch
    queryFn: () =>
      fetchApplicants({
        token: token ?? undefined,
        strategy: strategy ?? undefined,
        searchTerm,
        statusFilter,
        priorityFilter,
      }),
    enabled: strategy === 'none' || !!token,
    retry: (failureCount, error: any) => {
      if (error?.status && [400, 401, 403, 404, 422].includes(error.status)) return false;
      return failureCount < 2;
    },
  });
}
