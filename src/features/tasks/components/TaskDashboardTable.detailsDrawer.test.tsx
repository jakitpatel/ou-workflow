import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ApplicationTask } from '@/types/application'
import { TaskDashboardTable } from './TaskDashboardTable'

// Clicking a plant name on Tasks & Notifications opens the Application Details drawer over the
// list, instead of navigating to the full application page.
const mocks = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useNavigate: () => mocks.navigate,
}))
vi.mock('@/features/applications/components/ApplicationDetailsDrawer', () => ({
  ApplicationDetailsDrawer: ({ open, applicationId, onClose }: { open: boolean; applicationId?: string | number; onClose: () => void }) =>
    open ? (
      <div role="dialog" aria-label="Application Details">
        Details for {applicationId}
        <button type="button" onClick={onClose}>Close details</button>
      </div>
    ) : null,
}))

const task = (applicationId: number | undefined, taskInstanceId: number, plantName: string) => ({
  applicationId, taskInstanceId, taskName: 'Application Review', plantName,
  status: 'PENDING', taskType: 'CONDITION', TaskCategory: 'APPROVALOK',
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

describe('Tasks & Notifications plant name', () => {
  beforeEach(() => mocks.navigate.mockReset())

  it('opens the Application Details drawer for that application, without leaving the list', () => {
    renderTable([task(1659, 900, 'I.P.A. Plant'), task(1676, 901, 'Funk Plant')])
    expect(screen.queryByRole('dialog', { name: 'Application Details' })).toBeNull()

    fireEvent.click(screen.getByText('Funk Plant'))
    expect(screen.getByRole('dialog', { name: 'Application Details' }).textContent).toContain('Details for 1676')
    expect(mocks.navigate).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Close details' }))
    expect(screen.queryByRole('dialog', { name: 'Application Details' })).toBeNull()
  })

  it('does nothing for a row without an application id', () => {
    renderTable([task(undefined, 902, 'No App Plant')])
    fireEvent.click(screen.getByText('No App Plant'))
    expect(screen.queryByRole('dialog', { name: 'Application Details' })).toBeNull()
    expect(mocks.navigate).not.toHaveBeenCalled()
  })
})
