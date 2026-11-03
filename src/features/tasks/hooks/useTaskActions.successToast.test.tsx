import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Applicant } from '@/types/application'
import { useTaskActions } from './useTaskActions'

// The generic task actions (condition / confirm / assignment modals) confirm success only after the
// server accepts the write. Found on devlinux03: completing Application Review or assigning the
// NCRC on Application Intake showed no feedback at all.
type MutateOptions = { onSuccess?: () => void; onError?: () => void }
const mocks = vi.hoisted(() => ({
  succeed: true,
  confirmMutate: vi.fn(),
  assignMutate: vi.fn(),
  assignAsync: vi.fn(),
  message: vi.fn(),
  success: vi.fn(),
}))
const settle = (_params: unknown, options?: MutateOptions) => {
  if (mocks.succeed) options?.onSuccess?.()
  else options?.onError?.()
}
vi.mock('sonner', () => ({ toast: { success: mocks.success, error: vi.fn() } }))
vi.mock('@/features/tasks/hooks/useTaskMutations', () => ({
  useConfirmTaskMutation: () => ({ mutate: mocks.confirmMutate, mutateAsync: vi.fn() }),
  useAssignTaskMutation: () => ({ mutate: mocks.assignMutate, mutateAsync: mocks.assignAsync }),
}))
vi.mock('@/features/applications/api', () => ({ createApplicationMessage: mocks.message, uploadApplicationFile: vi.fn() }))

const application = { applicationId: 1659, company: 'I.P.A. srl' } as Applicant
const setup = () =>
  renderHook(() => useTaskActions({ applications: [application], token: 'token', username: 'tester', onError: vi.fn() }))
    .result.current.executeAction

describe('task action success messages', () => {
  beforeEach(() => {
    mocks.succeed = true
    vi.clearAllMocks()
    mocks.confirmMutate.mockImplementation(settle)
    mocks.assignMutate.mockImplementation(settle)
    mocks.assignAsync.mockResolvedValue({})
    mocks.message.mockResolvedValue({})
  })

  it.each([
    ['confirm', { name: 'Confirm payment', taskType: 'CONFIRM', taskCategory: 'CONFIRMATION' }, undefined],
    ['condition', { name: 'Application Review', taskType: 'CONDITION', taskCategory: 'APPROVAL' }, 'YES'],
    ['action', { name: 'Select option', taskType: 'ACTION', taskCategory: 'SELECTOR' }, 'A'],
    ['progress', { name: 'Progress', taskType: 'PROGRESS', taskCategory: 'PROGRESS_TASK' }, 'Done'],
  ])('%s: says the task was completed once the server accepts it', async (_kind, task, result) => {
    await setup()('tester', { ...task, TaskInstanceId: 26722, applicationId: 1659 }, result)
    expect(mocks.success).toHaveBeenCalledExactlyOnceWith(`${task.name} completed`)
  })

  it('shows nothing when the server rejects the write (the error dialog reports it)', async () => {
    mocks.succeed = false
    await setup()('tester', { name: 'Application Review', taskType: 'CONDITION', taskCategory: 'APPROVAL', TaskInstanceId: 1 }, 'YES')
    await setup()('someone', { name: 'AssignRFR', taskType: 'ACTION', taskCategory: 'ASSIGNMENT', TaskInstanceId: 2 })
    expect(mocks.success).not.toHaveBeenCalled()
  })

  it('names who was assigned', async () => {
    await setup()('RFR.USER', { name: 'AssignRFR', taskType: 'ACTION', taskCategory: 'ASSIGNMENT', TaskInstanceId: 3, PreScript: 'RFR' })
    expect(mocks.success).toHaveBeenCalledExactlyOnceWith('Assigned RFR.USER')
  })

  it('AssignNCRC: confirms the assignment and the notification only when both succeed', async () => {
    const assignNcrc = { name: 'AssignNCRC', taskType: 'ACTION', taskCategory: 'ASSIGNMENT', TaskInstanceId: 26723, applicationId: 1659, PreScript: 'NCRC' }
    await setup()('KLEINC', assignNcrc)
    expect(mocks.success).toHaveBeenCalledExactlyOnceWith('Assigned KLEINC as NCRC and sent the notification')

    mocks.success.mockClear()
    mocks.message.mockRejectedValueOnce(new Error('down'))
    await setup()('KLEINC', assignNcrc)
    expect(mocks.success).not.toHaveBeenCalled()

    mocks.assignAsync.mockRejectedValueOnce(new Error('refused'))
    await setup()('KLEINC', assignNcrc)
    expect(mocks.success).not.toHaveBeenCalled()
  })
})
