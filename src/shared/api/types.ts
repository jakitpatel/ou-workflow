export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface AppError extends Error {
  status?: number
  details?: unknown
  code: 'API_ERROR' | 'NETWORK_ERROR' | 'TIMEOUT_ERROR' | 'AUTH_ERROR'
}

export interface UserContext {
  apiBaseUrl?: string | null
}

/**
 * A write's proof of success. `true` requires a non-empty JSON body; a function decides whether the
 * parsed body confirms the change. An empty or unreadable 2xx then rejects instead of resolving
 * `undefined`, which callers would otherwise treat as saved.
 */
export type ExpectBody = boolean | ((body: unknown) => boolean)

export interface FetchOptions {
  path: string
  method?: HttpMethod
  body?: unknown
  token?: string | null
  headers?: Record<string, string>
  timeoutMs?: number
  expectBody?: ExpectBody
}
