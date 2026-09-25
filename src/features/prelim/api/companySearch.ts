import { fetchWithAuth } from '@/shared/api/httpClient'

export type CompanySearchRecord = {
  id: string
  type: string
  attributes: {
    COMPANY_ID: string | number
    NAME: string
    CITY?: string | null
    STATE?: string | null
    STREET1?: string | null
    STREET2?: string | null
    ZIP?: string | null
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
    'company_name': companyName.trim(),
    'page[limit]': String(COMPANY_SEARCH_PAGE_SIZE),
    'page[offset]': String(page * COMPANY_SEARCH_PAGE_SIZE),
  })
  return fetchWithAuth<CompanySearchResponse>({
    path: `/get_company_address?${params}`,
    token,
  })
}
