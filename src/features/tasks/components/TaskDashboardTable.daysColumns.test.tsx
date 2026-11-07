import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ApplicationTask } from '@/types/application'
import { TaskDashboardTable } from './TaskDashboardTable'

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useNavigate: () => vi.fn(),
}))

const task = (taskInstanceId: number, daysPending: number, daysOverdue: number) => ({
  applicationId: 1659, taskInstanceId, taskName: 'Application Review', plantName: `Plant ${taskInstanceId}`,
  status: 'PENDING', taskType: 'CONDITION', TaskCategory: 'APPROVALOK', assigneeRole: 'MARKETING',
  daysPending, daysOverdue,
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

const headerTexts = () => screen.getAllByRole('columnheader').map((header) => header.textContent?.trim())

describe('Tasks & Notifications days columns', () => {
  it('puts Days Overdue right after Task & Plant, before AppId, with no Days Elapsed column', () => {
    renderTable([task(900, 3, 0)])
    const headers = headerTexts()
    const taskPlant = headers.indexOf('Task & Plant')
    expect(headers.slice(taskPlant, taskPlant + 3)).toEqual(['Task & Plant', 'Days Overdue', 'AppId'])
    expect(headers).not.toContain('Days Elapsed')
  })

  it('shows days overdue in its own cell, with a dash for zero and red for overdue', () => {
    renderTable([task(900, 12, 4), task(901, 0, 0)])
    const headers = headerTexts()
    const overdue = headers.indexOf('Days Overdue')
    const [first, second] = screen.getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell'))

    expect(first).toHaveLength(headers.length)
    expect(first[overdue].textContent?.trim()).toBe('4')
    expect(within(first[overdue]).getByText('4').classList.contains('text-red-600')).toBe(true)
    expect(second[overdue].textContent?.trim()).toBe('-')
    // Days elapsed (12) is no longer shown anywhere in the row.
    expect(first.map((cell) => cell.textContent?.trim())).not.toContain('12')
  })

  it('no longer writes the day counts as text inside the Task & Plant cell', () => {
    renderTable([task(900, 12, 4)])
    const taskPlant = headerTexts().indexOf('Task & Plant')
    const cell = within(screen.getAllByRole('row')[1]).getAllByRole('cell')[taskPlant]
    expect(cell.textContent).not.toMatch(/days (elapsed|overdue)/i)
  })
})
