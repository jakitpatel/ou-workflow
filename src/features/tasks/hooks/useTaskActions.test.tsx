import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Applicant } from '@/types/application'
import { useTaskActions } from './useTaskActions'

const mocks = vi.hoisted(() => ({ assign: vi.fn(), mutate: vi.fn(), message: vi.fn() }))
vi.mock('@/features/tasks/hooks/useTaskMutations', () => ({
  useAssignTaskMutation: () => ({ mutateAsync: mocks.assign, mutate: mocks.mutate }),
  useConfirmTaskMutation: () => ({ mutate: vi.fn() }),
}))
vi.mock('@/features/applications/api', () => ({
  createApplicationMessage: mocks.message,
  uploadApplicationFile: vi.fn(),
}))

const application = { applicationId: 421, company: 'Mahanakorn Rice Co., Ltd.' } as Applicant
const action = {
  name: 'AssignNCRC',
  taskCategory: 'ASSIGNMENT',
  taskType: 'ACTION',
  TaskInstanceId: 12,
  applicationId: 421,
  PreScript: 'NCRC',
}
const setup = () => {
  const onError = vi.fn()
  const { result } = renderHook(() =>
    useTaskActions({
      applications: [application],
      token: 'token',
      username: 'S.Benjamin',
      onError,
    }),
  )
  return { execute: result.current.executeAction, onError }
}

describe('AssignNCRC notification', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('waits for assignment success and sends the private notification with the application link', async () => {
    let finish!: () => void
    mocks.assign.mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve
      }),
    )
    const { execute } = setup()
    const pending = execute('selected.ncrc', action)
    expect(mocks.message).not.toHaveBeenCalled()
    finish()
    await pending
    expect(mocks.message).toHaveBeenCalledWith({
      token: 'token',
      payload: {
        ApplicationID: 421,
        Subject: 'NCRC assigment',
        MessageText: expect.stringContaining('Company: Mahanakorn Rice Co., Ltd.'),
        isPrivate: true,
        isRead: false,
        FromUser: 'S.Benjamin',
        MessageType: 'Text',
        SentDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
        Priority: 'HIGH',
        ToUser: 'selected.ncrc',
      },
    })
    const message = mocks.message.mock.calls[0][0].payload.MessageText
    const url = new URL(message.split('Application link: ')[1])
    expect(url.origin).toBe(window.location.origin)
    expect(url.pathname).toBe('/ou-workflow/ncrc-dashboard')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      q: '',
      status: 'all',
      priority: 'all',
      page: '0',
      myOnly: 'true',
      applicationId: '421',
    })
  })

  it('does not notify when assignment fails', async () => {
    mocks.assign.mockRejectedValue(new Error('Assignment failed'))
    await setup().execute('selected.ncrc', action)
    expect(mocks.message).not.toHaveBeenCalled()
  })

  it('does not notify for other assignment tasks', async () => {
    await setup().execute('selected.rfr', { ...action, name: 'AssignRFR' })
    expect(mocks.mutate).toHaveBeenCalledOnce()
    expect(mocks.message).not.toHaveBeenCalled()
  })

  it('reports notification failure separately from the successful assignment', async () => {
    mocks.message.mockRejectedValue(new Error('Service unavailable'))
    const { execute, onError } = setup()
    await execute('selected.ncrc', action)
    expect(onError).toHaveBeenCalledWith(
      'NCRC assignment saved, but the notification failed: Service unavailable',
    )
    expect(mocks.assign).toHaveBeenCalledOnce()
  })
})
