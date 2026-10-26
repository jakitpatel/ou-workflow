import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchStats } from '../api/stats'
import { StatsPage } from './StatsPage'

vi.mock('../api/stats', () => ({ fetchStats: vi.fn() }))
vi.mock('@/context/UserContext', () => ({ useUser: () => ({ token: 'token', username: 'staff' }) }))

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return render(
    <QueryClientProvider client={client}>
      <StatsPage />
    </QueryClientProvider>,
  )
}

describe('Stats page', () => {
  beforeEach(() => vi.resetAllMocks())
  it('shows a chart, exact counts, total, and refreshes data', async () => {
    vi.mocked(fetchStats).mockResolvedValue([
      { dayRange: '0-30 Days', totalApps: 15 },
      { dayRange: '31-60 Days', totalApps: 2 },
    ])
    setup()
    expect(screen.getByRole('status').textContent).toContain('Loading')
    await screen.findByRole('img', { name: 'Applications by day range' })
    expect(
      within(screen.getByRole('region', { name: 'Total applications' })).getByText('17'),
    ).toBeTruthy()
    expect(screen.getByRole('table').textContent).toContain('0-30 Days15')
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    await waitFor(() => expect(fetchStats).toHaveBeenCalledTimes(2))
  })
  it('shows an empty state', async () => {
    vi.mocked(fetchStats).mockResolvedValue([])
    setup()
    await screen.findByText('No application stats are available yet.')
    expect(screen.queryByRole('img')).toBeNull()
  })
  it('offers retry after an error', async () => {
    vi.mocked(fetchStats).mockRejectedValueOnce(new Error('Failed')).mockResolvedValue([])
    setup()
    await screen.findByRole('alert')
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await screen.findByText('No application stats are available yet.')
  })
})
