import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchWithAuth } from '@/shared/api/httpClient'

import { patchScheduleProductFollowUp, patchScheduleProductHalachicReview } from './scheduleProductReview'

vi.mock('@/shared/api/httpClient', () => ({ fetchWithAuth: vi.fn(), isJsonApiRecord: vi.fn() }))

describe('ScheduleProduct mutations', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each([true, false])('patches halachic review %s with its note', async (isHalachic) => {
    const attributes = { isHalachic, halachicNote: 'Provide updated LOC' }
    await patchScheduleProductHalachicReview('566', attributes, 'token')
    expect(fetchWithAuth).toHaveBeenCalledWith({
      path: '/api/ScheduleProduct/566', method: 'PATCH', token: 'token', expectBody: expect.any(Function),
      body: { data: { attributes, id: 566, type: 'ScheduleProduct' } },
    })
  })

  it.each([true, false])('patches follow-up flag %s with its note', async (isFlagged) => {
    const attributes = { isFlagged, flaggedNote: 'Provide updated LOC - Letter of Certification.' }
    await patchScheduleProductFollowUp('566', attributes, 'token')
    expect(fetchWithAuth).toHaveBeenCalledWith({
      path: '/api/ScheduleProduct/566', method: 'PATCH', token: 'token', expectBody: expect.any(Function),
      body: { data: { attributes, id: 566, type: 'ScheduleProduct' } },
    })
  })

  it('propagates request errors', async () => {
    vi.mocked(fetchWithAuth).mockRejectedValueOnce(new Error('Request failed'))
    await expect(patchScheduleProductFollowUp('17', { isFlagged: true, flaggedNote: '' })).rejects.toThrow('Request failed')
  })
})
