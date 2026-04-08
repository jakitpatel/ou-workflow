import { createAppError } from '@/shared/api/errors'
import { fetchWithAuth } from '@/shared/api/httpClient'
import { addFilterParams, buildPaginationParams } from '@/shared/api/queryParams'
import type { ApplicantsResponse } from '@/types/application'
import {
  mapPrelimApplicantsResponse,
  type BackendPrelimApplicantsResponse,
} from './mappers'

const createApiError = (message: string, status?: number, details?: unknown) =>
  createAppError(message, { status, details, code: 'API_ERROR' })

type AppCompanyValue = {
  companyName?: string
  whichCategory?: string
  companyAddress?: string
  companyAddress2?: string
  companyCity?: string
  companyState?: string
  ZipPostalCode?: string
  companyCountry?: string
  billingContact?: {
    name?: string
  }
}

type AppPlantValue = {
  plantName?: string
  processDescription?: string
  plantAddress?: string
  plantCity?: string
  plantState?: string
  plantZip?: string
  plantCountry?: string
}

type CompanyApiAttributes = {
  COMPANY_ID?: number
  NAME: string
  CATEGORY: string
  ACTIVE: number
  STATUS: string
}

type PlantApiAttributes = {
  PLANT_ID: number
  NAME: string
  ACTIVE: number
}

function toPositiveInteger(value: string | number | null | undefined): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : null
}

function buildCompanyAddressPayloadFromApplication(
  appValue: AppCompanyValue,
  companyId: string | number,
): {
  data: {
    attributes: {
      COMPANY_ID: number
      ADDRESS_SEQ_NUM: number
      TYPE: string
      ATTN: string
      STREET1: string
      STREET2: string
      STREET3: string
      CITY: string
      STATE: string
      ZIP: string
      COUNTRY: string
      ACTIVE: number
      S_CheckSum: string
    }
    type: 'COMPANYADDRESSTB'
  }
} {
  const parsedCompanyId = toPositiveInteger(companyId)
  if (parsedCompanyId == null) {
    throw createApiError('Invalid company id for COMPANYADDRESSTB payload')
  }

  return {
    data: {
      attributes: {
        COMPANY_ID: parsedCompanyId,
        ADDRESS_SEQ_NUM: 0,
        TYPE: '',
        ATTN: '',
        STREET1: appValue.companyAddress ?? '',
        STREET2: appValue.companyAddress2 ?? '',
        STREET3: '',
        CITY: appValue.companyCity ?? '',
        STATE: appValue.companyState ?? '',
        ZIP: appValue.ZipPostalCode ?? '',
        COUNTRY: appValue.companyCountry ?? '',
        ACTIVE: 1,
        S_CheckSum: '',
      },
      type: 'COMPANYADDRESSTB',
    },
  }
}

function buildPlantAddressPayloadFromApplication(
  appValue: AppPlantValue,
  plantId: string | number,
): {
  data: {
    attributes: {
      PLANT_ID: number
      ADDRESS_SEQ_NUM: number
      TYPE: string
      ATTN: string
      STREET1: string
      STREET2: string
      STREET3: string
      CITY: string
      STATE: string
      ZIP: string
      COUNTRY: string
      ACTIVE: number
      S_CheckSum: string
    }
    type: 'PLANTADDRESSTB'
  }
} {
  const parsedPlantId = toPositiveInteger(plantId)
  if (parsedPlantId == null) {
    throw createApiError('Invalid plant id for PLANTADDRESSTB payload')
  }

  return {
    data: {
      attributes: {
        PLANT_ID: parsedPlantId,
        ADDRESS_SEQ_NUM: 0,
        TYPE: '',
        ATTN: '',
        STREET1: appValue.plantAddress ?? '',
        STREET2: '',
        STREET3: '',
        CITY: appValue.plantCity ?? '',
        STATE: appValue.plantState ?? '',
        ZIP: appValue.plantZip ?? '',
        COUNTRY: appValue.plantCountry ?? '',
        ACTIVE: 1,
        S_CheckSum: '',
      },
      type: 'PLANTADDRESSTB',
    },
  }
}

export async function fetchPrelimApplications({
  page = 0,
  limit = 20,
  token,
  searchTerm,
  statusFilter,
}: FetchPrelimApplicationsRequest = {}): Promise<ApplicantsResponse> {
  const params = buildPaginationParams(page, limit)

  addFilterParams(params, {
    'filter[name]': searchTerm,
    'filter[status]': statusFilter,
  })

  const response = await fetchWithAuth<BackendPrelimApplicantsResponse>({
    path: `/get_applications_v1?application_type=SUBMISSION&${params.toString()}`,
    token,
  })
  return mapPrelimApplicantsResponse(response)
}

export type FetchPrelimApplicationsRequest = {
  page?: number
  limit?: number
  token?: string | null
  searchTerm?: string
  statusFilter?: string
}

export async function fetchPrelimApplicationDetails(
  preliminaryApplicationId: number,
  token?: string | null,
) {
  const params = new URLSearchParams()
  params.append('externalReferenceId', String(preliminaryApplicationId))
  const res = await fetchWithAuth<ApplicantsResponse>({
    path: `/get_prelim_application_details?${params.toString()}`,
    token,
  })
  return res.data
}

export async function fetchVectorMatches(payload: any, token?: string | null) {
  return await fetchWithAuth({
    path: '/matchList',
    method: 'POST',
    body: { data: JSON.stringify(payload) },
    token,
  })
}

export function buildCompanyPayloadFromApplication(
  appValue: AppCompanyValue,
  companyId: number | null = 0,
): {
  data: { attributes: CompanyApiAttributes; type: 'COMPANYTB' }
} {
  const includeCompanyId =
    typeof companyId === 'number' && Number.isFinite(companyId) && companyId > 0

  return {
    data: {
      attributes: {
        ...(includeCompanyId ? { COMPANY_ID: companyId } : {}),
        NAME: appValue.companyName ?? '',
        CATEGORY: appValue.whichCategory ?? '',
        ACTIVE: 1,
        STATUS: '',
      },
      type: 'COMPANYTB',
    },
  }
}

export function buildPlantPayloadFromApplication(
  appValue: AppPlantValue,
  plantId: number | null = 0,
): {
  data: { attributes: PlantApiAttributes; type: 'PLANTTB' }
} {
  const includePlantId =
    typeof plantId === 'number' && Number.isFinite(plantId) && plantId > 0

  return {
    data: {
      attributes: {
        ...(includePlantId ? { PLANT_ID: plantId } : { PLANT_ID: 0 }),
        NAME: appValue.plantName ?? '',
        ACTIVE: 1,
      },
      type: 'PLANTTB',
    },
  }
}

export async function createOrUpdateCompanyFromApplication({
  appValue,
  companyId = 0,
  token,
}: {
  appValue: AppCompanyValue
  companyId?: number | null
  token?: string | null
}): Promise<any> {
  const body = buildCompanyPayloadFromApplication(appValue, companyId)
  return await fetchWithAuth({
    path: '/api/COMPANYTB',
    method: 'POST',
    body,
    token,
  })
}

export async function createOrUpdatePlantFromApplication({
  appValue,
  plantId = 0,
  token,
}: {
  appValue: AppPlantValue
  plantId?: number | null
  token?: string | null
}): Promise<any> {
  const body = buildPlantPayloadFromApplication(appValue, plantId)
  return await fetchWithAuth({
    path: '/api/PLANTTB',
    method: 'POST',
    body,
    token,
  })
}

export async function createCompanyAddressFromApplication({
  appValue,
  companyId,
  token,
}: {
  appValue: AppCompanyValue
  companyId: string | number
  token?: string | null
}): Promise<any> {
  const body = buildCompanyAddressPayloadFromApplication(appValue, companyId)
  return await fetchWithAuth({
    path: '/api/COMPANYADDRESSTB',
    method: 'POST',
    body,
    token,
  })
}

export async function createPlantAddressFromApplication({
  appValue,
  plantId,
  token,
}: {
  appValue: AppPlantValue
  plantId: string | number
  token?: string | null
}): Promise<any> {
  const body = buildPlantAddressPayloadFromApplication(appValue, plantId)
  return await fetchWithAuth({
    path: '/api/PLANTADDRESSTB',
    method: 'POST',
    body,
    token,
  })
}

export function extractCreatedRecordId(
  response: any,
  key?: 'companyId' | 'plantId',
): string | number | null {
  const keyedValue =
    key == null
      ? undefined
      : response?.[key] ??
        response?.data?.[key] ??
        response?.result?.[key] ??
        response?.payload?.[key]

  const jsonApiId = response?.data?.id
  const fallbackAttributeId =
    response?.data?.attributes?.COMPANY_ID ?? response?.data?.attributes?.PLANT_ID

  const candidate = keyedValue ?? jsonApiId ?? fallbackAttributeId
  return candidate == null || candidate === '' ? null : candidate
}

export async function createSubmissionApplication({
  applicationId,
  token,
}: {
  applicationId: number
  token?: string | null
  applicationType?: number
}): Promise<any> {
  const params = new URLSearchParams()
  params.append('application_id', String(applicationId))

  return await fetchWithAuth({
    path: `/createSubmissionApplication?${params.toString()}`,
    token,
  })
}

export async function deleteSubmissionApplication({
  applicationId,
  token,
  applicationType = 2,
}: {
  applicationId: number
  token?: string | null
  applicationType?: number
}): Promise<any> {
  const params = new URLSearchParams()
  params.append('application_id', String(applicationType))
  params.append('applicationID', String(applicationId))

  return await fetchWithAuth({
    path: `/deleteSubmissionApplication?${params.toString()}`,
    token,
  })
}
