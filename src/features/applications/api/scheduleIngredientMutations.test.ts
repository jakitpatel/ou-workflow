import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchWithAuth } from '@/shared/api/httpClient'

import { deleteScheduleIngredient, patchScheduleIngredient, patchScheduleIngredientFollowUp, patchScheduleIngredientHalachicReview } from './scheduleIngredientMutations'

vi.mock('@/shared/api/httpClient', () => ({ fetchWithAuth: vi.fn() }))

describe('ScheduleIngredient mutations', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each([true, false])('patches halachic review %s with its note', async (isHalachic) => {
    const attributes = { isHalachic, halachicNote: 'Provide updated LOC' }
    await patchScheduleIngredientHalachicReview('566', attributes, 'token')
    expect(fetchWithAuth).toHaveBeenCalledWith({
      path: '/api/ScheduleIngredient/566', method: 'PATCH', token: 'token',
      body: { data: { attributes, id: 566, type: 'ScheduleIngredient' } },
    })
  })

  it.each([true, false])('patches follow-up flag %s with its note', async (isFlagged) => {
    const attributes = { isFlagged, flaggedNote: 'Provide updated LOC - Letter of Certification.' }
    await patchScheduleIngredientFollowUp('566', attributes, 'token')
    expect(fetchWithAuth).toHaveBeenCalledWith({
      path: '/api/ScheduleIngredient/566', method: 'PATCH', token: 'token',
      body: { data: { attributes, id: 566, type: 'ScheduleIngredient' } },
    })
  })

  it('patches the ingredient resource with the application and edited attributes', async () => {
    const attributes = {
      ingredientLabelName: 'j2kj',
      manufacturer: '323',
      source: '323',
      brandName: '23',
      rawMaterialCode: '',
      certifyingAgency: '',
    }
    await patchScheduleIngredient('17', '421', attributes, 'token')
    expect(fetchWithAuth).toHaveBeenCalledWith({
      path: '/api/ScheduleIngredient/17',
      method: 'PATCH',
      token: 'token',
      body: {
        data: { attributes: { ApplicationID: '421', ...attributes }, id: 17, type: 'ScheduleIngredient' },
      },
    })
  })

  it('soft deletes the ingredient resource with its ID and isDeleted flag', async () => {
    await deleteScheduleIngredient('17', 'token')
    expect(fetchWithAuth).toHaveBeenCalledWith({
      path: '/api/ScheduleIngredient/17',
      method: 'PATCH',
      body: { data: { attributes: { isDeleted: true }, id: 17, type: 'ScheduleIngredient' } },
      token: 'token',
    })
  })

  it('propagates request errors', async () => {
    vi.mocked(fetchWithAuth).mockRejectedValueOnce(new Error('Request failed'))
    await expect(deleteScheduleIngredient('17')).rejects.toThrow('Request failed')
  })
})
