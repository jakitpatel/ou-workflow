import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ApplicationTask } from '@/types/application'
import { TaskDashboardTable } from './TaskDashboardTable'

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useNavigate: () => vi.fn(),
}))

const task = (applicationId: number | undefined, taskInstanceId: number) => ({
  applicationId, taskInstanceId, taskName: 'Application Review', plantName: `Plant ${taskInstanceId}`,
  status: 'PENDING', taskType: 'CONDITION', TaskCategory: 'APPROVALOK', assigneeRole: 'MARKETING',
}) as unknown as ApplicationTask

const renderTable = (tasks: ApplicationTask[]) =>
  render(
    <TaskDashboardTable
      filteredTasks={tasks}
      paginationMode="paged"
      totalCount={tasks.length}
      hasNextPage={false}
      sentinelRef={{ current: null }}
      isFetchingNextPage={false}
      handleApplicationTaskAction={vi.fn()}
      handleShowPlantHistory={vi.fn()}
    />,
  )

describe('Tasks & Notifications AppId column', () => {
  it('has an AppId column just before Actions', () => {
    renderTable([task(1659, 900)])
    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent?.trim())
    expect(headers.indexOf('AppId')).toBeGreaterThan(-1)
    expect(headers.indexOf('AppId') + 1).toBe(headers.indexOf('Actions'))
  })

  it("shows each row's application id in that column, and a dash when it is missing", () => {
    renderTable([task(1659, 900), task(undefined, 901)])
    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent?.trim())
    const column = headers.indexOf('AppId')
    const rows = screen.getAllByRole('row').slice(1)
    expect(within(rows[0]).getAllByRole('cell')[column].textContent?.trim()).toBe('1659')
    expect(within(rows[1]).getAllByRole('cell')[column].textContent?.trim()).toBe('-')
  })
})
