import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchWithAuth } from '@/shared/api/httpClient'
import { confirmTask } from './index'

// /complete_task takes the flag as `override` (like /assignRole and the status update), not
// `overwrite`. The Inspection Invoice drawer sends it when it re-opens the RFR assignment task.
vi.mock('@/shared/api/httpClient', () => ({
  fetchWithAuth: vi.fn().mockResolvedValue({ status: 'ok', data: { task_instance_id: '26725' } }),
  isJsonApiRecord: vi.fn(),
}))

const lastBody = () => (vi.mocked(fetchWithAuth).mock.calls.at(-1)?.[0] as { body: Record<string, unknown> }).body

describe('confirmTask override flag', () => {
  beforeEach(() => vi.mocked(fetchWithAuth).mockClear())

  it('sends override, never overwrite', async () => {
    await confirmTask({
      taskId: '26725', override: '1', status: 'PENDING', result: '',
      includeCompletedBy: false, includeCompletionNotes: false, token: 'token',
    })
    expect(vi.mocked(fetchWithAuth).mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({ path: '/complete_task', method: 'POST' }))
    expect(lastBody()).toEqual(expect.objectContaining({ task_instance_id: '26725', override: '1', status: 'PENDING' }))
    expect(lastBody()).not.toHaveProperty('overwrite')
  })

  it('leaves the flag out when it is not given', async () => {
    await confirmTask({ taskId: '26725', result: 'YES', token: 'token' })
    expect(lastBody()).not.toHaveProperty('override')
    expect(lastBody()).not.toHaveProperty('overwrite')
  })
})
