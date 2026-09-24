import { fetchWithAuth } from '@/shared/api/httpClient'

export type CompanySearchRecord = {
  id: string
  type: string
  attributes: {
    companyID: string | number
    Company: string
    City?: string | null
    State?: string | null
    Street1?: string | null
    Street2?: string | null
    Zip?: string | null
    FirstName?: string | null
    LastName?: string | null
    Email?: string | null
    Voice?: string | null
    ContactType?: string | null
    Status?: string | null
  }
}

export type CompanySearchResponse = {
  data: CompanySearchRecord[]
  meta?: { total_count?: number; count?: number; limit?: number; offset?: number }
}

export const COMPANY_SEARCH_PAGE_SIZE = 25

export function searchCompanies({
  companyName,
  page,
  token,
}: {
  companyName: string
  page: number
  token?: string
}) {
  const params = new URLSearchParams({
    'filter[Company]': companyName.trim(),
    'page[limit]': String(COMPANY_SEARCH_PAGE_SIZE),
    'page[offset]': String(page * COMPANY_SEARCH_PAGE_SIZE),
  })
  return fetchWithAuth<CompanySearchResponse>({
    path: `/api/CompanyContactsAndAddresses?${params}`,
    token,
  })
}
