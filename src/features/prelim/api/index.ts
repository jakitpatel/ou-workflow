import { createAppError } from '@/shared/api/errors'
import { fetchWithAuth } from '@/shared/api/httpClient'
import { addFilterParams, buildPaginationParams } from '@/shared/api/queryParams'
import type { ApplicantsResponse } from '@/types/application'
import type { CompanyData, PlantData, ResolutionContactData } from '@/features/prelim/model/resolution'
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

type AppContactValue = {
  name?: string
  title?: string
  phone?: string
  email?: string
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

type ResolveAddressPayload = {
  type: string
  attn: string
  street1: string
  street2: string
  city: string
  state: string
  zip: string
  country: string
}

type ResolveContactPayload = {
  CompanyTitle: string
  PrimaryCT: number
  BillingCT: number
  WebCT: number
  OtherCT: number
  Title: string
  FirstName: string
  LastName: string
  Voice: string
  Fax: string
  Email: string
  Cell: string
}

type ResolveCompanyPayload = {
  application_id: string | number
  task_instance_id: string | number
  company_name: string
  address: ResolveAddressPayload
  primary_contact: ResolveContactPayload
  billing_contact: ResolveContactPayload
}

type ResolvePlantPayload = {
  application_id: string | number
  task_instance_id: string | number
  company_id: string | number
  plant_id?: string | number
  plant_name: string
  address: ResolveAddressPayload
  primary_contact: ResolveContactPayload
  billing_contact: ResolveContactPayload
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

type ContactApiAttributes = {
  Title: string
  FirstName: string
  LastName: string
  Voice: string
  Email: string
  Cell: string
  EnteredBy: string
  Active: number
}

type CompanyContactApiAttributes = {
  Company_ID: number
  CompanyTitle: string
  PrimaryCT: string
  BillingCT: string
  WebCT: string
  OtherCT: string
  Active: number
  ContactID: number
  PoCT: string
  CopackerCT: string
}

type PlantContactApiAttributes = {
  Owns_ID: number
  CompanyTitle: string
  PrimaryCT: string
  BillingCT: string
  WebCT: string
  OtherCT: string
  Active: number
  ContactID: number
  InvoiceType: string
  LOAtype: string
  GPC: string
  EIREmail: string
  ScheduleBEmail: string
  FormulaEmail: string
  PoCT: string
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
        TYPE: 'Physical',
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

function splitContactName(fullName?: string) {
  const normalized = (fullName ?? '').trim().replace(/\s+/g, ' ')
  if (!normalized) {
    return {
      firstName: '',
      lastName: '',
    }
  }

  const [firstName = '', ...lastNameParts] = normalized.split(' ')
  return {
    firstName,
    lastName: lastNameParts.join(' '),
  }
}

function buildResolveContactPayload(
  contact: ResolutionContactData | undefined,
  flags: Pick<ResolveContactPayload, 'PrimaryCT' | 'BillingCT' | 'WebCT' | 'OtherCT'>,
): ResolveContactPayload {
  const { firstName, lastName } = splitContactName(contact?.name)

  return {
    CompanyTitle: contact?.title ?? '',
    PrimaryCT: flags.PrimaryCT,
    BillingCT: flags.BillingCT,
    WebCT: flags.WebCT,
    OtherCT: flags.OtherCT,
    Title: contact?.title ?? '',
    FirstName: firstName,
    LastName: lastName,
    Voice: contact?.phone ?? '',
    Fax: '',
    Email: contact?.email ?? '',
    Cell: contact?.phone ?? '',
  }
}

function buildResolveCompanyPayload({
  applicationId,
  taskInstanceId,
  companyData,
}: {
  applicationId: string | number
  taskInstanceId: string | number
  companyData: CompanyData
}): ResolveCompanyPayload {
  return {
    application_id: applicationId,
    task_instance_id: taskInstanceId,
    company_name: companyData.companyName,
    address: {
      type: 'Physical',
      attn: '',
      street1: companyData.companyAddress,
      street2: companyData.companyAddress2 ?? '',
      city: companyData.companyCity,
      state: companyData.companyState ?? '',
      zip: companyData.ZipPostalCode ?? '',
      country: companyData.companyCountry,
    },
    primary_contact: buildResolveContactPayload(companyData.primaryContact, {
      PrimaryCT: 1,
      BillingCT: 0,
      WebCT: 0,
      OtherCT: 0,
    }),
    billing_contact: buildResolveContactPayload(companyData.billingContact, {
      PrimaryCT: 0,
      BillingCT: 1,
      WebCT: 0,
      OtherCT: 0,
    }),
  }
}

function buildResolvePlantPayload({
  applicationId,
  taskInstanceId,
  companyId,
  plantId,
  plantData,
  createNewPlant,
}: {
  applicationId: string | number
  taskInstanceId: string | number
  companyId: string | number
  plantId?: string | number
  plantData: PlantData
  createNewPlant: boolean
}): ResolvePlantPayload {
  return {
    application_id: applicationId,
    task_instance_id: taskInstanceId,
    company_id: companyId,
    ...(createNewPlant || plantId == null ? {} : { plant_id: plantId }),
    plant_name: plantData.plantName,
    address: {
      type: 'Physical',
      attn: '',
      street1: plantData.plantAddress,
      street2: '',
      city: plantData.plantCity,
      state: plantData.plantState ?? '',
      zip: plantData.plantZip ?? '',
      country: plantData.plantCountry,
    },
    primary_contact: buildResolveContactPayload(plantData.primaryContact, {
      PrimaryCT: createNewPlant ? 1 : 0,
      BillingCT: 0,
      WebCT: 0,
      OtherCT: createNewPlant ? 0 : 1,
    }),
    billing_contact: buildResolveContactPayload(plantData.marketingContact, {
      PrimaryCT: 0,
      BillingCT: 0,
      WebCT: 0,
      OtherCT: 1,
    }),
  }
}

function buildContactPayloadFromApplication(appValue: AppContactValue, username?: string): {
  data: { attributes: ContactApiAttributes; type: 'Contacts' }
} {
  const { firstName, lastName } = splitContactName(appValue.name)

  return {
    data: {
      attributes: {
        Title: appValue.title ?? '',
        FirstName: firstName,
        LastName: lastName,
        Voice: appValue.phone ?? '',
        Email: appValue.email ?? '',
        Cell: appValue.phone ?? '',
        EnteredBy: username ?? '',
        Active: 1,
      },
      type: 'Contacts',
    },
  }
}

function buildCompanyContactPayloadFromApplication({
  companyId,
  companyTitle,
  contactId,
  isPrimary,
  isBilling,
  isOther,
}: {
  companyId: string | number
  companyTitle?: string
  contactId: string | number
  isPrimary: boolean
  isBilling: boolean
  isOther: boolean
}): {
  data: { attributes: CompanyContactApiAttributes; type: 'CompanyContactTB' }
} {
  const parsedCompanyId = toPositiveInteger(companyId)
  if (parsedCompanyId == null) {
    throw createApiError('Invalid company id for CompanyContactTB payload')
  }

  const parsedContactId = toPositiveInteger(contactId)
  if (parsedContactId == null) {
    throw createApiError('Invalid contact id for CompanyContactTB payload')
  }

  return {
    data: {
      attributes: {
        Company_ID: parsedCompanyId,
        CompanyTitle: companyTitle ?? '',
        PrimaryCT: isPrimary ? 'Y' : 'N',
        BillingCT: isBilling ? 'Y' : 'N',
        WebCT: 'N',
        OtherCT: isOther ? 'Y' : 'N',
        Active: 1,
        ContactID: parsedContactId,
        PoCT: 'N',
        CopackerCT: 'N',
      },
      type: 'CompanyContactTB',
    },
  }
}

function buildPlantContactPayloadFromApplication({
  ownsId,
  companyTitle,
  contactId,
  isPrimary,
  isBilling,
  isWeb,
  isOther,
}: {
  ownsId: string | number
  companyTitle?: string
  contactId: string | number
  isPrimary: boolean
  isBilling: boolean
  isWeb: boolean
  isOther: boolean
}): {
  data: { attributes: PlantContactApiAttributes; type: 'PlantContactTB' }
} {
  const parsedOwnsId = toPositiveInteger(ownsId)
  if (parsedOwnsId == null) {
    throw createApiError('Invalid owns id for PlantContactTB payload')
  }

  const parsedContactId = toPositiveInteger(contactId)
  if (parsedContactId == null) {
    throw createApiError('Invalid contact id for PlantContactTB payload')
  }

  return {
    data: {
      attributes: {
        Owns_ID: parsedOwnsId,
        CompanyTitle: companyTitle ?? '',
        PrimaryCT: isPrimary ? 'Y' : 'N',
        BillingCT: isBilling ? 'Y' : 'N',
        WebCT: isWeb ? 'Y' : 'N',
        OtherCT: isOther ? 'Y' : 'N',
        Active: 1,
        ContactID: parsedContactId,
        InvoiceType: '',
        LOAtype: '',
        GPC: '',
        EIREmail: '',
        ScheduleBEmail: '',
        FormulaEmail: '',
        PoCT: 'N',
      },
      type: 'PlantContactTB',
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

export async function createContactFromApplication({
  appValue,
  username,
  token,
}: {
  appValue: AppContactValue
  username?: string
  token?: string | null
}): Promise<any> {
  const body = buildContactPayloadFromApplication(appValue, username)
  return await fetchWithAuth({
    path: '/api/Contacts',
    method: 'POST',
    body,
    token,
  })
}

export async function createCompanyContactLinkFromApplication({
  companyId,
  companyTitle,
  contactId,
  isPrimary,
  isBilling,
  isOther,
  token,
}: {
  companyId: string | number
  companyTitle?: string
  contactId: string | number
  isPrimary: boolean
  isBilling: boolean
  isOther: boolean
  token?: string | null
}): Promise<any> {
  const body = buildCompanyContactPayloadFromApplication({
    companyId,
    companyTitle,
    contactId,
    isPrimary,
    isBilling,
    isOther,
  })
  return await fetchWithAuth({
    path: '/api/CompanyContactTB',
    method: 'POST',
    body,
    token,
  })
}

export async function createPlantContactLinkFromApplication({
  ownsId,
  companyTitle,
  contactId,
  isPrimary,
  isBilling,
  isWeb,
  isOther,
  token,
}: {
  ownsId: string | number
  companyTitle?: string
  contactId: string | number
  isPrimary: boolean
  isBilling: boolean
  isWeb: boolean
  isOther: boolean
  token?: string | null
}): Promise<any> {
  const body = buildPlantContactPayloadFromApplication({
    ownsId,
    companyTitle,
    contactId,
    isPrimary,
    isBilling,
    isWeb,
    isOther,
  })
  return await fetchWithAuth({
    path: '/api/PlantContactTB',
    method: 'POST',
    body,
    token,
  })
}

export async function resolveCompanyFromApplication({
  applicationId,
  taskInstanceId,
  companyData,
  token,
}: {
  applicationId: string | number
  taskInstanceId: string | number
  companyData: CompanyData
  token?: string | null
}): Promise<any> {
  const body = buildResolveCompanyPayload({
    applicationId,
    taskInstanceId,
    companyData,
  })

  return await fetchWithAuth({
    path: '/resolve_company',
    method: 'POST',
    body,
    token,
  })
}

export async function resolvePlantFromApplication({
  applicationId,
  taskInstanceId,
  companyId,
  plantId,
  plantData,
  createNewPlant,
  token,
}: {
  applicationId: string | number
  taskInstanceId: string | number
  companyId: string | number
  plantId?: string | number
  plantData: PlantData
  createNewPlant: boolean
  token?: string | null
}): Promise<any> {
  const body = buildResolvePlantPayload({
    applicationId,
    taskInstanceId,
    companyId,
    plantId,
    plantData,
    createNewPlant,
  })

  return await fetchWithAuth({
    path: '/resolve_plant',
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
