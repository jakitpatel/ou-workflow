import { fetchWithAuth } from '@/shared/api/httpClient'

export type ScheduleVisitParams = {
  visitId: string
  visitDate: string
  visitType?: 'SCHEDULE' | 'ACTUAL'
  token?: string | null
}

export async function scheduleVisit({ visitId, visitDate, visitType, token }: ScheduleVisitParams) {
  const response = await fetchWithAuth<{ success?: boolean; error?: string }>({
    path: '/schedule_visit',
    method: 'POST',
    body: {
      visit_id: visitId,
      visit_date: visitDate,
      ...(visitType ? { visit_type: visitType } : {}),
    },
    token,
    // `/schedule_visit` answers {message: "... scheduled ..."} after it queues the visit;
    // an explicit {success: false} is still reported below with the server's error.
    expectBody: (body) => {
      const record = body as { success?: unknown; message?: unknown }
      return typeof record.success === 'boolean' || (typeof record.message === 'string' && record.message.trim() !== '')
    },
  })
  if (response?.success === false) throw new Error(response.error || 'Failed to schedule visit')
  return response
}
