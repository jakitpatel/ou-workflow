import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ApplicationTask } from '@/types/application'
import { fetchWithAuth } from '@/shared/api/httpClient'
import { fetchApplicants } from '@/features/applications/api'
import { fetchPrelimApplications } from '@/features/prelim/api'
import { TaskDashboardTable } from './TaskDashboardTable'

const navigate = vi.fn()
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useNavigate: () => navigate,
}))
vi.mock('@/shared/api/httpClient', () => ({ fetchWithAuth: vi.fn().mockResolvedValue({ data: [], meta: {} }) }))

const task = (applicationId: unknown, stageName: string) => ({
  applicationId, taskInstanceId: 900, taskName: 'Application Review', plantName: 'Plant 900',
  status: 'PENDING', assigneeRole: 'MARKETING', stageName,
}) as unknown as ApplicationTask

const renderRow = (row: ApplicationTask) =>
  render(
    <TaskDashboardTable filteredTasks={[row]} paginationMode="paged" totalCount={1} hasNextPage={false}
      sentinelRef={{ current: null }} isFetchingNextPage={false} handleApplicationTaskAction={vi.fn()}
      handleShowPlantHistory={vi.fn()} />,
  )

const requestPath = () => {
  const [{ path }] = vi.mocked(fetchWithAuth).mock.calls.at(-1) as [{ path: string }]
  return decodeURIComponent(path)
}

describe('Tasks & Notifications AppId link', () => {
  beforeEach(() => {
    navigate.mockReset()
    vi.mocked(fetchWithAuth).mockClear()
  })

  it.each(['Intake', ' intake '])('opens Application Intake filtered to the app for stage %j', (stageName) => {
    renderRow(task(1659, stageName))
    fireEvent.click(screen.getByRole('button', { name: '1659' }))
    expect(navigate).toHaveBeenCalledWith({
      to: '/ou-workflow/prelim-dashboard',
      search: { q: '', status: 'all', page: 0, applicationId: 1659 },
    })
  })

  it.each(['Inspection', 'Contract', ''])('opens the Application Dashboard filtered to the app for stage %j', (stageName) => {
    renderRow(task('1659', stageName))
    fireEvent.click(screen.getByRole('button', { name: '1659' }))
    expect(navigate).toHaveBeenCalledWith({
      to: '/ou-workflow/ncrc-dashboard',
      search: { q: '', status: 'all', priority: 'all', page: 0, myOnly: false, applicationId: 1659 },
    })
  })

  it('shows plain text, not a link, when the row has no application id', () => {
    renderRow(task(undefined, 'Intake'))
    expect(screen.queryByRole('button', { name: /^\d+$/ })).toBeNull()
  })

  it('those Intake filters send only application_type=SUBMISSION and filter[applicationId]', async () => {
    await fetchPrelimApplications({ statusFilter: 'all', searchTerm: '', applicationId: 1659, page: 0, limit: 20 })
    expect(requestPath()).toBe('/get_applications_v1?application_type=SUBMISSION&page[limit]=20&page[offset]=0&filter[applicationId]=1659')
  })

  it('those Application Dashboard filters send only filter[applicationId]', async () => {
    await fetchApplicants({ statusFilter: 'all', priorityFilter: 'all', searchTerm: '', myOnly: false, applicationId: 1659, page: 0, limit: 20 })
    expect(requestPath()).toBe('/get_applications_v1?page[limit]=20&page[offset]=0&filter[applicationId]=1659')
  })
})
