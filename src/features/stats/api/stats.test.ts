import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchWithAuth } from '@/shared/api/httpClient'

import { fetchStats, parseStats } from './stats'

vi.mock('@/shared/api/httpClient', () => ({ fetchWithAuth: vi.fn() }))

// get_stats as the server now returns it: series keyed by status, plus the overall "dayRange".
export const statusResponse = {
  stats: {
    stats: {
      COMPLETED: [
        { DayRange: '31-60 Days', TotalApps: 31 },
        { DayRange: '0-30 Days', TotalApps: 37 },
      ],
      LEGACY: [
        { DayRange: '0-30 Days', TotalApps: 2 },
        { DayRange: '31-60 Days', TotalApps: 3 },
      ],
      REVIEW: [{ DayRange: '0-30 Days', TotalApps: 1 }],
      WAITING: [{ DayRange: '0-30 Days', TotalApps: 24 }],
      WTH: [],
      dayRange: [
        { DayRange: '0-30 Days', TotalApps: 35 },
        { DayRange: '31-60 Days', TotalApps: 9 },
      ],
    },
  },
  status: 'ok',
}

describe('application stats API', () => {
  beforeEach(() => vi.resetAllMocks())

  it('requests authenticated stats and reads the overall and per-status series', async () => {
    vi.mocked(fetchWithAuth).mockResolvedValue(statusResponse)
    const stats = await fetchStats('token')
    expect(fetchWithAuth).toHaveBeenCalledWith({ path: '/get_stats', token: 'token' })
    expect(stats.overall).toEqual([
      { dayRange: '0-30 Days', totalApps: 35 },
      { dayRange: '31-60 Days', totalApps: 9 },
    ])
    expect(stats.statuses.map((series) => series.status)).toEqual(['COMPLETED', 'LEGACY', 'REVIEW', 'WAITING', 'WTH'])
    // Each series is ordered by range and an empty status is kept.
    expect(stats.statuses[0].rows).toEqual([
      { dayRange: '0-30 Days', totalApps: 37 },
      { dayRange: '31-60 Days', totalApps: 31 },
    ])
    expect(stats.statuses[4]).toEqual({ status: 'WTH', rows: [] })
  })

  it('still reads the earlier shape, where stats.stats was the day-range array', () => {
    expect(
      parseStats({
        status: 'ok',
        stats: { stats: [{ DayRange: '31-60 Days', TotalApps: 3 }, { DayRange: '0-30 Days', TotalApps: 15 }] },
      }),
    ).toEqual({
      overall: [
        { dayRange: '0-30 Days', totalApps: 15 },
        { dayRange: '31-60 Days', totalApps: 3 },
      ],
      statuses: [],
    })
  })

  it('accepts empty results and zero counts', () => {
    expect(parseStats({ status: 'ok', stats: { stats: [] } })).toEqual({ overall: [], statuses: [] })
    expect(parseStats({ status: 'ok', stats: { stats: {} } })).toEqual({ overall: [], statuses: [] })
    expect(
      parseStats({ status: 'ok', stats: { stats: { WAITING: [{ DayRange: '90+ Days', TotalApps: 0 }] } } })
        .statuses[0].rows[0].totalApps,
    ).toBe(0)
  })

  it.each([
    null,
    {},
    { status: 'error', data: [] },
    { status: 'ok', data: [] },
    { status: 'ok', stats: null },
    { status: 'ok', stats: {} },
    { status: 'ok', stats: { stats: 'x' } },
    { status: 'error', stats: { stats: [] } },
    { status: 'ok', stats: { stats: [null] } },
    { status: 'ok', stats: { stats: { WAITING: {} } } },
    { status: 'ok', stats: { stats: { dayRange: [{ DayRange: '', TotalApps: 1 }] } } },
    ...[-1, 1.5, '15', Infinity].map((count) => ({
      status: 'ok',
      stats: { stats: { COMPLETED: [{ DayRange: '0-30 Days', TotalApps: count }] } },
    })),
  ])('rejects malformed responses: %j', (value) => {
    expect(() => parseStats(value)).toThrow()
  })
})
