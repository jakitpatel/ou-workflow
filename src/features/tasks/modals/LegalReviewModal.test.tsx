import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LegalReviewModal } from './LegalReviewModal'
import { getNdaGlobalData, isLegalReviewTask } from '../lib/legalReview'

const mocks = vi.hoisted(() => ({ upload: vi.fn(), patch: vi.fn(), global: vi.fn(), complete: vi.fn() }))
vi.mock('@/context/UserContext', () => ({ useUser: () => ({ token: 'token', username: 'legal' }) }))
vi.mock('@/features/applications/hooks/useApplicationDetail', () => ({ useApplicationDetail: () => ({
  data: { GlobalData: JSON.stringify({ customerNDAURL: 's3://customer.pdf', customerNDALink: '/file/661' }) },
}) }))
vi.mock('@/features/applications/components/ApplicationDetailsDrawer', () => ({ ApplicationDetailsDrawer: ({ open }: { open: boolean }) => open ? <p>Application details</p> : null }))
vi.mock('@/features/applications/api', () => ({ uploadApplicationFile: mocks.upload }))
vi.mock('@/features/tasks/api', () => ({ patchTaskGuiDisplayResult: mocks.patch }))
vi.mock('@/features/applications/api/globalData', () => ({ saveApplicationGlobalData: mocks.global }))
vi.mock('@/features/tasks/hooks/useTaskMutations', () => ({ useConfirmTaskMutation: () => ({ mutateAsync: mocks.complete }) }))
vi.mock('@/shared/api/httpClient', () => ({ resolveApiBaseUrl: () => 'https://api.example.com/api' }))

function setup() {
  const close = vi.fn()
  render(<LegalReviewModal applicationId={421} companyName="Example Company" taskInstanceId={317} capacity="DESIGNATED" onClose={close} />)
  return close
}
function selectFile() {
  fireEvent.change(screen.getByLabelText('Signed NDA file'), { target: { files: [new File(['signed NDA'], 'signed.pdf')] } })
}

describe('Legal NDA review', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.upload.mockResolvedValue({ file_path: 's3://signed.pdf', link: '/file/662' })
  })
  it('matches category and type independently of task name and casing', () => {
    expect(isLegalReviewTask({ TaskCategory: 'NDAREVIEW', TaskType: 'ACTION' })).toBe(true)
    expect(isLegalReviewTask({ taskCategory: 'ndareview', taskType: 'action' })).toBe(true)
    expect(isLegalReviewTask({ taskCategory: 'NDAREVIEW', taskType: 'UPLOAD' })).toBe(false)
    expect(getNdaGlobalData({ GlobalData: 'invalid' })).toEqual({})
  })
  it('shows company, app ID and document link and opens application details', () => {
    setup()
    expect(screen.getByText('Example Company · App #421')).toBeTruthy()
    expect(screen.getByRole('link', { name: /customer NDA/ }).getAttribute('href')).toBe('https://api.example.com/file/661')
    expect((screen.getByRole('button', { name: /Approve/ }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'View Application' }))
    expect(screen.getByText('Application details')).toBeTruthy()
  })
  it('uploads, saves filename and global data, then allows explicit approval', async () => {
    const close = setup()
    selectFile()
    fireEvent.click(screen.getByRole('button', { name: 'Upload NDA' }))
    await screen.findByText('signed.pdf')
    expect(mocks.patch).toHaveBeenCalledWith({ taskId: '317', result: '{approvedNDAfile:"signed.pdf"}', token: 'token' })
    expect(mocks.global).toHaveBeenCalledWith({ applicationId: 421, taskInstanceId: 317, token: 'token',
      jsonData: { approvedNDAURL: 's3://signed.pdf', approvedNDALink: '/file/662' } })
    expect(mocks.patch.mock.invocationCallOrder[0]).toBeLessThan(mocks.global.mock.invocationCallOrder[0])
    expect(mocks.complete).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /Approve/ }))
    await waitFor(() => expect(close).toHaveBeenCalledOnce())
    expect(mocks.complete).toHaveBeenCalledWith(expect.objectContaining({ taskId: '317', applicationId: 421, capacity: 'DESIGNATED', result: 'yes' }))
  })
  it.each(['upload', 'patch', 'global'] as const)('keeps approval disabled when %s fails', async (step) => {
    mocks[step].mockRejectedValueOnce(new Error('Save failed'))
    setup(); selectFile()
    fireEvent.click(screen.getByRole('button', { name: 'Upload NDA' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Save failed')
    expect((screen.getByRole('button', { name: /Approve/ }) as HTMLButtonElement).disabled).toBe(true)
    expect(mocks.complete).not.toHaveBeenCalled()
  })
  it('keeps the dialog open and allows retry when completion fails', async () => {
    mocks.complete.mockRejectedValueOnce(new Error('Complete failed'))
    const close = setup(); selectFile()
    fireEvent.click(screen.getByRole('button', { name: 'Upload NDA' }))
    await screen.findByText('signed.pdf')
    fireEvent.click(screen.getByRole('button', { name: /Approve/ }))
    expect((await screen.findByRole('alert')).textContent).toBe('Complete failed')
    expect(close).not.toHaveBeenCalled()
  })
})
