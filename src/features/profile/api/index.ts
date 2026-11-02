import { getAccessToken } from '@/auth/authService'
import { createAppError } from '@/shared/api/errors'
import { fetchWithAuth, isJsonApiRecord } from '@/shared/api/httpClient'
import type { UserRole } from '@/types/application'

const createApiError = (message: string, status?: number, details?: unknown) =>
  createAppError(message, { status, details, code: 'API_ERROR' })

type JsonApiRecord<TAttributes> = {
  id?: string
  type?: string
  attributes?: TAttributes
}

type JsonApiListResponse<TAttributes> = {
  data?: JsonApiRecord<TAttributes>[]
}

type UserPersonAttributes = {
  KashLogIn?: string
  FIRST?: string
  LAST?: string
  PREFIX?: string
}

export type UserPerson = {
  KashLogIn: string
  FIRST: string
  LAST: string
  PREFIX: string
}

const normalizeUserPerson = (
  record: JsonApiRecord<UserPersonAttributes> | undefined,
): UserPerson | null => {
  const attributes = record?.attributes
  if (!attributes) {
    return null
  }

  return {
    KashLogIn: String(attributes.KashLogIn ?? '').trim(),
    FIRST: String(attributes.FIRST ?? '').trim(),
    LAST: String(attributes.LAST ?? '').trim(),
    PREFIX: String(attributes.PREFIX ?? '').trim(),
  }
}

export async function fetchRoles({
  token,
}: {
  token?: string | null
} = {}): Promise<UserRole[]> {
  const accessToken = token ?? getAccessToken()

  if (!accessToken) {
    throw createApiError('Access token missing. Please login again.', 401)
  }

  return await fetchWithAuth({
    path: '/auth/exchange-cognito-token',
    method: 'POST',
    body: { token: accessToken },
    token,
  })
}

export async function saveProfileLayout({
  token,
  username,
  profileLayout,
}: {
  token?: string | null
  username?: string
  profileLayout?: string
}): Promise<unknown> {
  const body = {
    data: {
      type: 'WFUserProfile',
      attributes: {
        Username: username,
        Profile: profileLayout,
        CreatedDate: new Date().toISOString(),
      },
    },
  }

  return fetchWithAuth({
    path: '/api/WFUserProfile',
    method: 'POST',
    body,
    token,
    expectBody: isJsonApiRecord,
  })
}

export async function fetchProfileLayout({
  token,
  username,
}: {
  token?: string | null
  username?: string
}): Promise<JsonApiRecord<{ Profile?: string }>[]> {
  const params = new URLSearchParams()
  if (username) {
    params.append('filter[Username]', username)
  }

  const queryString = params.toString()
  const path = `/api/WFUserProfile${queryString ? `?${queryString}` : ''}`

  const response = await fetchWithAuth<{ data: JsonApiRecord<{ Profile?: string }>[] }>({
    path,
    token,
  })

  return response.data
}

export async function fetchUserPerson({
  token,
  username,
}: {
  token?: string | null
  username?: string
}): Promise<UserPerson | null> {
  const params = new URLSearchParams()
  if (username) {
    params.append('filter[KashLogIn]', username)
  }

  const queryString = params.toString()
  const path = `/api/PERSONTB${queryString ? `?${queryString}` : ''}`

  const response = await fetchWithAuth<JsonApiListResponse<UserPersonAttributes>>({
    path,
    token,
  })

  return normalizeUserPerson(response.data?.[0])
}
