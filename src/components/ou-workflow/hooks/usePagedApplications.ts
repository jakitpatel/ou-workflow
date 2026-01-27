import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchApplicants } from '@/api';
import { useUser } from '@/context/UserContext';

const PAGE_LIMIT = 5;

export function usePagedApplications({
  searchTerm,
  statusFilter,
  priorityFilter,
  applicationId,
  myOnly,
  page,
  limit,
  enabled = true,
}: {
  searchTerm?: string;
  statusFilter?: string;
  priorityFilter?: string;
  applicationId?: number;
  myOnly?: string | boolean;
  page: number;
  limit?: number;
  enabled?: boolean;
}) {
  const { token, role } = useUser();

  return useQuery({
    queryKey: [
      'applications',
      'paged',
      { token, searchTerm, statusFilter, priorityFilter, page, applicationId, myOnly },
    ],

    queryFn: () =>
      fetchApplicants({
        token: token ?? undefined,
        searchTerm,
        statusFilter,
        priorityFilter,
        applicationId,
        myOnly,
        role,
        page,
        limit: limit ?? PAGE_LIMIT,
      }),

    enabled: enabled && !!token,
    placeholderData: keepPreviousData, // ✅ Fixed: proper syntax
    //staleTime: 30_000,
    retry: (failureCount, error: any) => {
      if (error?.status && [400, 401, 403, 404, 422].includes(error.status)) {
        return false;
      }
      return failureCount < 2; // ✅ Allow up to 2 retries
    }
  });
}
