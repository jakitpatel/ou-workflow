import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchWithAuth } from '@/shared/api/httpClient'

import { deleteScheduleProduct, patchScheduleProduct } from './scheduleProductMutations'

vi.mock('@/shared/api/httpClient', () => ({ fetchWithAuth: vi.fn() }))

describe('ScheduleProduct mutations', () => {
  beforeEach(() => vi.clearAllMocks())

  it('patches the product resource with the application and edited attributes', async () => {
    const attributes = {
      productName: 'Edited product', BrandName: '', privateLabelCo: '', privateLabel: false,
      Retail: false, Industrial: true, bulkShipped: 'N', list: 'A', symbol: 'OU',
      internal_use_only: 'N', passover: 'N', UPC: '',
    }
    await patchScheduleProduct('17', '421', attributes, 'token')
    expect(fetchWithAuth).toHaveBeenCalledWith({
      path: '/api/ScheduleProduct/17',
      method: 'PATCH',
      token: 'token',
      body: {
        data: { attributes: { ApplicationID: '421', ...attributes, inHouse: true }, id: 17, type: 'ScheduleProduct' },
      },
    })
  })

  it('soft deletes the product resource with its ID and isDeleted flag', async () => {
    await deleteScheduleProduct('17', 'token')
    expect(fetchWithAuth).toHaveBeenCalledWith({
      path: '/api/ScheduleProduct/17',
      method: 'PATCH',
      body: { data: { attributes: { isDeleted: true }, id: 17, type: 'ScheduleProduct' } },
      token: 'token',
    })
  })

  it('propagates request errors', async () => {
    vi.mocked(fetchWithAuth).mockRejectedValueOnce(new Error('Request failed'))
    await expect(deleteScheduleProduct('17')).rejects.toThrow('Request failed')
  })
})
