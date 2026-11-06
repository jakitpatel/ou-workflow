import { describe, expect, it } from 'vitest'
import { nextDaysOverdueSort, sortByDaysOverdue } from './sortByDaysOverdue'

describe('sortByDaysOverdue', () => {
  it('treats missing, negative or non-numeric days as not overdue', () => {
    const tasks = [
      { id: 'missing' }, { id: 'neg', daysOverdue: -2 }, { id: 'five', daysOverdue: 5 },
      { id: 'nan', daysOverdue: Number.NaN }, { id: 'one', daysOverdue: 1 },
    ]
    expect(sortByDaysOverdue(tasks, 'desc').map((t) => t.id)).toEqual(['five', 'one', 'missing', 'neg', 'nan'])
  })

  it('does not mutate the input list', () => {
    const tasks = [{ daysOverdue: 1 }, { daysOverdue: 2 }]
    sortByDaysOverdue(tasks, 'desc')
    expect(tasks.map((t) => t.daysOverdue)).toEqual([1, 2])
  })

  it('cycles none -> desc -> asc -> none', () => {
    expect([nextDaysOverdueSort('none'), nextDaysOverdueSort('desc'), nextDaysOverdueSort('asc')])
      .toEqual(['desc', 'asc', 'none'])
  })
})
