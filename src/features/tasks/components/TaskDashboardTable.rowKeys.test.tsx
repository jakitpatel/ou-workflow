import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ApplicationTask } from '@/types/application'
import { TaskDashboardTable } from './TaskDashboardTable'

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useNavigate: () => vi.fn(),
}))

const task = (taskInstanceId: number, plantName: string) => ({
  applicationId: 1659, taskInstanceId, taskName: 'Application Review', plantName,
  status: 'PENDING', assigneeRole: 'MARKETING',
}) as unknown as ApplicationTask

const props = {
  paginationMode: 'paged' as const, totalCount: 0, hasNextPage: false, sentinelRef: { current: null },
  isFetchingNextPage: false, handleApplicationTaskAction: vi.fn(), handleShowPlantHistory: vi.fn(),
}

const plantNames = () =>
  screen.getAllByRole('row').slice(1).map((row) => row.querySelector('button')?.textContent?.trim())

describe('Tasks & Notifications row keys', () => {
  it('shows only the Pending rows after switching from a 7 Days list with repeated or missing task ids', () => {
    const { rerender } = render(
      <TaskDashboardTable {...props} filteredTasks={[
        task(0, 'Seven A'), task(0, 'Seven B'), task(41, 'Seven C'), task(41, 'Seven D'), task(5, 'Shared'),
      ]} />,
    )

    rerender(<TaskDashboardTable {...props} filteredTasks={[task(5, 'Shared'), task(9, 'Pending only')]} />)

    expect(plantNames()).toEqual(['Shared', 'Pending only'])
  })

  it('still renders every row of a list that repeats a task id', () => {
    render(<TaskDashboardTable {...props} filteredTasks={[task(41, 'First'), task(41, 'Second')]} />)
    expect(plantNames()).toEqual(['First', 'Second'])
  })
})
