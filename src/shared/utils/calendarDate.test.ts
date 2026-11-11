import { describe, expect, it } from 'vitest'
import { formatCalendarDate, localCalendarDate, parseCalendarDate } from './calendarDate'
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

// Each case runs in New York (UTC-5), Israel (UTC+2), UTC and Auckland (UTC+13): the bug showed
// "2026-11-06" as Nov 5 in New York and Nov 6 in Israel. Setting process.env.TZ switches Node's zone.
const ZONES = ['America/New_York', 'Asia/Jerusalem', 'UTC', 'Pacific/Auckland']
const inZone = <T,>(zone: string, run: () => T): T => {
  const previous = process.env.TZ
  process.env.TZ = zone
  try {
    return run()
  } finally {
    if (previous === undefined) delete process.env.TZ
    else process.env.TZ = previous
  }
}

describe('formatCalendarDate (same day in every time zone)', () => {
  it('really switches zones (the old parsing shows Nov 5 in New York)', () => {
    const old = (zone: string) => inZone(zone, () => new Date('2026-11-06').getDate())
    expect([old('America/New_York'), old('Asia/Jerusalem')]).toEqual([5, 6])
  })

  it.each([
    ['2026-11-06', 'Nov 6, 2026'],
    ['2026-11-06T00:00:00', 'Nov 6, 2026'],
    ['2026-11-06T00:00:00Z', 'Nov 6, 2026'],
    ['2026-11-06 00:00:00', 'Nov 6, 2026'],
    ['Fri, 06 Nov 2026 00:00:00 GMT', 'Nov 6, 2026'],
    ['2026-01-01', 'Jan 1, 2026'],
    ['2026-12-31', 'Dec 31, 2026'],
  ])('shows %j as %s in every zone', (value, expected) => {
    expect(ZONES.map((zone) => inZone(zone, () => formatCalendarDate(value)))).toEqual(ZONES.map(() => expected))
  })

  it('keeps unknown values and empty values as before', () => {
    expect(formatCalendarDate('NULL')).toBe('NULL')
    expect(formatCalendarDate('')).toBe('')
    expect(formatCalendarDate(undefined, undefined, '-')).toBe('-')
    expect(parseCalendarDate('2026-02-30')).toBeNull()
  })

  it('accepts other formats', () => {
    expect(inZone('America/New_York', () =>
      formatCalendarDate('2026-11-01', { month: 'long', day: 'numeric', year: 'numeric' }),
    )).toBe('November 1, 2026')
  })
})
