import { humanizeServerRefusal, isAppError } from './errors'

export const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (isAppError(error)) return error.message
  if (error instanceof TypeError && /failed to fetch|network|load failed/i.test(error.message)) {
    return 'Network error. Please check your connection.'
  }
  const record = asRecord(error)
  const details = asRecord(record.details)
  const message = details.status || details.message || record.message
  return typeof message === 'string' && message.trim() ? humanizeServerRefusal(message) : fallback
}
