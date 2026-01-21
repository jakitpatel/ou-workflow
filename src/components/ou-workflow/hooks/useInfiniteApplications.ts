// hooks/useInfiniteApplications.ts
import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchApplicants } from '@/api';
import { useUser } from '@/context/UserContext';

const PAGE_LIMIT = 5;

export function useInfiniteApplications({
  searchTerm,
  statusFilter,
  priorityFilter,
  applicationId,
  limit,
  enabled = true,
}: {
  searchTerm?: string;
  statusFilter?: string;
  priorityFilter?: string;
  applicationId?: number;
  limit?: number;
  enabled?: boolean;
}) {
  const { token } = useUser();

  return useInfiniteQuery({
    queryKey: [
      'applications',
      'infinite',
      { token, searchTerm, statusFilter, priorityFilter, applicationId },
    ],

    queryFn: ({ pageParam = 0 }) =>
      fetchApplicants({
        token: token ?? undefined,
        searchTerm,
        statusFilter,
        priorityFilter,
        applicationId,
        page: pageParam,      // offset
        limit: limit ?? PAGE_LIMIT,
      }),

    initialPageParam: 0,

    getNextPageParam: (lastPage) => {
      const { offset, limit, total_count } = lastPage.meta;
      const nextOffset = offset + limit;
      
      // ✅ Extra safety: check both conditions
      if (nextOffset >= total_count) return undefined;
      if (lastPage.data.length < limit) return undefined;
      
      return nextOffset;
    },

    enabled: enabled && !!token,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    // ✅ Important: Don't refetch on window focus for infinite queries
    refetchOnWindowFocus: false,
  });
}
