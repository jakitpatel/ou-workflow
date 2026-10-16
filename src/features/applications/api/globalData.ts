import { fetchWithAuth } from '@/shared/api/httpClient'

export function saveApplicationGlobalData({
  applicationId, taskInstanceId, jsonData, token,
}: {
  applicationId: number
  taskInstanceId: number
  jsonData: Record<string, unknown>
  token?: string | null
}) {
  return fetchWithAuth({
    path: '/global_data',
    method: 'POST',
    body: { applicationId, taskInstanceId, jsonData },
    token,
  })
}
