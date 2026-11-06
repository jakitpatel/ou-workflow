import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ApplicationTask } from '@/types/application'
import { TaskDashboardTable } from './TaskDashboardTable'

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useNavigate: () => vi.fn(),
}))

const task = (taskInstanceId: number, plantName: string, daysOverdue: number) => ({
  applicationId: 1659, taskInstanceId, taskName: 'Application Review', plantName,
  status: 'PENDING', assigneeRole: 'MARKETING', daysOverdue,
}) as unknown as ApplicationTask

// Server order: B (3), none (0), A (10), C (3) — ties B/C must keep this order.
const tasks = [task(1, 'B', 3), task(2, 'None', 0), task(3, 'A', 10), task(4, 'C', 3)]

const renderTable = () =>
  render(
    <TaskDashboardTable filteredTasks={tasks} paginationMode="paged" totalCount={tasks.length}
      hasNextPage={false} sentinelRef={{ current: null }} isFetchingNextPage={false}
      handleApplicationTaskAction={vi.fn()} handleShowPlantHistory={vi.fn()} />,
  )

const plantOrder = () =>
  screen.getAllByRole('row').slice(1).map((row) => row.querySelector('button')?.textContent?.trim())
const sortButton = () => screen.getByRole('button', { name: /days overdue/i })
const overdueHeader = () => sortButton().closest('th')!

describe('Tasks & Notifications sort by Days Overdue', () => {
  it('keeps the server order until the header is clicked', () => {
    renderTable()
    expect(plantOrder()).toEqual(['B', 'None', 'A', 'C'])
    expect(overdueHeader().getAttribute('aria-sort')).toBe('none')
  })

  it('cycles most overdue first, then least overdue first, then back to the server order', () => {
    renderTable()

    fireEvent.click(sortButton())
    expect(plantOrder()).toEqual(['A', 'B', 'C', 'None'])
    expect(overdueHeader().getAttribute('aria-sort')).toBe('descending')

    fireEvent.click(sortButton())
    expect(plantOrder()).toEqual(['None', 'B', 'C', 'A'])
    expect(overdueHeader().getAttribute('aria-sort')).toBe('ascending')

    fireEvent.click(sortButton())
    expect(plantOrder()).toEqual(['B', 'None', 'A', 'C'])
    expect(overdueHeader().getAttribute('aria-sort')).toBe('none')
  })
})
