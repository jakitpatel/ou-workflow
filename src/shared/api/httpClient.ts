import { getApiBaseUrl } from '@/lib/utils'
import { cognitoLogout, getAccessToken, refreshAccessToken } from '@/auth/authService'
import { createAppError, isAppError } from './errors'
import type { FetchOptions, UserContext } from './types'

const DEFAULT_TIMEOUT_MS = 30000

type AppConfig = Record<string, string>

function withTimeout(options: RequestInit, timeoutMs: number): RequestInit {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  const mergedSignal =
    options.signal == null
      ? controller.signal
      : AbortSignal.any([options.signal, controller.signal])

  return {
    ...options,
    signal: mergedSignal,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __timeoutCleanup: () => clearTimeout(timeout),
  } as RequestInit
}

function clearTimeoutCleanup(options: RequestInit) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cleanup = (options as any).__timeoutCleanup
  if (typeof cleanup === 'function') {
    cleanup()
  }
}

export function resolveApiBaseUrl(): string {
  try {
    const userContext = (window as Window & { __USER_CONTEXT__?: UserContext }).__USER_CONTEXT__

    if (userContext?.apiBaseUrl) {
      console.debug('[API] Using context URL:', userContext.apiBaseUrl)
      return userContext.apiBaseUrl
    }

    const config = (window as Window & { __APP_CONFIG__?: AppConfig }).__APP_CONFIG__
    if (config) {
      const servers = Object.keys(config)
        .filter((key) => key.startsWith('API_CLIENT_URL'))
        .map((key) => config[key])

      if (servers.length > 0) {
        console.debug('[API] Using config URL:', servers[0])
        return servers[0]
      }
    }

    const fallback = getApiBaseUrl()
    console.debug('[API] Using fallback URL:', fallback)
    return fallback
  } catch (err) {
    console.warn('[API] Error resolving base URL:', err)
    return getApiBaseUrl()
  }
}

export function registerUserContext(ctx: UserContext): void {
  ;(window as Window & { __USER_CONTEXT__?: UserContext }).__USER_CONTEXT__ = ctx
}

export async function executeRequest(
  url: string,
  options: RequestInit,
  token: string | null | undefined,
): Promise<Response> {
  const timeoutMs =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Number((options as any).timeoutMs ?? DEFAULT_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS
  const optionsWithTimeout = withTimeout(options, timeoutMs)

  try {
    let response = await fetch(url, optionsWithTimeout)

    if (response.status === 401 && token) {
      try {
        console.debug('[API] Token expired, attempting refresh...')
        const newToken = await refreshAccessToken()
        const newHeaders = new Headers(options.headers)
        newHeaders.set('Authorization', `Bearer ${newToken}`)

        response = await fetch(url, {
          ...optionsWithTimeout,
          headers: newHeaders,
        })

        console.debug('[API] Token refresh successful')
      } catch (err) {
        console.error('[API] Token refresh failed:', err)
        cognitoLogout()
        throw createAppError('Session expired. Please log in again.', {
          status: 401,
          code: 'AUTH_ERROR',
        })
      }
    }

    return response
  } catch (err) {
    if (isAppError(err)) {
      throw err
    }

    if (err instanceof DOMException && err.name === 'AbortError') {
      throw createAppError('Request timed out. Please try again.', {
        code: 'TIMEOUT_ERROR',
      })
    }

    throw createAppError('Network error. Please check your connection.', {
      code: 'NETWORK_ERROR',
      details: err,
    })
  } finally {
    clearTimeoutCleanup(optionsWithTimeout)
  }
}

export async function parseErrorBody(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return await response.text().catch(() => null)
  }
}

export async function fetchWithAuth<T = unknown>({
  path,
  method = 'GET',
  body,
  token,
  headers = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: FetchOptions): Promise<T> {
  const baseUrl = resolveApiBaseUrl()
  const url = `${baseUrl}${path}`
  const accessToken = token ?? getAccessToken()

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  }

  if (accessToken) {
    requestHeaders.Authorization = `Bearer ${accessToken}`
  }

  const requestOptions: RequestInit = {
    method,
    headers: requestHeaders,
    body: body == null ? undefined : JSON.stringify(body),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(requestOptions as any).timeoutMs = timeoutMs

  const response = await executeRequest(url, requestOptions, accessToken)

  if (!response.ok) {
    const errorBody = await parseErrorBody(response)
    const message =
      (errorBody as { message?: string; error?: string } | null)?.message ??
      (errorBody as { message?: string; error?: string } | null)?.error ??
      `Request failed: ${response.status} ${response.statusText}`

    throw createAppError(message, {
      status: response.status,
      details: errorBody,
      code: 'API_ERROR',
    })
  }

  return (await response.json()) as T
}
