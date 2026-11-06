/** Days Overdue sort on Tasks & Notifications: off (server order) → most overdue first → least. */
export type DaysOverdueSort = 'none' | 'desc' | 'asc'

export const nextDaysOverdueSort = (current: DaysOverdueSort): DaysOverdueSort =>
  current === 'none' ? 'desc' : current === 'desc' ? 'asc' : 'none'

const daysOverdueOf = (task: { daysOverdue?: number | null }) => {
  const days = Number(task.daysOverdue)
  return Number.isFinite(days) && days > 0 ? days : 0
}

/** Returns a new array; ties keep their existing order (Array.prototype.sort is stable). */
export const sortByDaysOverdue = <T extends { daysOverdue?: number | null }>(
  tasks: readonly T[],
  sort: DaysOverdueSort,
): T[] => {
  if (sort === 'none') return [...tasks]
  const direction = sort === 'desc' ? -1 : 1
  return [...tasks].sort((a, b) => direction * (daysOverdueOf(a) - daysOverdueOf(b)))
}
