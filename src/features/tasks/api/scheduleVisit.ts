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
  })
  if (response?.success === false) throw new Error(response.error || 'Failed to schedule visit')
  return response
}
