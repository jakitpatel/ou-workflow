import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTaskDashboardState } from './useTaskDashboardState'

// Tasks & Notifications submits through the shared useTaskActions, like the Application Dashboard
// and Application Intake, so a task completes the same way on every screen.
const mocks = vi.hoisted(() => ({
  confirmOptions: [] as unknown[],
  assignOptions: [] as unknown[],
  confirm: vi.fn(),
  assignAsync: vi.fn(),
  message: vi.fn(),
  success: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({ useSearch: () => ({}), useNavigate: () => vi.fn(), useParams: () => ({}) }))
vi.mock('@/context/AppPreferencesContext', () => ({ useAppPreferences: () => ({ paginationMode: 'paged' }) }))
vi.mock('@/context/UserContext', () => ({ useUser: () => ({ username: 'tester', role: 'ALL', roles: [], token: 'token' }) }))
vi.mock('@/features/tasks/hooks/useTaskQueries', () => ({
  useTasks: () => ({ data: { data: [], meta: { total_count: 0 } }, isLoading: false, isError: false }),
  useInfiniteTasks: () => ({ data: undefined, isLoading: false, isError: false, hasNextPage: false, isFetchingNextPage: false, fetchNextPage: vi.fn() }),
}))
vi.mock('@/features/tasks/hooks/useTaskMutations', () => ({
  useConfirmTaskMutation: (options: unknown) => { mocks.confirmOptions.push(options); return { mutate: mocks.confirm, mutateAsync: mocks.confirm } },
  useAssignTaskMutation: (options: unknown) => { mocks.assignOptions.push(options); return { mutate: vi.fn(), mutateAsync: mocks.assignAsync } },
}))
vi.mock('@/features/applications/api', () => ({ createApplicationMessage: mocks.message, uploadApplicationFile: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: mocks.success, error: vi.fn() } }))

const row = (extra: Record<string, unknown>) => ({
  applicationId: 1659, taskInstanceId: 26723, TaskInstanceId: 26723, companyName: 'I.P.A. srl', ...extra,
})

describe('Tasks & Notifications submit (shared useTaskActions)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.confirmOptions.length = 0
    mocks.assignOptions.length = 0
    mocks.assignAsync.mockResolvedValue({})
    mocks.message.mockResolvedValue({})
    mocks.confirm.mockImplementation((_params: unknown, options?: { onSuccess?: () => void }) => options?.onSuccess?.())
  })

  it('refreshes both the Application and Application Intake lists after a write', () => {
    renderHook(() => useTaskDashboardState())
    expect(mocks.confirmOptions.at(-1)).toEqual(expect.objectContaining({ includeApplicationLists: true, includePrelimLists: true }))
    expect(mocks.assignOptions.at(-1)).toEqual(expect.objectContaining({ includeApplicationLists: true, includePrelimLists: true }))
  })

  it('AssignNCRC assigns, notifies the NCRC with the company name and confirms it', async () => {
    const { result } = renderHook(() => useTaskDashboardState())
    await act(async () => {
      await result.current.executeAction('KLEINC', row({
        name: 'AssignNCRC', taskName: 'AssignNCRC', taskType: 'ACTION', TaskCategory: 'ASSIGNMENT', PreScript: 'api/vSelectNCRC,NCRC',
      }) as never)
    })
    expect(mocks.assignAsync).toHaveBeenCalledWith(expect.objectContaining({ appId: 1659, taskId: '26723', role: 'NCRC', assignee: 'KLEINC' }))
    expect(mocks.message).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({ ToUser: 'KLEINC', Subject: 'NCRC assignment', MessageText: expect.stringContaining('Company: I.P.A. srl') }),
    }))
    expect(mocks.success).toHaveBeenCalledWith('Assigned KLEINC as NCRC and sent the notification')
  })

  it('completes a task with the capacity this screen derives from the assignee, and says so', async () => {
    const { result } = renderHook(() => useTaskDashboardState())
    act(() => {
      void result.current.executeAction('tester', row({
        name: 'Application Review', taskName: 'Application Review', taskType: 'CONDITION', TaskCategory: 'APPROVALOK', assignee: 'tester',
      }) as never, 'YES')
    })
    expect(mocks.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ taskId: '26723', applicationId: 1659, result: 'YES', capacity: 'MEMBER' }),
      expect.anything(),
    )
    expect(mocks.success).toHaveBeenCalledWith('Application Review completed')
  })

  it('reads the category from TaskCategory when taskCategory is missing', async () => {
    const { result } = renderHook(() => useTaskDashboardState())
    act(() => {
      void result.current.executeAction('tester', row({ name: 'Confirm', taskType: 'CONFIRM', TaskCategory: 'CONFIRMATION' }) as never)
    })
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ taskId: '26723', capacity: 'DESIGNATED' }), expect.anything())
  })
})
