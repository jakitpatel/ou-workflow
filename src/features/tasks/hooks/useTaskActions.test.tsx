import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Applicant } from '@/types/application'
import { sendTaskEmail, useTaskActions } from './useTaskActions'

const mocks = vi.hoisted(() => ({ confirm: vi.fn(), assign: vi.fn(), mutate: vi.fn(), message: vi.fn(), assignOptions: vi.fn(), confirmOptions: vi.fn() }))
vi.mock('@/features/tasks/hooks/useTaskMutations', () => ({
  useAssignTaskMutation: (options: unknown) => {
    mocks.assignOptions(options)
    return { mutateAsync: mocks.assign, mutate: mocks.mutate }
  },
  useConfirmTaskMutation: (options: unknown) => {
    mocks.confirmOptions(options)
    return { mutate: vi.fn(), mutateAsync: mocks.confirm }
  },
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

describe('Complete NDA email', () => {
  it('uses the sender email address in the application message payload', async () => {
    mocks.message.mockReset()
    await sendTaskEmail({
      applicationId: 421,
      taskInstanceId: 12,
      to: 'contact@example.com',
      subject: 'Complete NDA',
      body: 'Please complete the NDA.',
    }, 'token', ' s.benjamin@example.com ')

    expect(mocks.message).toHaveBeenCalledExactlyOnceWith({
      token: 'token',
      payload: expect.objectContaining({
        ApplicationID: 421,
        TaskInstanceId: 12,
        FromUser: 's.benjamin@example.com',
        ToUser: 'contact@example.com',
        MessageType: 'Email',
        TemplateName: 'complete-nda',
      }),
    })
  })
})

describe('AssignNCRC notification', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it.each(['WORKFLOW', 'SUBMISSION', undefined] as const)(
    'scopes confirmation and assignment refreshes to %s applications',
    (applicationType) => {
      renderHook(() => useTaskActions({ applications: [application], applicationType }))
      const expected = expect.objectContaining({
        includeApplicationLists: applicationType !== 'SUBMISSION',
        includePrelimLists: applicationType === 'SUBMISSION',
      })
      expect(mocks.confirmOptions).toHaveBeenCalledWith(expected)
      expect(mocks.assignOptions).toHaveBeenCalledWith(expected)
    },
  )

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
    expect(url.pathname).toBe('/ou-workflow/prelim-dashboard')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      q: '',
      status: 'all',
      page: '0',
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

  it.each([
    { taskCategory: 'ASSIGNRFR', taskType: 'ACTION' },
    { TaskCategory: 'ASSIGNRFR', TaskType: 'ACTION', taskCategory: undefined, taskType: undefined },
  ])('completes an RFR recommendation with the selected RFR and application refresh context', async (fields) => {
    await setup().execute('selected.rfr', { ...action, ...fields, name: 'RFR Recommendation', capacity: 'OTHER' }, 'Rabbi Test Full Name')
    expect(mocks.confirm).toHaveBeenCalledExactlyOnceWith({
      taskId: '12', applicationId: 421, token: 'token', username: 'S.Benjamin',
      capacity: 'DESIGNATED', completionNotes: 'Task completed successfully',
      result: '{selectRFR:YES, RFR:selected.rfr}', resultData: '{Recommended RFR:Rabbi Test Full Name}',
      rfrRecommendationUsername: 'selected.rfr',
    })
    expect(mocks.assign).not.toHaveBeenCalled()
    expect(mocks.mutate).not.toHaveBeenCalled()
    expect(mocks.message).toHaveBeenCalledExactlyOnceWith({
      token: 'token',
      payload: {
        ApplicationID: 421, MessageText: 'Recommanded RFR is Rabbi Test Full Name',
        isPrivate: false, isRead: false, FromUser: 'S.Benjamin', MessageType: 'Text',
        SentDate: expect.any(String), Priority: 'NORMAL',
      },
    })
  })

  it('posts the recommendation only after completion succeeds', async () => {
    let finish!: () => void
    mocks.confirm.mockReturnValue(new Promise<void>((resolve) => { finish = resolve }))
    const pending = setup().execute('selected.rfr', { ...action, taskCategory: 'ASSIGNRFR' }, 'Full Name')
    expect(mocks.message).not.toHaveBeenCalled()
    finish()
    await pending
    expect(mocks.message).toHaveBeenCalledOnce()
  })

  it('does not post a recommendation when completion fails', async () => {
    mocks.confirm.mockRejectedValue(new Error('Completion failed'))
    await expect(setup().execute('selected.rfr', { ...action, taskCategory: 'ASSIGNRFR' }, 'Full Name')).rejects.toThrow('Completion failed')
    expect(mocks.message).not.toHaveBeenCalled()
  })

  it('reports a message failure separately after successful recommendation completion', async () => {
    mocks.message.mockRejectedValue(new Error('Service unavailable'))
    const { execute, onError } = setup()
    await execute('selected.rfr', { ...action, taskCategory: 'ASSIGNRFR' }, 'Full Name')
    expect(mocks.confirm).toHaveBeenCalledOnce()
    expect(onError).toHaveBeenCalledWith('RFR recommendation completed, but the application message failed: Service unavailable')
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
