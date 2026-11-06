import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ApplicationTask } from '@/types/application'
import { TaskDashboardTable } from './TaskDashboardTable'

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useNavigate: () => vi.fn(),
}))

const task = { applicationId: 1659, taskInstanceId: 900, taskName: 'Application Review', plantName: 'Plant 900',
  status: 'PENDING', assigneeRole: 'MARKETING' } as unknown as ApplicationTask

const renderTable = (tasks: ApplicationTask[], flags: { isLoading?: boolean; isRefreshing?: boolean }) =>
  render(
    <TaskDashboardTable filteredTasks={tasks} paginationMode="paged" totalCount={tasks.length} hasNextPage={false}
      sentinelRef={{ current: null }} isFetchingNextPage={false} handleApplicationTaskAction={vi.fn()}
      handleShowPlantHistory={vi.fn()} {...flags} />,
  )

describe('Tasks & Notifications table loading states', () => {
  it('shows Loading tasks (not "No tasks found") while a newly chosen view loads', () => {
    renderTable([], { isLoading: true })
    expect(screen.getByRole('status').textContent).toContain('Loading tasks...')
    expect(screen.queryByText('No tasks found.')).toBeNull()
  })

  it('still shows "No tasks found." once a view has loaded empty', () => {
    renderTable([], {})
    expect(screen.getByText('No tasks found.')).toBeTruthy()
  })

  it('dims the previous page while the next page loads', () => {
    renderTable([task], { isRefreshing: true })
    const body = screen.getAllByRole('rowgroup')[1]
    expect(body.getAttribute('aria-busy')).toBe('true')
    expect(body.className).toContain('opacity-50')
  })
})
