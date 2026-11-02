import { useQuery } from '@tanstack/react-query'
import { useUser } from '@/context/UserContext'
import {
  DEFAULT_PRIORITY_OPTIONS,
  fetchPriorityOptions,
} from '@/features/applications/api/priorities'
import { applicationsQueryKeys } from '@/features/applications/model/queryKeys'
import { queryOptionDefaults } from '@/shared/api/queryOptions'

/** Priority filter options from WF_Priorities, falling back to the known codes. */
export function usePriorityOptions() {
  const { token } = useUser()
  const query = useQuery({
    queryKey: applicationsQueryKeys.priorities(),
    queryFn: () => fetchPriorityOptions(token),
    enabled: Boolean(token),
    ...queryOptionDefaults.tasksReferenceData,
  })

  return query.data?.length ? query.data : DEFAULT_PRIORITY_OPTIONS
}
