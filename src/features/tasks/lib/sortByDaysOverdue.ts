/** Days Overdue sort on Tasks & Notifications: off (server order) → most overdue first → least. */
export type DaysOverdueSort = 'none' | 'desc' | 'asc'

export const nextDaysOverdueSort = (current: DaysOverdueSort): DaysOverdueSort =>
  current === 'none' ? 'desc' : current === 'desc' ? 'asc' : 'none'

// Negative values (not yet overdue) sort below 0; missing or non-numeric values count as 0.
const daysOverdueOf = (task: { daysOverdue?: number | string | null }) => {
  const days = Number(task.daysOverdue)
  return Number.isFinite(days) ? days : 0
}

/** Returns a new array; ties keep their existing order (Array.prototype.sort is stable). */
export const sortByDaysOverdue = <T extends { daysOverdue?: number | string | null }>(
  tasks: readonly T[],
  sort: DaysOverdueSort,
): T[] => {
  if (sort === 'none') return [...tasks]
  const direction = sort === 'desc' ? -1 : 1
  return [...tasks].sort((a, b) => direction * (daysOverdueOf(a) - daysOverdueOf(b)))
}
