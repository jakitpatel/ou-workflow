import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { mapApplicationProductRow } from './useScheduleBProducts'
import { useScheduleIngredientActions } from './useScheduleIngredientActions'
import { useScheduleProductActions } from './useScheduleProductActions'
import type { ScheduleAIngredientRow } from './useScheduleAIngredients'

// fe7: a Schedule A/B row edit or delete answered by an empty 200 used to close the editor and
// refresh as if saved. Now the toast says nothing was saved and the edit stays open.
vi.mock('@/context/UserContext', () => ({ useUser: () => ({ token: 'token' }) }))
vi.mock('@/auth/authService', () => ({
  getAccessToken: vi.fn(() => 'token'), refreshAccessToken: vi.fn(), cognitoLogout: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

const NOT_CONFIRMED = 'The server did not confirm the change. Nothing was saved.'
let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.mocked(toast.error).mockReset()
  fetchMock = vi.fn(async () => new Response('', { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

const wrap = () => {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { wrapper, invalidate, client }
}

describe('Schedule B row actions on an empty 200', () => {
  const row = mapApplicationProductRow({ ScheduleProductId: 218, productName: 'FIX-fe7 bread', Retail: true }, 0)

  it('keeps the edit open with its draft and does not refresh', async () => {
    const { wrapper, invalidate, client } = wrap()
    const { result, unmount } = renderHook(() => useScheduleProductActions('2144'), { wrapper })
    act(() => result.current.start(row))
    act(() => result.current.change('productName', 'FIX-fe7 edited'))
    act(() => result.current.save())
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(NOT_CONFIRMED))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.current.editingId).toBe('218')
    expect(result.current.draft).toMatchObject({ productName: 'FIX-fe7 edited' })
    expect(invalidate).not.toHaveBeenCalled()
    unmount(); client.clear()
  })

  it('reports a delete that was not confirmed', async () => {
    const { wrapper, invalidate, client } = wrap()
    const { result, unmount } = renderHook(() => useScheduleProductActions('2144'), { wrapper })
    const settled = vi.fn()
    act(() => result.current.remove('218', { onSettled: settled }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(NOT_CONFIRMED))
    expect(settled).toHaveBeenCalled()
    expect(invalidate).not.toHaveBeenCalled()
    unmount(); client.clear()
  })
})

describe('Schedule A row actions on an empty 200', () => {
  const row = {
    ingredientId: '255', name: 'FIX-fe7 salt', source: 'Acme', brand: '', rmc: 'R1', raw: {},
  } as unknown as ScheduleAIngredientRow

  it('keeps the edit open with its draft and does not refresh', async () => {
    const { wrapper, invalidate, client } = wrap()
    const { result, unmount } = renderHook(() => useScheduleIngredientActions('2144'), { wrapper })
    act(() => result.current.start(row))
    act(() => result.current.change('ingredientLabelName', 'FIX-fe7 sea salt'))
    act(() => result.current.save())
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(NOT_CONFIRMED))
    expect(result.current.editingId).toBe('255')
    expect(result.current.draft).toMatchObject({ ingredientLabelName: 'FIX-fe7 sea salt' })
    expect(invalidate).not.toHaveBeenCalled()
    unmount(); client.clear()
  })

  it('reports a delete that was not confirmed', async () => {
    const { wrapper, invalidate, client } = wrap()
    const { result, unmount } = renderHook(() => useScheduleIngredientActions('2144'), { wrapper })
    act(() => result.current.remove('255'))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(NOT_CONFIRMED))
    expect(invalidate).not.toHaveBeenCalled()
    unmount(); client.clear()
  })
})
