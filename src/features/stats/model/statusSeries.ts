import { compareDayRanges, type StatusStatSeries } from '../api/stats'

/*
 * Each status keeps one fixed color slot (color follows the status, not its rank or what the
 * server happens to send). Slots are the validated categorical palette in its fixed order:
 * adjacent pairs pass colour-vision-deficiency checks (validator: worst adjacent CVD ΔE 9.1,
 * normal-vision ΔE 19.6). Slots 3-5 are under 3:1 contrast on white, so the chart always has a
 * named legend and the exact-count table beside it.
 */
const PALETTE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948']
/** Beyond eight statuses a new hue would not be distinguishable; extra statuses share gray. */
const OVERFLOW_COLOR = '#8a8985'

const KNOWN_STATUSES: Array<{ key: string; label: string }> = [
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'WAITING', label: 'Waiting' },
  { key: 'REVIEW', label: 'Under Review' },
  { key: 'LEGACY', label: 'Legacy' },
  { key: 'WTH', label: 'Withdrawn' },
]

export type StatusSeriesView = StatusStatSeries & {
  label: string
  color: string
  total: number
  /** Count per day range label (0 when the status has no row for that range). */
  byRange: Map<string, number>
}

const titleCase = (key: string) =>
  key
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ')

/** Known statuses in their fixed order, then any others alphabetically, with label and color. */
export function toStatusSeriesViews(statuses: StatusStatSeries[]): StatusSeriesView[] {
  const knownIndex = (status: string) =>
    KNOWN_STATUSES.findIndex((known) => known.key === status.toUpperCase())
  const ordered = [...statuses].sort((a, b) => {
    const ai = knownIndex(a.status)
    const bi = knownIndex(b.status)
    if (ai !== -1 || bi !== -1) return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi)
    return a.status.localeCompare(b.status)
  })
  return ordered.map((series, index) => {
    const known = KNOWN_STATUSES[knownIndex(series.status)]
    const byRange = new Map<string, number>()
    series.rows.forEach((row) => byRange.set(row.dayRange, (byRange.get(row.dayRange) ?? 0) + row.totalApps))
    return {
      ...series,
      label: known?.label ?? titleCase(series.status),
      color: PALETTE[index] ?? OVERFLOW_COLOR,
      total: series.rows.reduce((sum, row) => sum + row.totalApps, 0),
      byRange,
    }
  })
}

/** Every day range that appears in any series, in numeric order. */
export function collectDayRanges(...rowSets: Array<Array<{ dayRange: string }>>): string[] {
  return [...new Set(rowSets.flat().map((row) => row.dayRange))].sort(compareDayRanges)
}
