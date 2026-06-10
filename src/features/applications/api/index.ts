import { getAccessToken } from '@/auth/authService'
import {
  executeRequest,
  fetchWithAuth,
  parseErrorBody,
  resolveApiBaseUrl,
} from '@/shared/api/httpClient'
import { createAppError } from '@/shared/api/errors'
import {
  addFilterParams,
  buildPaginationParams,
  buildSortParams,
  mergeParams,
} from '@/shared/api/queryParams'
import type {
  ApplicantsResponse,
  ApplicationDetail,
  Applicant,
  KashProduct,
  KashrusCompanyDetailsResponse,
  KashrusPlantDetailsResponse,
  ScheduleAIngredientsResult,
  ScheduleAIngredientsResponse,
  ScheduleAIngredient,
  ScheduleBProduct,
  ScheduleBProductsResponse,
  ScheduleBProductsResult,
  UserRoleResponse,
  ApplicationEmail,
  WFApplicationMessageRecord,
} from '@/types/application'
import {
  mapApplicantsResponse,
  mapApplicationDetailResponse,
  type BackendApplicantsResponse,
  type BackendApplicationDetailResponse,
} from './mappers'

const createApiError = (message: string, status?: number, details?: unknown) =>
  createAppError(message, { status, details, code: 'API_ERROR' })

function normalizeLookupText(value: unknown): string {
  return String(value ?? '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function fetchApplicants({
  page = 0,
  limit = 20,
  token,
  searchTerm,
  statusFilter,
  priorityFilter,
  applicationId,
  myOnly,
  role,
}: FetchApplicantsRequest = {}): Promise<ApplicantsResponse> {
  const params = buildPaginationParams(page, limit)

  addFilterParams(params, {
    'filter[name]': searchTerm,
    'filter[status]': statusFilter,
    'filter[priority]': priorityFilter,
  })

  if (applicationId !== undefined) {
    params.append('filter[applicationId]', String(applicationId))
  }

  if (myOnly !== false) {
    params.append('filter[OnlyMyRoles]', 'true')
    if (typeof role === 'string' && role.toLocaleLowerCase() !== 'all') {
      params.append('filter[role]', String(role))
    }
  }

  const response = await fetchWithAuth<BackendApplicantsResponse>({
    path: `/get_applications_v1?${params.toString()}`,
    token,
  })

  return mapApplicantsResponse(response)
}

export type FetchApplicantsRequest = {
  page?: number
  limit?: number
  token?: string | null
  searchTerm?: string
  statusFilter?: string
  priorityFilter?: string
  applicationId?: number
  myOnly?: string | boolean
  role?: string | null
}

export async function fetchUserByRole({
  token,
  endpoint = 'api/vSelectNCRC',
}: {
  token?: string | null
  endpoint?: string
} = {}): Promise<
  Array<{
    name: string
    id: string
    lookupKey: string
    assigneeValue: string
    personId?: string
    email?: string
    userName?: string
    fullName?: string
    userRole?: string
    state?: string
    isActive?: boolean
    rfr?: string
    pct_of_total_apps?: number
    pct_of_total_apps_at_work?: number
  }>
> {
  const paginationParams = buildPaginationParams(0, 10000)
  const sortParams = buildSortParams('fullName')
  const params = mergeParams(paginationParams, sortParams)

  const response = await fetchWithAuth<UserRoleResponse>({
    path: `/${endpoint}?${params.toString()}`,
    token,
  })

  return response.data.map((item: any) => {
    const attributes = item.attributes ?? {}
    const fullName = normalizeLookupText(
      attributes.fullName ?? attributes.FullName ?? attributes.RFR ?? item.id,
    )
    const userName = normalizeLookupText(attributes.userName)
    const personId = normalizeLookupText(attributes.PERSON_ID ?? item.id)
    const email = normalizeLookupText(attributes.Email ?? attributes.BusinessEmail)
    const assigneeValue = userName || personId
    const lookupKey =
      personId ||
      assigneeValue ||
      normalizeLookupText(item.links?.self) ||
      normalizeLookupText(item.id)

    return {
      name: fullName,
      id: assigneeValue,
      lookupKey,
      assigneeValue,
      personId,
      email,
      userName,
      fullName,
      userRole: attributes.UserRole,
      state: normalizeLookupText(attributes.state ?? attributes.State ?? attributes.STATE),
      isActive: attributes.IsActive,
      rfr: normalizeLookupText(attributes.RFR) || fullName,
      pct_of_total_apps: attributes.pct_of_total_apps,
      pct_of_total_apps_at_work: attributes.pct_of_total_apps_at_work,
    }
  })
}

export async function uploadApplicationFile({
  file,
  fileUrl,
  fileName,
  applicationId,
  taskInstanceID,
  description,
  token,
}: {
  file?: File
  fileUrl?: string
  fileName?: string
  applicationId?: string | number | null
  taskInstanceID?: string | number | null
  description?: string
  token?: string | null
}): Promise<any> {
  const baseUrl = resolveApiBaseUrl()
  const uploadBaseUrl = baseUrl.replace('/api', '')
  const url = `${uploadBaseUrl}/upload_files`
  const accessToken = token ?? getAccessToken()

  const formData = new FormData()

  if (file) {
    formData.append('file', file, file.name)
  } else if (fileUrl?.trim()) {
    formData.append('file_url', fileUrl.trim())
    const urlFileName = fileName ?? fileUrl.trim().split('/').pop() ?? 'linked_file'
    formData.append('file_name', urlFileName)
  } else {
    throw createApiError('Please select a file or provide a URL.', 400)
  }

  if (applicationId !== '' && applicationId !== null && applicationId !== undefined) {
    formData.append('application_id', String(applicationId))
  }

  if (taskInstanceID !== '' && taskInstanceID !== null && taskInstanceID !== undefined) {
    formData.append('task_instance_id', String(taskInstanceID))
  }

  if (description?.trim()) {
    formData.append('description', description.trim())
  }

  const requestHeaders: Record<string, string> = {}
  if (accessToken) {
    requestHeaders.Authorization = `Bearer ${accessToken}`
  }

  const requestOptions: RequestInit = {
    method: 'POST',
    headers: requestHeaders,
    body: formData,
  }

  const response = await executeRequest(url, requestOptions, accessToken)

  if (!response.ok) {
    const errorBody = await parseErrorBody(response)
    const parsedError = errorBody as { message?: string; error?: string } | null
    const message =
      parsedError?.message ??
      parsedError?.error ??
      `Request failed: ${response.status} ${response.statusText}`
    throw createApiError(message, response.status, errorBody)
  }

  try {
    return await response.json()
  } catch {
    return await response.text()
  }
}

export async function uploadScheduleAIngredientsFile({
  applicationId,
  file,
  token,
}: {
  applicationId: string | number
  file: File
  token?: string | null
}): Promise<unknown> {
  const baseUrl = resolveApiBaseUrl()
  const uploadBaseUrl = baseUrl.replace('/api', '')
  const url = `${uploadBaseUrl}/ingredient_file_upload`
  const accessToken = token ?? getAccessToken()
  const formData = new FormData()

  formData.append('application_id', String(applicationId))
  formData.append('file', file, file.name)

  const requestHeaders: Record<string, string> = {}
  if (accessToken) {
    requestHeaders.Authorization = `Bearer ${accessToken}`
  }

  const response = await executeRequest(
    url,
    {
      method: 'POST',
      headers: requestHeaders,
      body: formData,
    },
    accessToken,
  )

  if (!response.ok) {
    const errorBody = await parseErrorBody(response)
    const parsedError = errorBody as { message?: string; error?: string } | null
    const message =
      parsedError?.message ??
      parsedError?.error ??
      `Request failed: ${response.status} ${response.statusText}`
    throw createApiError(message, response.status, errorBody)
  }

  try {
    return await response.json()
  } catch {
    return await response.text()
  }
}

export async function sendMsgTask({
  newMessage,
  token,
}: {
  newMessage: any
  token?: string | null
}): Promise<any> {
  return await fetchWithAuth({
    path: '/api/WFApplicationMessage',
    method: 'POST',
    body: newMessage,
    token,
  })
}

export type ApplicationMessagePayload = {
  MessageID?: string | number | null
  ApplicationID?: string | number | null
  FromUser?: string | null
  ToUser?: string | null
  Subject?: string | null
  MessageText?: string | null
  MessageTextPlain?: string | null
  PlainText?: string | null
  Text?: string | null
  MessageType?: string | null
  Priority?: string | null
  SentDate?: string | null
  TemplateName?: string | null
  TaskInstanceId?: string | number | null
  isPrivate?: boolean
  parentMessageId?: string | number | null
  toReply?: string | number | boolean | null
  isRead?: boolean | number
  tag?: string | null
  CCUser?: string | null
  BCCUser?: string | null
  replyTo?: string | null
  Attachments?: string | null
}

export async function createApplicationMessage({
  payload,
  token,
}: {
  payload: ApplicationMessagePayload
  token?: string | null
}): Promise<any> {
  return await fetchWithAuth({
    path: '/api/WFApplicationMessage',
    method: 'POST',
    body: {
      data: {
        attributes: payload,
        type: 'WFApplicationMessage',
      },
    },
    token,
  })
}

export async function fetchApplicationMessages({
  applicationId,
  taskInstanceId,
  token,
}: {
  applicationId?: string | number | null
  taskInstanceId?: string | number | null
  token?: string | null
}): Promise<ApplicationEmail[]> {
  const params = new URLSearchParams()

  if (applicationId !== undefined && applicationId !== null && String(applicationId).trim()) {
    params.append('filter[ApplicationID]', String(applicationId).trim())
  }

  if (taskInstanceId !== undefined && taskInstanceId !== null && String(taskInstanceId).trim()) {
    params.append('filter[TaskInstanceId]', String(taskInstanceId).trim())
  }

  params.append('sort', '-MessageID')

  const response = await fetchWithAuth<
    | {
        data?: WFApplicationMessageRecord[]
        messages?: WFApplicationMessageRecord[]
        items?: WFApplicationMessageRecord[]
      }
    | WFApplicationMessageRecord[]
  >({
    path: `/api/WFApplicationMessage?${params.toString()}`,
    method: 'GET',
    token,
  })

  const records = Array.isArray(response)
    ? response
    : Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response?.messages)
        ? response.messages
        : Array.isArray(response?.items)
          ? response.items
          : []

  return records.map((record) => {
    const attributes = record.attributes ?? {}
    const tag = attributes.tag ?? attributes.Tag

    return {
      ApplicationID: attributes.ApplicationID,
      Attachments: attributes.Attachments,
      BCCUser: attributes.BCCUser,
      CCUser: attributes.CCUser,
      EmailStatus: attributes.EmailStatus,
      FromUser: attributes.FromUser,
      MessageID: attributes.MessageID ?? record.id,
      MessageText: attributes.MessageText,
      MessageTextPlain: attributes.MessageTextPlain,
      MessageType: attributes.MessageType,
      PlainText: attributes.PlainText,
      Priority: attributes.Priority,
      SentDate: attributes.SentDate,
      Subject: attributes.Subject,
      TaskInstanceId: attributes.TaskInstanceId,
      Text: attributes.Text,
      ToUser: attributes.ToUser,
      isPrivate: attributes.isPrivate,
      parentMessageId: attributes.parentMessageId,
      tag: typeof tag === 'string' ? tag : null,
    }
  })
}

export type GenerateInspectionInvoicePayload = {
  applicationId?: string | number
  applicationName?: string
  TaskInstanceId?: string | number | null
  taskName?: string
  applicant?: Partial<Applicant>
  inspectionNeeded: boolean | null
  feeRequired: boolean | null
  awaitPayment: boolean
  rfr?: {
    id: string
    name: string
    email?: string
    userName?: string
    state?: string
    region?: string
  } | null
  fee: number
  expense: number
  invoiceDate: string
  internalNotes?: string
  noInspectionReason?: string
  noFeeReason?: string
  recipient?: string
  letterTemplate?: string
}

export type GenerateInspectionInvoiceResponse = {
  invoiceId: string
  downloadLink: string
  invoicePdfUrl: string
  raw: unknown
}

function readStringFromRecord(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key]
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      return String(value).trim()
    }
  }
  return ''
}

export async function generateInspectionInvoice({
  payload,
  token,
}: {
  payload: GenerateInspectionInvoicePayload
  token?: string | null
}): Promise<GenerateInspectionInvoiceResponse> {
  const response = await fetchWithAuth<unknown>({
    path: '/generateInvoice',
    method: 'POST',
    body: payload,
    token,
  })
  const responseRecord =
    response && typeof response === 'object' && !Array.isArray(response)
      ? (response as Record<string, unknown>)
      : {}
  const data =
    responseRecord.data && typeof responseRecord.data === 'object' && !Array.isArray(responseRecord.data)
      ? (responseRecord.data as Record<string, unknown>)
      : responseRecord

  const invoiceId = readStringFromRecord(data, [
    'invoiceId',
    'invoice_id',
    'invoiceID',
    'InvoiceID',
    'InvoiceId',
    'id',
  ])
  const downloadLink = readStringFromRecord(data, [
    'downloadLink',
    'download_link',
    'downloadUrl',
    'download_url',
    'pdfUrl',
    'pdf_url',
    'url',
  ])
  const invoicePdfUrl = readStringFromRecord(data, [
    'invoicePDFurl',
    'invoicePdfUrl',
    'invoicePDFUrl',
    'InvoicePDFurl',
    'InvoicePDFUrl',
  ])

  if (!invoiceId) {
    throw createApiError('Invoice generated but no invoice id was returned.', 500, response)
  }

  return {
    invoiceId,
    downloadLink,
    invoicePdfUrl,
    raw: response,
  }
}

export async function fetchApplicationDetail({
  applicationId,
  token,
}: {
  applicationId?: string
  token?: string | null
} = {}): Promise<ApplicationDetail> {
  if (!applicationId) {
    throw createApiError('applicationId is required', 400)
  }

  const response = await fetchWithAuth<BackendApplicationDetailResponse>({
    path: `/get_application_detail_v2?applicationId=${applicationId}`,
    token,
  })

  return mapApplicationDetailResponse(response)
}

export async function fetchCompanyDetails(companyId: number, token?: string | null) {
  const params = new URLSearchParams()
  params.append('companyId', String(companyId))
  return await fetchWithAuth<ApplicantsResponse>({
    path: `/getCompanyDetails?${params.toString()}`,
    token,
  })
}

export async function getCompanyDetailsFromKASH({
  companyID,
  token,
}: {
  companyID: string | number
  token?: string | null
}): Promise<KashrusCompanyDetailsResponse> {
  const params = new URLSearchParams()
  params.append('companyID', String(companyID))

  return await fetchWithAuth<KashrusCompanyDetailsResponse>({
    path: `/get_CompanyDetailsFromKASH?${params.toString()}`,
    token,
  })
}

export async function getPlantDetailsFromKASH({
  PlantId,
  token,
}: {
  PlantId: string | number
  token?: string | null
}): Promise<KashrusPlantDetailsResponse> {
  const params = new URLSearchParams()
  params.append('PlantId', String(PlantId))

  return await fetchWithAuth<KashrusPlantDetailsResponse>({
    path: `/get_PlantDetailsFromKASH?${params.toString()}`,
    token,
  })
}

export async function fetchScheduleAIngredients({
  applicationId,
  token,
}: {
  applicationId?: string | number
  token?: string | null
} = {}): Promise<ScheduleAIngredientsResult> {
  if (applicationId === undefined || applicationId === null || String(applicationId).trim() === '') {
    throw createApiError('applicationId is required', 400)
  }

  const params = new URLSearchParams()
  params.append('filter[ApplicationID]', String(applicationId))

  const response = await fetchWithAuth<ScheduleAIngredientsResponse>({
    path: `/get_ingredients?${params.toString()}`,
    token,
  })

  return {
    scheduleIngredients: response.ingredients?.schedule_ingredients ?? [],
    kashIngredients: response.ingredients?.ou_kash_ingredients ?? [],
  }
}

export type CreateScheduleAIngredientPayload = {
  ApplicationID: string | number
} & Partial<
  Pick<
    ScheduleAIngredient,
    | 'UKDID'
    | 'brandName'
    | 'certifyingAgency'
    | 'group'
    | 'ingredientLabelName'
    | 'manufacturer'
    | 'plantStatus'
    | 'rawMaterialCode'
  >
> & {
  source?: string
}

export async function createScheduleAIngredient({
  payload,
  token,
}: {
  payload: CreateScheduleAIngredientPayload
  token?: string | null
}): Promise<unknown> {
  return await fetchWithAuth({
    path: '/api/ScheduleIngredient',
    method: 'POST',
    body: {
      data: {
        attributes: payload,
        type: 'ScheduleIngredient',
      },
    },
    token,
  })
}

export async function updateScheduleAIngredientDeleted({
  ingredientId,
  token,
}: {
  ingredientId: string | number
  token?: string | null
}): Promise<unknown> {
  return await fetchWithAuth({
    path: '/api/ScheduleIngredient',
    method: 'PATCH',
    body: {
      data: {
        attributes: {
          IngredientId: ingredientId,
          isDeleted: true,
        },
        type: 'ScheduleIngredient',
      },
    },
    token,
  })
}

const normalizeScheduleBProducts = (
  products: ScheduleBProduct[] | undefined,
): ScheduleBProduct[] => products ?? []

const normalizeKashProducts = (products: KashProduct[] | undefined): KashProduct[] => products ?? []

export async function fetchScheduleBProducts({
  applicationId,
  token,
}: {
  applicationId?: string | number
  token?: string | null
} = {}): Promise<ScheduleBProductsResult> {
  if (applicationId === undefined || applicationId === null || String(applicationId).trim() === '') {
    throw createApiError('applicationId is required', 400)
  }

  const params = new URLSearchParams()
  params.append('filter[ApplicationID]', String(applicationId))

  const response = await fetchWithAuth<ScheduleBProductsResponse>({
    path: `/get_products?${params.toString()}`,
    token,
  })

  return {
    scheduleProducts: normalizeScheduleBProducts(response.products?.schedule_products),
    kashProducts: normalizeKashProducts(response.products?.ou_kash_products),
  }
}
