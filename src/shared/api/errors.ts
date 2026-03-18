import type { AppError } from './types'

export function createAppError(
  message: string,
  options?: {
    status?: number
    details?: unknown
    code?: AppError['code']
  },
): AppError {
  const error = new Error(message) as AppError
  error.status = options?.status
  error.details = options?.details
  error.code = options?.code ?? 'API_ERROR'
  return error
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof Error && 'code' in value
}
