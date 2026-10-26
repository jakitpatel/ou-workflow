import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchWithAuth } from '@/shared/api/httpClient'
import { saveUploadedNda } from './saveUploadedNda'

vi.mock('@/shared/api/httpClient', () => ({ fetchWithAuth: vi.fn() }))

const input = {
  applicationId: 421,
  taskInstanceId: 14216,
  fileName: 'Customer NDA.pdf',
  uploaded: {
    file_path: 's3://newcompany-documents/uploads/1205/invoice_609749.pdf',
    link: '/file/661',
  },
  token: 'token',
}

describe('save uploaded Send NDA metadata', () => {
  beforeEach(() => vi.resetAllMocks())

  it('saves the task filename before application global data with the same task ID', async () => {
    let finishPatch!: () => void
    vi.mocked(fetchWithAuth).mockReturnValueOnce(new Promise<void>((resolve) => { finishPatch = resolve }))
    const pending = saveUploadedNda(input)
    expect(fetchWithAuth).toHaveBeenCalledExactlyOnceWith({
      path: '/api/TaskInstance/14216', method: 'PATCH', token: 'token',
      body: { data: { id: '14216', type: 'TaskInstance', attributes: {
        ResultData: { GUIDisplayResult: '{UploadNDAFileName:"Customer NDA.pdf"}' },
      } } },
    })
    finishPatch()
    await pending
    expect(fetchWithAuth).toHaveBeenCalledTimes(2)
    expect(fetchWithAuth).toHaveBeenLastCalledWith({
      path: '/global_data', method: 'POST', token: 'token',
      body: { applicationId: 421, taskInstanceId: 14216, jsonData: {
        customerNDAURL: input.uploaded.file_path, customerNDALink: '/file/661', customerNDAFileName: input.fileName,
      } },
    })
  })

  it('stops when saving the task filename fails', async () => {
    vi.mocked(fetchWithAuth).mockRejectedValueOnce(new Error('Patch failed'))
    await expect(saveUploadedNda(input)).rejects.toThrow('Patch failed')
    expect(fetchWithAuth).toHaveBeenCalledTimes(1)
  })

  it('propagates a global data failure to prevent completion', async () => {
    vi.mocked(fetchWithAuth).mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('Save failed'))
    await expect(saveUploadedNda(input)).rejects.toThrow('Save failed')
  })

  it.each([null, {}, { file_path: 's3://nda.pdf' }])('rejects missing upload metadata: %j', async (uploaded) => {
    await expect(saveUploadedNda({ ...input, uploaded })).rejects.toThrow('file path or link')
    expect(fetchWithAuth).not.toHaveBeenCalled()
  })
})
