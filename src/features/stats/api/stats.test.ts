import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchWithAuth } from '@/shared/api/httpClient'

import { fetchStats, parseStats } from './stats'

vi.mock('@/shared/api/httpClient', () => ({ fetchWithAuth: vi.fn() }))
const response = {
  status: 'ok',
  stats: {
    stats: [
      { DayRange: '31-60 Days', TotalApps: 3 },
      { DayRange: '0-30 Days', TotalApps: 15 },
    ],
  },
}

describe('application stats API', () => {
  beforeEach(() => vi.resetAllMocks())
  it('requests authenticated stats and orders the ranges numerically', async () => {
    vi.mocked(fetchWithAuth).mockResolvedValue(response)
    expect(await fetchStats('token')).toEqual([
      { dayRange: '0-30 Days', totalApps: 15 },
      { dayRange: '31-60 Days', totalApps: 3 },
    ])
    expect(fetchWithAuth).toHaveBeenCalledWith({ path: '/get_stats', token: 'token' })
  })
  it('accepts empty results and zero counts', () => {
    expect(parseStats({ status: 'ok', stats: { stats: [] } })).toEqual([])
    expect(
      parseStats({ status: 'ok', stats: { stats: [{ DayRange: '90+ Days', TotalApps: 0 }] } })[0]
        .totalApps,
    ).toBe(0)
  })
  it.each([
    null,
    {},
    { status: 'error', data: [] },
    { status: 'ok', data: [] },
    { status: 'ok', stats: null },
    { status: 'ok', stats: {} },
    { status: 'ok', stats: { stats: {} } },
    { status: 'error', stats: { stats: [] } },
    { status: 'ok', stats: { stats: [null] } },
    ...[-1, 1.5, '15', Infinity].map((count) => ({
      status: 'ok',
      stats: { stats: [{ DayRange: '0-30 Days', TotalApps: count }] },
    })),
  ])('rejects malformed responses: %j', (value) => {
    expect(() => parseStats(value)).toThrow()
  })
})
