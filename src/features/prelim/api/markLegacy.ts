import { fetchWithAuth, isJsonApiRecord } from '@/shared/api/httpClient'

export function markPrelimApplicationLegacy(applicationId: string | number, token?: string | null) {
  return fetchWithAuth<unknown>({
    path: `/api/WFApplication/${encodeURIComponent(String(applicationId))}`,
    method: 'PATCH',
    token,
    expectBody: isJsonApiRecord,
    body: {
      data: {
        attributes: { Status: 'LEGACY' },
        id: applicationId,
        type: 'WFApplication',
      },
    },
  })
}
