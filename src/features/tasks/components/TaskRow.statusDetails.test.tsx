import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ApplicationTask } from '@/types/application'
import { TaskDashboardTable } from './TaskDashboardTable'

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useNavigate: () => vi.fn(),
}))

const task = (extra: object) => ({
  applicationId: 1659, taskInstanceId: 900, taskName: 'Application Review', plantName: 'Plant 900',
  status: 'PENDING', assigneeRole: 'MARKETING', ...extra,
}) as unknown as ApplicationTask

const renderRow = (row: ApplicationTask) =>
  render(
    <TaskDashboardTable filteredTasks={[row]} paginationMode="paged" totalCount={1} hasNextPage={false}
      sentinelRef={{ current: null }} isFetchingNextPage={false} handleApplicationTaskAction={vi.fn()}
      handleShowPlantHistory={vi.fn()} />,
  )

const statusCell = () => {
  const headers = screen.getAllByRole('columnheader').map((header) => header.textContent?.trim())
  return within(screen.getAllByRole('row')[1]).getAllByRole('cell')[headers.indexOf('Status')]
}

describe('Tasks & Notifications status details on hover', () => {
  it('moves Started / Completed / Capacity / Completed By into a tooltip on the status badge', () => {
    renderRow(task({
      status: 'COMPLETED', startedDate: '2026-10-01T10:00:00Z', completedDate: '2026-10-05T10:00:00Z',
      completedCapacity: 'RFR', completedBy: 'KLEINC',
    }))
    const tooltip = within(statusCell()).getByRole('tooltip')
    expect(tooltip.textContent).toBe('Started: 01 Oct 2026Completed: 05 Oct 2026Capacity: RFRCompleted By: KLEINC')

    // Hidden until hover or keyboard focus of the badge, which describes itself with it.
    expect(tooltip.className).toContain('invisible')
    expect(tooltip.className).toContain('group-hover:visible')
    expect(tooltip.className).toContain('group-focus:visible')
    const trigger = statusCell().querySelector(`[aria-describedby="${tooltip.id}"]`) as HTMLElement
    expect(trigger.tabIndex).toBe(0)
    expect(within(trigger).getByRole('status').textContent).toContain('Completed')
  })

  it('shows only the started date for a task that is not completed', () => {
    renderRow(task({ startedDate: '2026-10-01T10:00:00Z', completedDate: '2026-10-05T10:00:00Z', completedBy: 'KLEINC' }))
    expect(within(statusCell()).getByRole('tooltip').textContent).toBe('Started: 01 Oct 2026')
  })

  it('has no tooltip or focus stop when there are no details', () => {
    renderRow(task({ startedDate: null, completedDate: null }))
    expect(within(statusCell()).queryByRole('tooltip')).toBeNull()
    expect(statusCell().querySelector('[tabindex="0"]')).toBeNull()
  })
})
