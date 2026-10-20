import { fetchWithAuth } from '@/shared/api/httpClient'

export type ScheduleProductEdit = {
  productName: string
  BrandName: string
  privateLabelCo: string
  privateLabel: boolean
  Retail: boolean
  Industrial: boolean
  bulkShipped: string
  list: string
  symbol: string
  internal_use_only: string
  passover: string
  UPC: string
}

export function patchScheduleProduct(id: string, applicationId: string, attributes: ScheduleProductEdit, token?: string | null) {
  return fetchWithAuth({
    path: `/api/ScheduleProduct/${encodeURIComponent(id)}`,
    method: 'PATCH',
    body: { data: {
      attributes: { ApplicationID: applicationId, ...attributes, inHouse: !attributes.privateLabel },
      id: Number(id), type: 'ScheduleProduct',
    } },
    token,
  })
}

export function deleteScheduleProduct(id: string, token?: string | null) {
  return fetchWithAuth({
    path: `/api/ScheduleProduct/${encodeURIComponent(id)}`,
    method: 'PATCH',
    body: { data: { attributes: { isDeleted: true }, id: Number(id), type: 'ScheduleProduct' } },
    token,
  })
}
