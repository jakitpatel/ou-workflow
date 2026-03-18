export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface AppError extends Error {
  status?: number
  details?: unknown
  code: 'API_ERROR' | 'NETWORK_ERROR' | 'TIMEOUT_ERROR' | 'AUTH_ERROR'
}

export interface UserContext {
  apiBaseUrl?: string | null
}

export interface FetchOptions {
  path: string
  method?: HttpMethod
  body?: unknown
  token?: string | null
  headers?: Record<string, string>
  timeoutMs?: number
}
