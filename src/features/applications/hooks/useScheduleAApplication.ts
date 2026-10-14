import { useQuery } from '@tanstack/react-query'
import { useUser } from '@/context/UserContext'
import { fetchApplicants } from '@/features/applications/api'
import { queryOptionDefaults } from '@/shared/api/queryOptions'

export function useScheduleAApplication(applicationId?: string) {
  const { token } = useUser()
  return useQuery({
    queryKey: ['schedule-a-application', applicationId],
    queryFn: async () => {
      const response = await fetchApplicants({
        applicationId: Number(applicationId),
        limit: 10_000,
        myOnly: false,
        token: token ?? undefined,
      })
      return response.data.find(
        (item) => String(item.applicationId ?? item.id) === applicationId,
      ) ?? null
    },
    enabled: Boolean(applicationId && token),
    ...queryOptionDefaults.applicationsList,
  })
}
