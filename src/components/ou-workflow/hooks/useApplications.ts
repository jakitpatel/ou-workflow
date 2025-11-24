import { useQuery } from '@tanstack/react-query'
import { fetchApplicants } from '@/api' // adjust import as needed
import { useUser } from '@/context/UserContext';

export function useApplications({
  searchTerm,
  statusFilter,
  priorityFilter,
  page,
  limit,
}: {
  searchTerm?: string
  statusFilter?: string
  priorityFilter?: string
  page?: number
  limit?: number
}) {
  const { token, strategy } = useUser();

  return useQuery({
    queryKey: ['applications', { token, strategy, searchTerm, statusFilter, priorityFilter, page, limit }],
    //staleTime: 1000 * 60 * 5, // 5 minutes cache
    queryFn: () =>
      fetchApplicants({
        token: token ?? undefined,
        strategy: strategy ?? undefined,
        searchTerm,
        statusFilter,
        priorityFilter,
        page,
        limit,
      }),
    // keep showing previous data until new data is loaded:
    placeholderData: (previousData) => previousData,
    enabled: strategy === 'none' || !!token,
    retry: (failureCount, error: any) => {
      if (error?.status && [400, 401, 403, 404, 422].includes(error.status)) return false;
      return false; //return failureCount < 2;
    },
  });
}
