/** Format a calendar date without converting local midnight to UTC. */
export const localCalendarDate = (date = new Date()): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/

/**
 * A calendar date (visit date, effective date, ...) as that same day in the local time zone.
 * `new Date("2026-11-06")` means midnight UTC, which is still Nov 5 in New York, so:
 * - a value starting with YYYY-MM-DD is that day (any time part is ignored);
 * - a timestamp at exactly midnight UTC (e.g. "Fri, 06 Nov 2026 00:00:00 GMT") is its UTC day;
 * - anything else is parsed as usual. Returns null when the value is not a date.
 */
export function parseCalendarDate(value?: string | null): Date | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  const prefix = trimmed.match(DATE_PREFIX)
  if (prefix) {
    const [year, month, day] = prefix.slice(1).map(Number)
    const date = new Date(year, month - 1, day)
    return date.getMonth() === month - 1 && date.getDate() === day ? date : null
  }
  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return null
  const isUtcMidnight =
    parsed.getUTCHours() === 0 &&
    parsed.getUTCMinutes() === 0 &&
    parsed.getUTCSeconds() === 0 &&
    parsed.getUTCMilliseconds() === 0
  return isUtcMidnight
    ? new Date(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate())
    : parsed
}

/**
 * Formats a calendar date the same in every time zone ("Nov 6, 2026" by default). A value that
 * is not a date is returned as is; an empty value returns `empty`.
 */
export function formatCalendarDate(
  value?: string | null,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' },
  empty = '',
): string {
  if (!value?.trim()) return empty
  const date = parseCalendarDate(value)
  return date ? date.toLocaleDateString('en-US', options) : value
}
