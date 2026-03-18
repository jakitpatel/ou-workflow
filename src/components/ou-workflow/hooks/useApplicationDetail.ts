import { useQuery } from '@tanstack/react-query'
import { fetchApplicationDetail } from '@/api'
import { useUser } from '@/context/UserContext'
import { applicationsQueryKeys } from '@/features/applications/model/queryKeys'

export const useApplicationDetail = (applicationId?: string) => {
  const { token } = useUser()

  return useQuery({
    queryKey: applicationsQueryKeys.detail(applicationId),
    queryFn: () =>
      fetchApplicationDetail({
        applicationId,
        token: token ?? undefined,
      }),
    refetchOnWindowFocus: false,
    enabled: !!applicationId && !!token,
  })
}
