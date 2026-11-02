import { getApiBaseUrl } from '@/lib/utils'
import { cognitoLogout, getAccessToken, refreshAccessToken } from '@/auth/authService'
import { createAppError, isAppError } from './errors'
import type { ExpectBody, FetchOptions, UserContext } from './types'

const DEFAULT_TIMEOUT_MS = 30000

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

    if (userContext?.apiBaseUrl && userContext.apiBaseUrl === getApiBaseUrl()) {
      console.debug('[API] Using context URL:', userContext.apiBaseUrl)
      return userContext.apiBaseUrl
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

export async function executeRequest<T = Response>(
  url: string,
  options: RequestInit & { timeoutMs?: number | false },
  token: string | null | undefined,
  consume?: (response: Response) => Promise<T>,
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...requestOptions } = options
  // Long-lived streams opt out; ordinary API requests retain their timeout.
  const optionsWithTimeout = timeoutMs === false
    ? requestOptions
    : withTimeout(requestOptions, Number(timeoutMs) || DEFAULT_TIMEOUT_MS)

  try {
    let response = await fetch(url, optionsWithTimeout)

    if (response.status === 401 && token) {
      await response.body?.cancel()
      optionsWithTimeout.signal?.throwIfAborted()
      try {
        console.debug('[API] Token expired, attempting refresh...')
        const newToken = await refreshAccessToken()
        optionsWithTimeout.signal?.throwIfAborted()
        const newHeaders = new Headers(options.headers)
        newHeaders.set('Authorization', `Bearer ${newToken}`)

        console.debug('[API] Token refresh successful')
        // Keep request/network failures separate from refresh failures.
        optionsWithTimeout.headers = newHeaders
      } catch (err) {
        if (optionsWithTimeout.signal?.aborted) throw err
        console.error('[API] Token refresh failed.')
        cognitoLogout()
        throw createAppError('Session expired. Please log in again.', {
          status: 401,
          code: 'AUTH_ERROR',
        })
      }

      response = await fetch(url, optionsWithTimeout)
      if (response.status === 401) {
        await response.body?.cancel()
        optionsWithTimeout.signal?.throwIfAborted()
        cognitoLogout()
        throw createAppError('Session expired. Please log in again.', {
          status: 401,
          code: 'AUTH_ERROR',
        })
      }
    }

    // JSON callers consume the body inside the same request deadline. SSE callers
    // deliberately omit a consumer and opt out of the timeout.
    return consume ? await consume(response) : response as T
  } catch (err) {
    if (optionsWithTimeout.signal?.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
      throw createAppError('Request timed out. Please try again.', {
        code: 'TIMEOUT_ERROR',
      })
    }

    if (isAppError(err)) {
      throw err
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
  const text = await response.text()
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

const nonEmptyText = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined

/**
 * The server's reason from an error body: `message`/`error`, or the first JSON:API
 * `errors[]` entry (SAFRS and the generic-API guard refusals put it in `detail`/`title`).
 */
export function apiErrorMessage(errorBody: unknown): string | undefined {
  if (!errorBody || typeof errorBody !== 'object') return undefined
  const record = errorBody as { message?: unknown; error?: unknown; errors?: unknown }
  const direct = nonEmptyText(record.message) ?? nonEmptyText(record.error)
  if (direct) return direct
  const first: unknown = Array.isArray(record.errors) ? record.errors[0] : undefined
  if (!first || typeof first !== 'object') return undefined
  const entry = first as { detail?: unknown; title?: unknown }
  return nonEmptyText(entry.detail) ?? nonEmptyText(entry.title)
}

/** JSON:API (SAFRS) writes answer with the written record, `{data: {...}}`. */
export function isJsonApiRecord(body: unknown): boolean {
  const data = body && typeof body === 'object' && !Array.isArray(body) ? (body as { data?: unknown }).data : undefined
  return Boolean(data) && typeof data === 'object' && !Array.isArray(data)
}

export const WRITE_NOT_CONFIRMED_MESSAGE = 'The server did not confirm the change. Nothing was saved.'

/**
 * Reads a successful response body. With `expectBody`, an empty (incl. 204), unreadable or
 * unexpected body rejects with WRITE_NOT_CONFIRMED_MESSAGE instead of resolving as success.
 */
export async function readSuccessBody<T = unknown>(
  response: Response,
  request: { method: string; path: string; expectBody?: ExpectBody },
): Promise<T> {
  const { expectBody } = request
  const notConfirmed = (reason: string, body: unknown) =>
    createAppError(WRITE_NOT_CONFIRMED_MESSAGE, {
      status: 502,
      code: 'API_ERROR',
      details: { reason, method: request.method, path: request.path, status: response.status, body },
    })

  const text = await response.text()
  if (response.status === 204 || !text.trim()) {
    if (expectBody) throw notConfirmed('empty response', text)
    return undefined as T
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    if (expectBody) throw notConfirmed('invalid JSON response', text.slice(0, 500))
    throw createAppError('The server returned an invalid JSON response. Please try again.', {
      status: response.status,
      code: 'API_ERROR',
    })
  }
  if (expectBody && (parsed === null || (typeof expectBody === 'function' && !expectBody(parsed)))) {
    throw notConfirmed('unexpected response', parsed)
  }
  return parsed as T
}

export async function fetchWithAuth<T = unknown>({
  path,
  method = 'GET',
  body,
  token,
  headers = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
  expectBody,
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

  return executeRequest<T>(url, requestOptions, accessToken, async (response) => {
    if (!response.ok) {
      const errorBody = await parseErrorBody(response)
      const message =
        apiErrorMessage(errorBody) ?? `Request failed: ${response.status} ${response.statusText}`

      throw createAppError(message, {
        status: response.status,
        details: errorBody,
        code: 'API_ERROR',
      })
    }

    return readSuccessBody<T>(response, { method, path, expectBody })
  })
}
