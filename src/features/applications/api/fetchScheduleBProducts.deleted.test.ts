import { beforeEach, expect, it, vi } from 'vitest'
import { fetchScheduleBProducts } from './index'

// A soft-deleted product must not come back after delete (/get_products now filters too; the client check stays).
const mocks = vi.hoisted(() => ({ request: vi.fn() }))
vi.mock('@/shared/api/httpClient', () => ({ fetchWithAuth: mocks.request }))

beforeEach(() => {
  mocks.request.mockReset().mockResolvedValue({
    products: {
      schedule_products: [
        { ScheduleProductId: 107, productName: 'FIX-fe4a deleted', isDeleted: true },
        { ScheduleProductId: 108, productName: 'FIX-fe4a kept', isDeleted: false },
      ],
      ou_kash_products: [],
    },
  })
})

it('drops soft-deleted Schedule B products', async () => {
  const result = await fetchScheduleBProducts({ applicationId: 983, token: 'token' })
  expect(result.scheduleProducts).toHaveLength(1)
  expect(JSON.stringify(result.scheduleProducts)).toContain('FIX-fe4a kept')
  expect(JSON.stringify(result.scheduleProducts)).not.toContain('FIX-fe4a deleted')
})
