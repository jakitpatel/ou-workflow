import { useQueryClient, type QueryKey } from '@tanstack/react-query'
import { useSSE } from '@/hooks/useSSE'
import { fetchApplicationMessages } from '@/features/applications/api'

// Drawers pass no application ID while closed, disabling their subscription.
export function useCommunicationMessageEvents({
  applicationId,
  taskInstanceId,
  token,
  queryKey,
}: {
  applicationId?: string
  taskInstanceId?: string
  token?: string | null
  queryKey: QueryKey
}) {
  const queryClient = useQueryClient()
  const enabled = Boolean(token && applicationId && taskInstanceId)

  useSSE((message) => {
    if (!enabled || message.type !== 'refresh_messages') return
    if (message.data?.application_type !== 'WORKFLOW') return
    if (String(message.data.ApplicationId ?? '') !== applicationId ||
        String(message.data.TaskInstanceId ?? '') !== taskInstanceId) return

    const pushSeqNum = typeof message.pushSeqNum === 'number' || typeof message.pushSeqNum === 'string'
      ? message.pushSeqNum : -1
    // Fetch through the existing query so loading, errors and all observers stay in sync.
    void queryClient.fetchQuery({
      queryKey,
      staleTime: 0,
      queryFn: () => fetchApplicationMessages({ applicationId, taskInstanceId, token, pushSeqNum }),
    }).catch(() => {
      // The query exposes the error and the Communication tab already offers retry.
    })
  }, { enabled })
}
