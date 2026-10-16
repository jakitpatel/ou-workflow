import { fetchWithAuth } from '@/shared/api/httpClient'

export type ScheduleIngredientEdit = {
  ingredientLabelName: string
  manufacturer: string
  source: string
  brandName: string
  rawMaterialCode: string
  certifyingAgency: string
}

export function patchScheduleIngredient(
  id: string,
  applicationId: string,
  attributes: ScheduleIngredientEdit,
  token?: string | null,
) {
  return fetchWithAuth({
    path: `/api/ScheduleIngredient/${encodeURIComponent(id)}`,
    method: 'PATCH',
    body: {
      data: {
        attributes: { ApplicationID: applicationId, ...attributes },
        id: Number(id),
        type: 'ScheduleIngredient',
      },
    },
    token,
  })
}

export function deleteScheduleIngredient(id: string, token?: string | null) {
  return fetchWithAuth({
    path: `/api/ScheduleIngredient/${encodeURIComponent(id)}`,
    method: 'PATCH',
    body: {
      data: {
        attributes: { isDeleted: true },
        id: Number(id),
        type: 'ScheduleIngredient',
      },
    },
    token,
  })
}
