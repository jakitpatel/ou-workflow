import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchApplicants } from '@/api';
import { useUser } from '@/context/UserContext';

const PAGE_LIMIT = 5;

export function usePagedApplications({
  searchTerm,
  statusFilter,
  priorityFilter,
  applicationId,
  page,
  limit,
  enabled = true,
}: {
  searchTerm?: string;
  statusFilter?: string;
  priorityFilter?: string;
  applicationId?: number;
  page: number;
  limit?: number;
  enabled?: boolean;
}) {
  const { token } = useUser();

  return useQuery({
    queryKey: [
      'applications',
      'paged',
      { token, searchTerm, statusFilter, priorityFilter, page, applicationId },
    ],

    queryFn: () =>
      fetchApplicants({
        token: token ?? undefined,
        searchTerm,
        statusFilter,
        priorityFilter,
        applicationId,
        page,
        limit: limit ?? PAGE_LIMIT,
      }),

    enabled: enabled && !!token,
    placeholderData: keepPreviousData, // ✅ Fixed: proper syntax
    staleTime: 30_000,
    retry: (failureCount, error: any) => {
      if (error?.status && [400, 401, 403, 404, 422].includes(error.status)) {
        return false;
      }
      return failureCount < 2; // ✅ Allow up to 2 retries
    }
  });
}
