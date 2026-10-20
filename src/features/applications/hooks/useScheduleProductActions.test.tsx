import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { deleteScheduleProduct, patchScheduleProduct } from '../api/scheduleProductMutations'
import { applicationsQueryKeys } from '../model/queryKeys'
import { mapApplicationProductRow } from './useScheduleBProducts'
import { useScheduleProductActions } from './useScheduleProductActions'

vi.mock('@/context/UserContext', () => ({ useUser: () => ({ token: 'token' }) }))
vi.mock('../api/scheduleProductMutations', () => ({ deleteScheduleProduct: vi.fn(), patchScheduleProduct: vi.fn() }))
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))
const row = mapApplicationProductRow({ ScheduleProductId: 2033, productName: 'Original', Retail: true, Industrial: true, privateLabel: false }, 0)
const setup = () => {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { ...renderHook(() => useScheduleProductActions('421'), { wrapper }), client, invalidate }
}
beforeEach(() => vi.resetAllMocks())
describe('Schedule B product actions', () => {
  it('edits, saves cleared fields, and refreshes only this application products', async () => {
    const { result, invalidate, unmount, client } = setup()
    act(() => result.current.start(row))
    expect(result.current.draft).toMatchObject({ productName: 'Original', Retail: true, Industrial: true })
    act(() => { result.current.change('productName', 'Edited'); result.current.change('BrandName', '') })
    act(() => result.current.save())
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: applicationsQueryKeys.scheduleBProducts('421') }))
    expect(patchScheduleProduct).toHaveBeenCalledWith('2033', '421', expect.objectContaining({ productName: 'Edited', BrandName: '', Retail: true, Industrial: true }), 'token')
    expect(result.current.editingId).toBe(null)
    unmount(); client.clear()
  })
  it('cancels without a request and rejects blank names', async () => {
    const { result, unmount, client } = setup()
    act(() => result.current.start(row))
    act(() => result.current.cancel())
    expect(result.current.draft).toBe(null)
    expect(patchScheduleProduct).not.toHaveBeenCalled()
    act(() => result.current.start(row))
    act(() => result.current.change('productName', ' '))
    act(() => result.current.save())
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Product Name is required.'))
    expect(patchScheduleProduct).not.toHaveBeenCalled()
    expect(result.current.editingId).toBe('2033')
    unmount(); client.clear()
  })
  it('keeps edits after a failed save, then soft deletes and refreshes', async () => {
    vi.mocked(patchScheduleProduct).mockRejectedValueOnce(new Error('offline'))
    const { result, invalidate, unmount, client } = setup()
    act(() => result.current.start(row))
    act(() => result.current.save())
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('offline'))
    expect(result.current.editingId).toBe('2033')
    expect(invalidate).not.toHaveBeenCalled()
    act(() => result.current.remove('2033'))
    await waitFor(() => expect(invalidate).toHaveBeenCalled())
    expect(deleteScheduleProduct).toHaveBeenCalledWith('2033', 'token')
    expect(result.current.editingId).toBe(null)
    unmount(); client.clear()
  })
})
