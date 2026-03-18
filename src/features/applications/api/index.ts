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
  KashrusCompanyDetailsResponse,
  KashrusPlantDetailsResponse,
  UserRoleResponse,
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
