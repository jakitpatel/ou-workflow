import type { AppError } from './types'

export function humanizeServerRefusal(message: string): string {
  if (!/Grant Security Error|generic API.*access on entity/i.test(message)) return message
  const application = message.match(/not authorized on application\s+(\d+)/i)?.[1]
  const entity = message.match(/access on entity:\s*(\w+)/i)?.[1]
  const action = entity === 'WFApplicationMessage' ? 'add messages to' : 'make this change to'
  return application
    ? `You do not have permission to ${action} application ${application}. Ask the assigned coordinator or an administrator for access.`
    : 'You do not have permission to make this change. Ask an administrator for access.'
}

const appErrorBrand = Symbol('AppError')
type BrandedAppError = AppError & { [appErrorBrand]: true }

export function createAppError(
  message: string,
  options?: {
    status?: number
    details?: unknown
    code?: AppError['code']
  },
): AppError {
  const error = new Error(humanizeServerRefusal(message)) as BrandedAppError
  error[appErrorBrand] = true
  error.status = options?.status
  error.details = options?.details ?? (error.message !== message ? { reason: message } : undefined)
  error.code = options?.code ?? 'API_ERROR'
  return error
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof Error && (value as Partial<BrandedAppError>)[appErrorBrand] === true
}
