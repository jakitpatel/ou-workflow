import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchWithAuth } from '@/shared/api/httpClient'
import { deleteScheduleIngredient, patchScheduleIngredient } from './scheduleIngredientMutations'

vi.mock('@/shared/api/httpClient', () => ({ fetchWithAuth: vi.fn() }))

describe('ScheduleIngredient mutations', () => {
  beforeEach(() => vi.clearAllMocks())

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
        data: { attributes: { ApplicationID: '421', ...attributes }, type: 'ScheduleIngredient' },
      },
    })
  })

  it('deletes the ingredient resource without a request body', async () => {
    await deleteScheduleIngredient('17', 'token')
    expect(fetchWithAuth).toHaveBeenCalledWith({
      path: '/api/ScheduleIngredient/17',
      method: 'DELETE',
      token: 'token',
    })
  })

  it('propagates request errors', async () => {
    vi.mocked(fetchWithAuth).mockRejectedValueOnce(new Error('Request failed'))
    await expect(deleteScheduleIngredient('17')).rejects.toThrow('Request failed')
  })
})
