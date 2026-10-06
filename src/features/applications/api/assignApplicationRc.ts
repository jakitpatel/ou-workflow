import { fetchWithAuth } from '@/shared/api/httpClient'

export function assignApplicationRc({ appId, assignee, token }: {
  appId: number
  assignee: string
  token?: string | null
}): Promise<unknown> {
  return fetchWithAuth({
    path: '/assignRole',
    method: 'POST',
    token,
    body: { appId, role: 'RC', assignee, capacity: 'DESIGNATED' },
  })
}
