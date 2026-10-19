import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { fetchScheduleAIngredients, fetchScheduleBProducts } from '@/features/applications/api'
import { useContractSchedules } from './useContractSchedules'

vi.mock('@/context/UserContext', () => ({ useUser: () => ({ token: 'token' }) }))
vi.mock('@/features/applications/api', () => ({
  fetchScheduleAIngredients: vi.fn(),
  fetchScheduleBProducts: vi.fn(),
}))

const setup = (applicationId?: number) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) =>
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { ...renderHook(() => useContractSchedules(applicationId), { wrapper }), client }
}

describe('contract Kash schedules', () => {
  it('loads only Kash records for the current application', async () => {
    const ingredient = { INGREDIENT_NAME: 'Kash ingredient', RAW_MATERIAL_CODE: 'RMC-1' }
    const product = { PRODUCT_NAME: 'Kash product' }
    vi.mocked(fetchScheduleAIngredients).mockResolvedValue({ scheduleIngredients: [], kashIngredients: [ingredient] })
    vi.mocked(fetchScheduleBProducts).mockResolvedValue({ scheduleProducts: [], kashProducts: [product] })
    const { result, client, unmount } = setup(421)
    await waitFor(() => expect(result.current.productsQuery.isSuccess && result.current.ingredientsQuery.isSuccess).toBe(true))
    expect(fetchScheduleAIngredients).toHaveBeenCalledWith({ applicationId: '421', token: 'token' })
    expect(fetchScheduleBProducts).toHaveBeenCalledWith({ applicationId: '421', token: 'token' })
    expect(result.current.contractIngredients).toEqual([ingredient])
    expect(result.current.contractProducts).toEqual([product])
    unmount()
    client.clear()
  })

  it('exposes request failures without treating them as successful empty schedules', async () => {
    vi.mocked(fetchScheduleAIngredients).mockRejectedValue(new Error('offline'))
    vi.mocked(fetchScheduleBProducts).mockResolvedValue({ scheduleProducts: [], kashProducts: [] })
    const { result, client, unmount } = setup(422)
    await waitFor(() => expect(result.current.ingredientsQuery.isError).toBe(true))
    expect(result.current.contractIngredients).toEqual([])
    expect(result.current.ingredientsQuery.isSuccess).toBe(false)
    unmount()
    client.clear()
  })
})
