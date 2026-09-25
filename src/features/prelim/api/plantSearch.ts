import { fetchWithAuth } from '@/shared/api/httpClient'
import type { CompanySearchRecord } from './companySearch'

export type PlantSearchRecord = Omit<CompanySearchRecord, 'COMPANY_ID' | 'STATUS' | 'TYPE' | 'ADDRESS_SEQ_NUM'> & {
  PLANT_ID: string | number
}

export type PlantSearchResponse = {
  data: PlantSearchRecord[]
}

export const PLANT_SEARCH_PAGE_SIZE = 25

export function searchPlants({
  plantName,
  token,
}: {
  plantName: string
  token?: string
}) {
  const params = new URLSearchParams({
    name: plantName.trim(),
  })
  return fetchWithAuth<PlantSearchResponse>({ path: `/get_plant_address?${params}`, token })
}
