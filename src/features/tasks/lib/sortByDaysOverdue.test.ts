import { describe, expect, it } from 'vitest'
import { nextDaysOverdueSort, sortByDaysOverdue } from './sortByDaysOverdue'

describe('sortByDaysOverdue', () => {
  it('sorts by the real value: negatives (not yet overdue) below 0; missing or non-numeric count as 0', () => {
    const tasks = [
      { id: 'missing' }, { id: 'neg', daysOverdue: -2 }, { id: 'five', daysOverdue: 5 },
      { id: 'nan', daysOverdue: Number.NaN }, { id: 'one', daysOverdue: 1 }, { id: 'six-ahead', daysOverdue: -6 },
      { id: 'text', daysOverdue: '3' },
    ]
    expect(sortByDaysOverdue(tasks, 'desc').map((t) => t.id)).toEqual(['five', 'text', 'one', 'missing', 'nan', 'neg', 'six-ahead'])
    expect(sortByDaysOverdue(tasks, 'asc').map((t) => t.id)).toEqual(['six-ahead', 'neg', 'missing', 'nan', 'one', 'text', 'five'])
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
