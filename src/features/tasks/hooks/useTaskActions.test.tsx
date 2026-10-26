import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Applicant } from '@/types/application'
import { uploadApplicationFile } from '@/features/applications/api'
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
  it('sends the approved NDA storage path without uploading it again', async () => {
    await sendTaskEmail({
      applicationId: 421, to: 'contact@example.com', subject: 'Complete NDA', body: 'Please review.',
      existingAttachment: { name: 'approved.pdf', url: 's3://bucket/approved.pdf' },
    }, 'token')
    expect(uploadApplicationFile).not.toHaveBeenCalled()
    expect(mocks.message).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({ Attachments: 'approved.pdf<s3://bucket/approved.pdf>' }),
    }))
  })
  it('uses a replacement file instead of the approved attachment', async () => {
    vi.mocked(uploadApplicationFile).mockResolvedValue({ file_path: 's3://bucket/replacement.pdf' })
    await sendTaskEmail({
      applicationId: 421, to: 'contact@example.com', subject: 'Complete NDA', body: 'Please review.',
      existingAttachment: { name: 'approved.pdf', url: 's3://bucket/approved.pdf' },
      file: new File(['replacement'], 'replacement.pdf'),
    }, 'token')
    expect(mocks.message).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({ Attachments: 'replacement.pdf<s3://bucket/replacement.pdf>' }),
    }))
  })
  beforeEach(() => vi.resetAllMocks())
  afterEach(() => vi.unstubAllEnvs())

  it.each([
    { file_path: 's3://newcompany-documents/uploads/1205/invoice_609749.pdf', link: '/file/661', message: 'File uploaded and task completed successfully' },
    { data: { file_path: 's3://newcompany-documents/uploads/1205/invoice_609749.pdf' } },
    { fileUrl: 's3://newcompany-documents/uploads/1205/invoice_609749.pdf' },
  ])('sends the uploaded attachment using the returned storage path: %j', async (response) => {
    vi.mocked(uploadApplicationFile).mockResolvedValue(response)
    const file = new File(['NDA'], 'nda.pdf', { type: 'application/pdf' })

    await sendTaskEmail({
      applicationId: 1205, taskInstanceId: 12, to: 'contact@example.com',
      subject: 'Complete NDA', body: 'Please complete the NDA.', file,
    }, 'token')

    expect(uploadApplicationFile).toHaveBeenCalledExactlyOnceWith({
      file, applicationId: 1205, taskInstanceID: 12,
      description: 'Complete NDA email attachment', token: 'token',
    })
    expect(mocks.message).toHaveBeenCalledExactlyOnceWith({
      token: 'token',
      payload: expect.objectContaining({
        Attachments: 'nda.pdf<s3://newcompany-documents/uploads/1205/invoice_609749.pdf>',
      }),
    })
  })

  it.each([{ message: 'Uploaded' }, { file_path: { invalid: true } }])(
    'does not send an email when the upload has no usable attachment path: %j', async (response) => {
      vi.mocked(uploadApplicationFile).mockResolvedValue(response)
      await expect(sendTaskEmail({
        applicationId: 1205, to: 'contact@example.com', subject: 'Complete NDA',
        body: 'Please complete the NDA.', file: new File(['NDA'], 'nda.pdf'),
      }, 'token')).rejects.toThrow('The file was uploaded, but no attachment URL was returned.')
      expect(mocks.message).not.toHaveBeenCalled()
    },
  )

  it.each([
    [undefined, 'KashrusITTestBox@ou.org'],
    ['other@example.com', 'other@example.com, KashrusITTestBox@ou.org'],
    ['kashrusittestbox@ou.org', 'kashrusittestbox@ou.org'],
  ])('includes implied Bcc while preserving explicit Bcc %s', async (bcc, expectedBcc) => {
    vi.stubEnv('VITE_EMAIL_IMPLIED_BCC', 'KashrusITTestBox@ou.org')
    mocks.message.mockReset()
    await sendTaskEmail({
      applicationId: 421,
      to: 'contact@example.com',
      bcc,
      subject: 'Complete NDA',
      body: 'Please complete the NDA.',
    }, 'token', 's.benjamin@example.com')

    expect(mocks.message).toHaveBeenCalledExactlyOnceWith({
      token: 'token',
      payload: expect.objectContaining({ BCCUser: expectedBcc }),
    })
  })

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
