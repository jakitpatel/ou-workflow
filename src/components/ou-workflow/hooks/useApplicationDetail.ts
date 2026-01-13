import { useQuery } from '@tanstack/react-query';
import { fetchApplicationDetail } from '@/api';
import { useUser } from '@/context/UserContext';

export const useApplicationDetail = (applicationId?: string) => {
  const { token } = useUser();

  return useQuery({
    queryKey: ['application', applicationId, token], // cache per user/session
    queryFn: () => fetchApplicationDetail({ 
      applicationId,
      token: token ?? undefined,     // ✅ null → undefined
    }),
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
    enabled: !!applicationId && (!!token), // fetch only if appId exists
  });
};
