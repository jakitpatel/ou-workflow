import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ApplicationTask } from '@/types/application'
import { fetchPrelimApplicationDetails } from '@/features/prelim/api'
import { TaskDashboardTable } from './TaskDashboardTable'

// Task & Plant click: Intake-stage tasks open the Intake details drawer
// (get_prelim_application_details?externalReferenceId=<task.externalReferenceId>); other stages
// open Application Details (get_application_detail_v2?applicationId=<task.applicationId>).
const mocks = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useNavigate: () => mocks.navigate,
}))
vi.mock('@/context/UserContext', () => ({ useUser: () => ({ token: 'token' }) }))
vi.mock('@/features/prelim/api', () => ({
  fetchPrelimApplicationDetails: vi.fn(async (id: number) => [{ externalReferenceId: id, companyName: 'Intake Co' }]),
}))
vi.mock('@/features/prelim/components/PrelimApplicationDetailsDrawer', () => ({
  PrelimApplicationDetailsDrawer: ({ externalReferenceId, data, onClose }: {
    externalReferenceId: number; data?: { companyName?: string } | null; onClose: () => void
  }) => (
    <div role="dialog" aria-label="Application Intake Detail">
      Intake {externalReferenceId} {data?.companyName ?? ''}
      <button type="button" onClick={onClose}>Close intake</button>
    </div>
  ),
}))
vi.mock('@/features/applications/components/ApplicationDetailsDrawer', () => ({
  ApplicationDetailsDrawer: ({ open, applicationId }: { open: boolean; applicationId?: number }) =>
    open ? <div role="dialog" aria-label="Application Details">Details for {applicationId}</div> : null,
}))

const task = (extra: Record<string, unknown>) => ({
  applicationId: 1715, taskInstanceId: 900, taskName: 'Application Review', plantName: 'Plant 900',
  status: 'PENDING', taskType: 'CONDITION', TaskCategory: 'APPROVALOK', ...extra,
}) as unknown as ApplicationTask

const renderTable = (tasks: ApplicationTask[]) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <TaskDashboardTable filteredTasks={tasks} paginationMode="paged" totalCount={tasks.length}
        hasNextPage={false} sentinelRef={{ current: null }} isFetchingNextPage={false}
        handleApplicationTaskAction={vi.fn()} handleShowPlantHistory={vi.fn()} />
    </QueryClientProvider>,
  )

describe('Tasks & Notifications Task & Plant details', () => {
  beforeEach(() => {
    mocks.navigate.mockReset()
    vi.mocked(fetchPrelimApplicationDetails).mockClear()
  })

  it.each(['externalReferenceId', 'ExternalReferenceId', 'externalReferenceID', 'ExternalReferenceID'])(
    'opens Intake details by %s for an Intake-stage task',
    async (field) => {
      renderTable([task({ stageName: 'Intake', [field]: 3722 })])
      fireEvent.click(screen.getByText('Plant 900'))

      const dialog = await screen.findByRole('dialog', { name: 'Application Intake Detail' })
      expect(fetchPrelimApplicationDetails).toHaveBeenCalledWith(3722, 'token')
      await waitFor(() => expect(dialog.textContent).toContain('Intake 3722 Intake Co'))
      expect(screen.queryByRole('dialog', { name: 'Application Details' })).toBeNull()
      expect(mocks.navigate).not.toHaveBeenCalled()

      fireEvent.click(screen.getByRole('button', { name: 'Close intake' }))
      expect(screen.queryByRole('dialog', { name: 'Application Intake Detail' })).toBeNull()
    },
  )

  it.each(['Inspection', 'Contract', undefined])('opens Application Details by applicationId for stage %s', (stageName) => {
    renderTable([task({ stageName, externalReferenceId: 3722 })])
    fireEvent.click(screen.getByText('Plant 900'))
    expect(screen.getByRole('dialog', { name: 'Application Details' }).textContent).toContain('Details for 1715')
    expect(fetchPrelimApplicationDetails).not.toHaveBeenCalled()
  })

  it('falls back to Application Details for an Intake task without an external reference', () => {
    renderTable([task({ stageName: 'Intake' })])
    fireEvent.click(screen.getByText('Plant 900'))
    expect(screen.getByRole('dialog', { name: 'Application Details' }).textContent).toContain('Details for 1715')
    expect(fetchPrelimApplicationDetails).not.toHaveBeenCalled()
  })
})
