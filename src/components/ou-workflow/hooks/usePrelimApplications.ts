import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchPrelimApplications } from '@/api';
import { useUser } from '@/context/UserContext';

const PAGE_LIMIT = 20;

export function usePrelimApplications({
  searchTerm,
  statusFilter,
  page,
  limit,
  enabled = true,
}: {
  searchTerm?: string;
  statusFilter?: string;
  page: number;
  limit?: number;
  enabled?: boolean;
}) {
  const { token } = useUser();

  return useQuery({
    queryKey: [
      'applications',
      'paged',
      { token, searchTerm, statusFilter, page },
    ],

    queryFn: () =>
      fetchPrelimApplications({
        token: token ?? undefined,
        searchTerm,
        statusFilter,
        page,
        limit: limit ?? PAGE_LIMIT,
      }),

    enabled: enabled && !!token,
    //staleTime: Infinity,
    //gcTime: Infinity,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData, // ✅ Fixed: proper syntax
    retry: (failureCount, error: any) => {
      if (error?.status && [400, 401, 403, 404, 422].includes(error.status)) {
        return false;
      }
      return failureCount < 2; // ✅ Allow up to 2 retries
    }
  });
}
