import { fetchWithAuth } from '@/shared/api/httpClient'

export type ApplicationStat = { dayRange: string; totalApps: number }

/** One status's application counts per day range (e.g. COMPLETED: 0-30 Days = 37). */
export type StatusStatSeries = { status: string; rows: ApplicationStat[] }

/**
 * get_stats, as shown on the Stats page:
 * - `overall`: the "dayRange" series (applications per day range)
 * - `statuses`: one series per status key (COMPLETED, LEGACY, REVIEW, WAITING, WTH, ...)
 */
export type ApplicationStats = { overall: ApplicationStat[]; statuses: StatusStatSeries[] }

/** The key of the overall series inside stats.stats. */
const OVERALL_KEY = 'dayRange'

const rangeStart = (label: string) => Number(label.match(/^\d+/)?.[0] ?? Infinity)

/** Orders day-range labels by their first number ("0-30 Days" before "31-60 Days"). */
export const compareDayRanges = (a: string, b: string) => rangeStart(a) - rangeStart(b)

function parseRows(rows: unknown): ApplicationStat[] {
  if (!Array.isArray(rows)) throw new Error('Unable to load application stats.')
  return rows
    .map((row: unknown) => {
      if (!row || typeof row !== 'object') throw new Error('Invalid stats row.')
      const value = row as Record<string, unknown>
      if (
        typeof value.DayRange !== 'string' ||
        !value.DayRange.trim() ||
        typeof value.TotalApps !== 'number' ||
        !Number.isSafeInteger(value.TotalApps) ||
        value.TotalApps < 0
      ) {
        throw new Error('Invalid application count or day range.')
      }
      return { dayRange: value.DayRange.trim(), totalApps: value.TotalApps }
    })
    .sort((a, b) => compareDayRanges(a.dayRange, b.dayRange))
}

/**
 * Accepts the current shape, where stats.stats is an object of series keyed by status plus
 * "dayRange", and the earlier shape, where stats.stats was the day-range array itself.
 */
export function parseStats(response: unknown): ApplicationStats {
  if (!response || typeof response !== 'object') throw new Error('Invalid stats response.')
  const payload = response as Record<string, unknown>
  const stats = payload.stats
  if (payload.status !== 'ok' || !stats || typeof stats !== 'object')
    throw new Error('Unable to load application stats.')
  const series = (stats as Record<string, unknown>).stats

  if (Array.isArray(series)) return { overall: parseRows(series), statuses: [] }
  if (!series || typeof series !== 'object') throw new Error('Unable to load application stats.')

  const entries = Object.entries(series as Record<string, unknown>)
  const overallEntry = entries.find(([key]) => key === OVERALL_KEY)
  return {
    overall: overallEntry ? parseRows(overallEntry[1]) : [],
    statuses: entries
      .filter(([key]) => key !== OVERALL_KEY)
      .map(([status, rows]) => ({ status, rows: parseRows(rows) })),
  }
}

export async function fetchStats(token?: string | null): Promise<ApplicationStats> {
  return parseStats(await fetchWithAuth<unknown>({ path: '/get_stats', token }))
}
