import { getAccessToken } from '@/auth/authService'
import { createAppError } from '@/shared/api/errors'
import { fetchWithAuth } from '@/shared/api/httpClient'
import type { ApplicationTasksResponse } from '@/types/application'

const createApiError = (message: string, status?: number, details?: unknown) =>
  createAppError(message, { status, details, code: 'API_ERROR' })

export async function fetchRoles({
  token,
}: {
  token?: string | null
} = {}): Promise<any[]> {
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
}): Promise<any> {
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
  })
}

export async function fetchProfileLayout({
  token,
  username,
}: {
  token?: string | null
  username?: string
}): Promise<any> {
  const params = new URLSearchParams()
  if (username) {
    params.append('filter[Username]', username)
  }

  const queryString = params.toString()
  const path = `/api/WFUserProfile${queryString ? `?${queryString}` : ''}`

  const response = await fetchWithAuth<ApplicationTasksResponse>({
    path,
    token,
  })

  return response.data
}
