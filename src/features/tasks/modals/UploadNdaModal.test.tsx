import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TASK_CATEGORIES, TASK_TYPES } from '@/lib/constants/task'

import { UploadNdaModal } from './UploadNdaModal'

const mocks = vi.hoisted(() => ({ upload: vi.fn(), save: vi.fn() }))
vi.mock('@/context/UserContext', () => ({ useUser: () => ({ token: 'token' }) }))
vi.mock('@/features/applications/hooks/useApplicationDetail', () => ({
  useApplicationDetail: () => ({ data: undefined }),
}))
vi.mock('@/features/applications/hooks/useUploadApplicationFileMutation', () => ({
  useUploadApplicationFileMutation: () => ({ mutateAsync: mocks.upload }),
}))
vi.mock('@/features/tasks/lib/saveUploadedNda', () => ({ saveUploadedNda: mocks.save }))

function setup(taskName: string, fields: Record<string, string>) {
  const complete = vi.fn()
  const close = vi.fn()
  const action = { taskName, taskInstanceId: 317, ...fields }
  const { container } = render(
    <UploadNdaModal
      showUploadModal
      selectedAction={{ application: { applicationId: 421 }, action }}
      taskInstanceId={317}
      setShowUploadModal={close}
      completeTaskWithResult={complete}
    />,
  )
  fireEvent.change(container.querySelector('input[type="file"]')!, {
    target: { files: [new File(['NDA'], 'customer.pdf')] },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Upload' }))
  return { complete, close }
}

describe('NDA upload task classification', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.upload.mockResolvedValue({ file_path: 's3://customer.pdf', link: '/file/661' })
    mocks.save.mockResolvedValue(undefined)
  })

  it.each(['Send NDA', 'Customer agreement', ''])('saves NDA metadata for task name %j', async (name) => {
    const { complete, close } = setup(name, {
      taskCategory: TASK_CATEGORIES.UPLOAD, taskType: TASK_TYPES.UPLOAD,
    })
    await waitFor(() => expect(complete).toHaveBeenCalledOnce())
    expect(mocks.save).toHaveBeenCalledExactlyOnceWith({
      applicationId: 421, taskInstanceId: 317, fileName: 'customer.pdf',
      uploaded: { file_path: 's3://customer.pdf', link: '/file/661' }, token: 'token',
    })
    expect(mocks.save.mock.invocationCallOrder[0]).toBeLessThan(complete.mock.invocationCallOrder[0])
    expect(close).toHaveBeenCalledWith(null)
  })

  it('supports backend field casing with an arbitrary task name', async () => {
    const { complete } = setup('Attach agreement', { TaskCategory: 'UPLOAD', TaskType: 'UPLOAD' })
    await waitFor(() => expect(complete).toHaveBeenCalledOnce())
    expect(mocks.save).toHaveBeenCalledOnce()
  })

  it.each([
    { taskCategory: TASK_CATEGORIES.EMAIL, taskType: TASK_TYPES.UPLOAD },
    { taskCategory: TASK_CATEGORIES.UPLOAD, taskType: TASK_TYPES.ACTION },
  ])('requires both upload category and type: %j', async (fields) => {
    setup('Send NDA', fields)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Upload' })).toBeTruthy())
    await waitFor(() => expect(mocks.upload).toHaveBeenCalledOnce())
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it('keeps the task open and incomplete when saving metadata fails', async () => {
    mocks.save.mockRejectedValueOnce(new Error('Metadata save failed'))
    const { complete, close } = setup('Customer agreement', {
      taskCategory: TASK_CATEGORIES.UPLOAD, taskType: TASK_TYPES.UPLOAD,
    })
    await screen.findByText('Metadata save failed')
    expect(complete).not.toHaveBeenCalled()
    expect(close).not.toHaveBeenCalled()
  })
})
