import { useQuery } from '@tanstack/react-query';
import { fetchApplicationDetailRaw } from './../../../api';
import { useUser } from '@/context/UserContext';

export const useApplicationDetail = (applicationId?: string) => {
  const { token, strategy } = useUser();

  return useQuery({
    queryKey: ['application', applicationId, token, strategy], // cache per user/session
    queryFn: () => fetchApplicationDetailRaw({ 
      applicationId,
      token: token ?? undefined,     // ✅ null → undefined
      strategy: strategy ?? undefined, // ✅ null → undefined
    }),
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
    enabled: !!applicationId && (strategy === 'none' || !!token), // fetch only if appId exists
  });
};
