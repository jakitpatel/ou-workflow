import type { QueryClient } from '@tanstack/react-query'
import type { SSEMessage } from '@/hooks/useSSE'
import { applicationsQueryKeys } from '@/features/applications/model/queryKeys'
import { refreshApplicationInListCaches } from './applicationListCache'

const containsApplication = (value: unknown, applicationId: string): boolean => {
  if (Array.isArray(value)) {
    return value.some((item: unknown) => {
      if (!item || typeof item !== 'object') return false
      const applicant = item as Record<string, unknown>
      return String(applicant.applicationId ?? applicant.id) === applicationId
    })
  }
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return (
    containsApplication(record.data, applicationId) ||
    (Array.isArray(record.pages) &&
      record.pages.some((page: unknown) => containsApplication(page, applicationId)))
  )
}

export async function refreshWorkflowApplicationFromEvent(
  message: SSEMessage,
  queryClient: QueryClient,
  token?: string | null,
): Promise<void> {
  if (
    message?.type !== 'reload_workflow_application' ||
    message.data?.ApplicationType !== 'WORKFLOW'
  ) return

  const rawId = message.data.application_id
  if (typeof rawId !== 'number' && typeof rawId !== 'string') return
  const applicationId = Number(rawId)
  if (!String(rawId).trim() || !Number.isSafeInteger(applicationId) || applicationId <= 0) return

  const isCached = queryClient
    .getQueriesData({ queryKey: applicationsQueryKeys.lists() })
    .some(([, data]) => containsApplication(data, String(applicationId)))
  if (!isCached) return

  await refreshApplicationInListCaches({ applicationId, queryClient, token })
}
