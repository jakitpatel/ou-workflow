/**
 * A small in-memory buffer of recent client errors, attached to issue reports to help reproduce
 * a problem. Messages are redacted and truncated: no tokens, email addresses, phone numbers, or
 * URL query strings. Nothing is persisted or sent anywhere unless the user submits a report.
 */

export type RecentErrorSource = 'window' | 'promise' | 'api'

export type RecentError = {
  time: string
  source: RecentErrorSource
  message: string
}

export const MAX_RECENT_ERRORS = 10
const MAX_MESSAGE_LENGTH = 300

let buffer: RecentError[] = []

const REDACTIONS: Array<[RegExp, string]> = [
  // Bearer / JWT-shaped tokens.
  [/\bBearer\s+[\w.~+/-]+=*/gi, 'Bearer [redacted]'],
  [/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[token]'],
  // Email addresses.
  [/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[email]'],
  // URL query strings and fragments (may carry search text, codes or IDs of other records).
  [/(https?:\/\/[^\s?#]+|\/[\w./-]*)[?#][^\s"')]*/g, '$1?[query]'],
  // Phone-number-like digit runs.
  [/\+?\d[\d\s().-]{8,}\d/g, '[number]'],
  // Long opaque strings (keys, hashes, encoded secrets).
  [/\b[A-Za-z0-9+/_-]{32,}={0,2}/g, '[redacted]'],
]

export function redactDiagnosticText(text: unknown, maxLength = MAX_MESSAGE_LENGTH): string {
  let value = typeof text === 'string' ? text : text instanceof Error ? text.message : String(text ?? '')
  for (const [pattern, replacement] of REDACTIONS) value = value.replace(pattern, replacement)
  value = value.replace(/\s+/g, ' ').trim()
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value
}

export function recordRecentError(source: RecentErrorSource, message: unknown, now = new Date()): void {
  const redacted = redactDiagnosticText(message)
  if (!redacted) return
  buffer = [...buffer, { time: now.toISOString(), source, message: redacted }].slice(-MAX_RECENT_ERRORS)
}

/** Oldest first. Returns a copy. */
export function getRecentErrors(): RecentError[] {
  return buffer.map((entry) => ({ ...entry }))
}

export function clearRecentErrors(): void {
  buffer = []
}

let uninstall: (() => void) | null = null

/** Records uncaught errors and unhandled promise rejections. Idempotent; returns an uninstaller. */
export function installRecentErrorCapture(target: Window = window): () => void {
  if (uninstall) return uninstall
  const onError = (event: ErrorEvent) => recordRecentError('window', event.error ?? event.message)
  const onRejection = (event: PromiseRejectionEvent) => recordRecentError('promise', event.reason)
  target.addEventListener('error', onError)
  target.addEventListener('unhandledrejection', onRejection)
  uninstall = () => {
    target.removeEventListener('error', onError)
    target.removeEventListener('unhandledrejection', onRejection)
    uninstall = null
  }
  return uninstall
}
