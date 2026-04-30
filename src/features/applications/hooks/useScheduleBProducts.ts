import { useQuery } from '@tanstack/react-query'
import { fetchScheduleBProducts } from '@/features/applications/api'
import { applicationsQueryKeys } from '@/features/applications/model/queryKeys'
import { useUser } from '@/context/UserContext'
import { queryOptionDefaults } from '@/shared/api/queryOptions'

export function useScheduleBProducts(applicationId?: string | number) {
  const { token } = useUser()
  const normalizedApplicationId =
    applicationId === undefined || applicationId === null ? undefined : String(applicationId)

  return useQuery({
    queryKey: applicationsQueryKeys.scheduleBProducts(normalizedApplicationId),
    queryFn: () =>
      fetchScheduleBProducts({
        applicationId: normalizedApplicationId,
        token: token ?? undefined,
      }),
    enabled: !!token && !!normalizedApplicationId,
    ...queryOptionDefaults.applicationScheduleBProducts,
  })
}
