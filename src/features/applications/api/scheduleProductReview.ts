import { fetchWithAuth, isJsonApiRecord } from '@/shared/api/httpClient'

export type ScheduleProductFollowUp = { isFlagged: boolean; flaggedNote: string }
export type ScheduleProductHalachicReview = { isHalachic: boolean; halachicNote: string }

export function patchScheduleProductHalachicReview(
  id: string,
  attributes: ScheduleProductHalachicReview,
  token?: string | null,
) {
  return fetchWithAuth({
    path: `/api/ScheduleProduct/${encodeURIComponent(id)}`,
    method: 'PATCH',
    body: { data: { attributes, id: Number(id), type: 'ScheduleProduct' } },
    token,
    expectBody: isJsonApiRecord,
  })
}

export function patchScheduleProductFollowUp(
  id: string,
  attributes: ScheduleProductFollowUp,
  token?: string | null,
) {
  return fetchWithAuth({
    path: `/api/ScheduleProduct/${encodeURIComponent(id)}`,
    method: 'PATCH',
    body: { data: { attributes, id: Number(id), type: 'ScheduleProduct' } },
    token,
    expectBody: isJsonApiRecord,
  })
}

