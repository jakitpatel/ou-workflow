import { useQuery } from '@tanstack/react-query'
import { fetchApplicationDetail } from '@/features/applications/api'
import { useUser } from '@/context/UserContext'
import { applicationsQueryKeys } from '@/features/applications/model/queryKeys'
import { queryOptionDefaults } from '@/shared/api/queryOptions'

export const getApplicationDetailQueryOptions = ({
  applicationId,
  token,
}: {
  applicationId?: string
  token?: string | null
}) => ({
  queryKey: applicationsQueryKeys.detail(applicationId),
  queryFn: () =>
    fetchApplicationDetail({
      applicationId,
      token: token ?? undefined,
    }),
  ...queryOptionDefaults.applicationsDetail,
})

export const useApplicationDetail = (applicationId?: string) => {
  const { token } = useUser()

  return useQuery({
    ...getApplicationDetailQueryOptions({
      applicationId,
      token,
    }),
    enabled: !!applicationId && !!token,
  })
}
