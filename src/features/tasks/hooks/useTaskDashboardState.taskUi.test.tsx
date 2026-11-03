import { act, renderHook } from '@testing-library/react'
import type React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ApplicationTask } from '@/types/application'
import { useTaskDashboardState } from './useTaskDashboardState'

// Tasks & Notifications opens the UI configured in TASK_UI_ROUTES, like the Application Dashboard.
const mocks = vi.hoisted(() => ({
  tasks: [] as unknown[],
  confirm: vi.fn(),
  assign: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  useSearch: () => ({}),
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
}))
vi.mock('@/context/AppPreferencesContext', () => ({ useAppPreferences: () => ({ paginationMode: 'paged' }) }))
vi.mock('@/context/UserContext', () => ({
  useUser: () => ({ username: 'tester', role: 'ALL', roles: [], token: 'token' }),
}))
vi.mock('@/features/tasks/hooks/useTaskQueries', () => ({
  useTasks: () => ({ data: { data: mocks.tasks, meta: { total_count: mocks.tasks.length } }, isLoading: false, isError: false }),
  useInfiniteTasks: () => ({ data: undefined, isLoading: false, isError: false, hasNextPage: false, isFetchingNextPage: false, fetchNextPage: vi.fn() }),
}))
vi.mock('@/features/tasks/hooks/useTaskMutations', () => ({
  useConfirmTaskMutation: () => ({ mutate: mocks.confirm, mutateAsync: mocks.confirm }),
  useAssignTaskMutation: () => ({ mutate: mocks.assign, mutateAsync: mocks.assign }),
}))

const event = { stopPropagation: vi.fn(), preventDefault: vi.fn() } as unknown as React.MouseEvent<HTMLElement>

const makeTask = (taskType: string, TaskCategory: string, taskName: string, extra: object = {}) =>
  ({
    applicationId: 77,
    taskInstanceId: 900,
    taskType,
    TaskCategory,
    taskName,
    companyName: 'FIX Foods',
    plantName: 'FIX Plant',
    capacity: 'DESIGNATED',
    status: 'PENDING',
    ...extra,
  }) as unknown as ApplicationTask

const click = (task: ApplicationTask) => {
  const hook = renderHook(() => useTaskDashboardState())
  act(() => hook.result.current.handleTaskAction(event, task))
  return hook.result
}

describe('Tasks & Notifications task actions (TASK_UI_ROUTES)', () => {
  beforeEach(() => {
    mocks.tasks = []
    mocks.confirm.mockReset()
    mocks.assign.mockReset()
  })

  it('opens the certification drawer for a certificate task, with the task capacity', () => {
    const result = click(makeTask('ACTION', 'CERTIFICATE', 'Certify', { capacity: 'PRIMARY' }))
    expect(result.current.certificationDrawerState.open).toBe(true)
    expect(result.current.certificationDrawerState.applicant?.applicationId).toBe(77)
    expect(result.current.certificationDrawerState.task?.TaskInstanceId).toBe(900)
    expect(result.current.certificationDrawerState.task?.capacity).toBe('PRIMARY')
  })

  it('opens the prelim resolution drawer for ResolveCompany / ResolvePlant tasks', () => {
    const task = makeTask('ACTION', 'INPUT', 'ResolvePlant2')
    const result = click(task)
    expect(result.current.prelimResolutionDrawerState).toEqual(expect.objectContaining({ open: true, task }))
  })

  it('completes a confirm task at once', () => {
    click(makeTask('CONFIRM', 'CONFIRMATION', 'Confirm payment'))
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ taskId: '900', applicationId: 77 }))
  })

  it('opens the contract drawer for a confirm task about a contract, without completing it', () => {
    const result = click(makeTask('CONFIRM', 'CONFIRMATION', 'Confirm Contract Sent'))
    expect(result.current.contractDrawerState).toEqual(expect.objectContaining({ open: true, taskInstanceId: 900 }))
    expect(mocks.confirm).not.toHaveBeenCalled()
  })

  it('still opens the drawers it opened before', () => {
    expect(click(makeTask('ACTION', 'VISIT', 'Visit')).current.inspectionVisitDateDrawerState.open).toBe(true)
    expect(click(makeTask('ACTION', 'INVOICE', 'Invoice')).current.inspectionInvoiceDrawerState.open).toBe(true)
    expect(click(makeTask('ACTION', 'SCHEDULEA', 'ScheduleA')).current.scheduleADrawerState.open).toBe(true)
    expect(click(makeTask('ACTION', 'ASSIGNMENT', 'Assign NCRC')).current.showActionModal).toBeTruthy()
  })

  it('an action task without its own UI opens the condition modal, which completes it with the chosen result', () => {
    const task = makeTask('ACTION', 'SOMETHING_NEW', 'New step')
    const result = click(task)
    expect(result.current.showConditionModal).toEqual(expect.objectContaining({ taskInstanceId: 900 }))

    act(() => {
      result.current.executeAction('tester', result.current.showConditionModal as never, 'Done')
    })
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ taskId: '900', result: 'Done' }))
  })

  it('does nothing for a task no row matches', () => {
    const result = click(makeTask('PROGRESS', 'OTHER', 'Something'))
    expect(result.current.showConditionModal).toBeNull()
    expect(result.current.showActionModal).toBeNull()
    expect(mocks.confirm).not.toHaveBeenCalled()
  })
})
