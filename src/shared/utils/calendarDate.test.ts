import { describe, expect, it } from 'vitest'
import { localCalendarDate } from './calendarDate'
describe('local calendar dates (run under Jerusalem and New York)', () => {
  it('keeps local midnight and the first day of the month', () => {
    expect(localCalendarDate(new Date(2026, 9, 1))).toBe('2026-10-01')
    expect(localCalendarDate(new Date(2026, 9, 27, 0, 5))).toBe('2026-10-27')
    expect(localCalendarDate(new Date(2026, 9, 27, 23, 55))).toBe('2026-10-27')
  })
  it('retains calendar arithmetic across DST and year boundaries', () => {
    for (const [date, expected] of [[new Date(2026, 2, 8), '2026-03-08'], [new Date(2026, 10, 1), '2026-11-01'], [new Date(2026, 12, 0), '2026-12-31']] as const) expect(localCalendarDate(date)).toBe(expected)
  })
})
