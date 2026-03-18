import { useQuery } from '@tanstack/react-query'
import { fetchApplicationDetail } from '@/features/applications/api'
import { useUser } from '@/context/UserContext'
import { applicationsQueryKeys } from '@/features/applications/model/queryKeys'
import { queryOptionDefaults } from '@/shared/api/queryOptions'

export const useApplicationDetail = (applicationId?: string) => {
  const { token } = useUser()

  return useQuery({
    queryKey: applicationsQueryKeys.detail(applicationId),
    queryFn: () =>
      fetchApplicationDetail({
        applicationId,
        token: token ?? undefined,
      }),
    ...queryOptionDefaults.applicationsDetail,
    enabled: !!applicationId && !!token,
  })
}
