import { fetchWithAuth } from '@/shared/api/httpClient'

export type ApplicationStat = { dayRange: string; totalApps: number }

export function parseStats(response: unknown): ApplicationStat[] {
  if (!response || typeof response !== 'object') throw new Error('Invalid stats response.')
  const payload = response as Record<string, unknown>
  const stats = payload.stats
  if (payload.status !== 'ok' || !stats || typeof stats !== 'object')
    throw new Error('Unable to load application stats.')
  const rows = (stats as Record<string, unknown>).stats
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
    .sort((a, b) => {
      const start = (label: string) => Number(label.match(/^\d+/)?.[0] ?? Infinity)
      return start(a.dayRange) - start(b.dayRange)
    })
}

export async function fetchStats(token?: string | null): Promise<ApplicationStat[]> {
  return parseStats(await fetchWithAuth<unknown>({ path: '/get_stats', token }))
}
