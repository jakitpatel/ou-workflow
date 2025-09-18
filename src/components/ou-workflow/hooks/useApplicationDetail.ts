import { useQuery } from '@tanstack/react-query';
import { fetchApplicationDetailById } from './../../../api';

export const useApplicationDetail = (applicationId?: string) => {
  return useQuery({
    queryKey: ['application', applicationId],
    queryFn: () => fetchApplicationDetailById(applicationId),
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
  });
};
