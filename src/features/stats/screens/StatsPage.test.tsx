import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchStats, parseStats, type ApplicationStats } from '../api/stats'
import { StatsPage } from './StatsPage'

vi.mock('../api/stats', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/stats')>()),
  fetchStats: vi.fn(),
}))
vi.mock('@/context/UserContext', () => ({ useUser: () => ({ token: 'token', username: 'staff' }) }))

// The response the server now returns (parsed exactly as the app does).
const serverStats: ApplicationStats = parseStats({
  stats: {
    stats: {
      COMPLETED: [{ DayRange: '0-30 Days', TotalApps: 37 }, { DayRange: '31-60 Days', TotalApps: 31 }],
      LEGACY: [{ DayRange: '0-30 Days', TotalApps: 2 }, { DayRange: '31-60 Days', TotalApps: 3 }],
      REVIEW: [{ DayRange: '0-30 Days', TotalApps: 1 }],
      WAITING: [{ DayRange: '0-30 Days', TotalApps: 24 }],
      WTH: [],
      dayRange: [{ DayRange: '0-30 Days', TotalApps: 35 }, { DayRange: '31-60 Days', TotalApps: 9 }],
    },
  },
  status: 'ok',
})

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return render(
    <QueryClientProvider client={client}>
      <StatsPage />
    </QueryClientProvider>,
  )
}

const rowText = (name: string) =>
  [...screen.getByRole('table').querySelectorAll('tr')]
    .find((row) => row.querySelector('th')?.textContent?.trim() === name)
    ?.textContent?.replace(/\s+/g, ' ')

describe('Stats page', () => {
  beforeEach(() => vi.mocked(fetchStats).mockReset())

  it('shows the overall totals, the status chart and the exact counts, and refreshes', async () => {
    vi.mocked(fetchStats).mockResolvedValue(serverStats)
    setup()
    expect(screen.getByRole('status').textContent).toContain('Loading')
    await screen.findByRole('img', { name: 'Applications by status and day range' })

    // Overall ("dayRange") series: total 44, one tile per range.
    const totals = screen.getByRole('region', { name: 'Total applications' })
    expect(within(totals).getByText('44')).toBeTruthy()
    expect(within(totals).getByText('35')).toBeTruthy()
    expect(within(totals).getByText('9')).toBeTruthy()

    // Legend: fixed status order and names; an empty status is marked.
    const legend = screen.getByRole('list', { name: 'Statuses' })
    expect(within(legend).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Completed', 'Waiting', 'Under Review', 'Legacy', 'Withdrawn(none)',
    ])

    // Table: status x day range, with row and column totals (statuses only).
    // Cells run together in textContent: Completed | 37 | 31 | 68.
    expect(rowText('Completed')).toBe('Completed373168')
    expect(rowText('Waiting')).toBe('Waiting24024')
    expect(rowText('Withdrawn')).toBe('Withdrawn000')
    expect(rowText('All statuses')).toBe('All statuses643498')

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    await waitFor(() => expect(fetchStats).toHaveBeenCalledTimes(2))
  })

  it('draws one bar per status with applications in each range, and names it on hover', async () => {
    vi.mocked(fetchStats).mockResolvedValue(serverStats)
    setup()
    const chart = await screen.findByRole('img', { name: 'Applications by status and day range' })
    // Bars: Completed 2, Legacy 2, Review 1, Waiting 1 (Withdrawn has none) = 6.
    expect(chart.querySelectorAll('path')).toHaveLength(6)

    const target = [...chart.querySelectorAll('rect')].find((rect) =>
      rect.querySelector('title')?.textContent === 'Waiting, 0-30 Days: 24 applications',
    )!
    fireEvent.mouseEnter(target)
    expect(screen.getByRole('tooltip').textContent).toBe('Waiting0-30 Days: 24 applications')
    fireEvent.mouseLeave(chart)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('still shows the earlier day-range-only response', async () => {
    vi.mocked(fetchStats).mockResolvedValue({
      overall: [{ dayRange: '0-30 Days', totalApps: 15 }, { dayRange: '31-60 Days', totalApps: 2 }],
      statuses: [],
    })
    setup()
    const totals = await screen.findByRole('region', { name: 'Total applications' })
    expect(within(totals).getByText('17')).toBeTruthy()
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('shows an empty state', async () => {
    vi.mocked(fetchStats).mockResolvedValue({ overall: [], statuses: [{ status: 'WTH', rows: [] }] })
    setup()
    await screen.findByText('No application stats are available yet.')
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('offers retry after an error', async () => {
    vi.mocked(fetchStats)
      .mockRejectedValueOnce(new Error('Failed'))
      .mockResolvedValue({ overall: [], statuses: [] })
    setup()
    await screen.findByRole('alert')
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await screen.findByText('No application stats are available yet.')
  })
})
