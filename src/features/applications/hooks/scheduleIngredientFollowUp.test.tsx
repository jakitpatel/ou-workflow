import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, expect, it, vi } from 'vitest'
import { fetchScheduleAIngredients } from '../api'
import { patchScheduleIngredientFollowUp, patchScheduleIngredientHalachicReview } from '../api/scheduleIngredientMutations'
import { patchTaskStatusDetails } from '@/features/tasks/api'
import { applicationsQueryKeys } from '../model/queryKeys'
import { getApplicationIngredientRowId, useScheduleAIngredients, useScheduleAScratchpad } from './useScheduleAIngredients'

vi.mock('@/context/UserContext', () => ({ useUser: () => ({ token: 'token', username: 'tester' }) }))
vi.mock('../api', () => ({ fetchScheduleAIngredients: vi.fn() }))
vi.mock('../api/scheduleIngredientMutations', () => ({ patchScheduleIngredientFollowUp: vi.fn(), patchScheduleIngredientHalachicReview: vi.fn() }))
vi.mock('@/features/tasks/api', () => ({ patchTaskStatusDetails: vi.fn(), fetchTaskInstance: vi.fn() }))
vi.mock('../cache/applicationListCache', () => ({ refreshApplicationInListCaches: vi.fn() }))

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

it('loads and saves ingredient flags and notes without task PATCHes, and preserves task-owned saves', async () => {
  const ingredient = { ApplicationID: 1166, IngredientId: 566, isFlagged: true, flaggedNote: 'Server note', isHalachic: true, halachicNote: 'Keep halacha' }
  let serverIngredient = { ...ingredient }
  const id = getApplicationIngredientRowId(ingredient, 0)
  vi.mocked(fetchScheduleAIngredients).mockImplementation(async () => ({ scheduleIngredients: [{ ...serverIngredient }], kashIngredients: [] }))
  vi.mocked(patchScheduleIngredientFollowUp).mockImplementation(async (_id, attributes) => {
    serverIngredient = { ...serverIngredient, ...attributes }
    return {}
  })
  vi.mocked(patchTaskStatusDetails).mockResolvedValue({} as never)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const initialStatus = { savedState: {
    flags: { [id]: { flagged: false, note: 'Old task note' }, 'kash-legacy': { flagged: true, note: 'Legacy note' } },
    halacha: { [id]: { open: true, note: 'Keep halacha' }, 'kash-legacy': { open: true, note: 'Legacy review' } },
    resolved: { [id]: true, 'kash-legacy': true },
  } }
  const { result, unmount } = renderHook(() => {
    const { data } = useScheduleAIngredients('1166')
    return useScheduleAScratchpad('1166', '123', initialStatus, data?.scheduleIngredients)
  }, { wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> })
  await waitFor(() => expect(result.current.scratchpad.flags[id]).toEqual({ flagged: true, note: 'Server note' }))
  expect(result.current.scratchpad.halacha[id]).toEqual({ open: true, note: 'Keep halacha' })
  expect(result.current.scratchpad.flags).not.toHaveProperty('kash-legacy')
  expect(result.current.scratchpad.halacha).not.toHaveProperty('kash-legacy')
  expect(result.current.scratchpad.resolved).toEqual({})
  act(() => result.current.toggleFlag(id))
  await waitFor(() => expect(result.current.scratchpad.flags[id]?.flagged).toBe(false))
  expect(patchScheduleIngredientFollowUp).toHaveBeenCalledWith('566', { isFlagged: false, flaggedNote: 'Server note' }, 'token')
  await waitFor(() => expect(client.isMutating()).toBe(0))
  act(() => result.current.updateFlagNote(id, 'Provide updated LOC - Letter of Certification.'))
  await waitFor(() => expect(serverIngredient.flaggedNote).toBe('Provide updated LOC - Letter of Certification.'))
  expect(patchScheduleIngredientFollowUp).toHaveBeenLastCalledWith('566', {
    isFlagged: true, flaggedNote: 'Provide updated LOC - Letter of Certification.',
  }, 'token')
  await act(async () => { await client.invalidateQueries({ queryKey: applicationsQueryKeys.scheduleAIngredients('1166') }) })
  expect(result.current.scratchpad.flags[id]).toEqual({ flagged: true, note: serverIngredient.flaggedNote })
  act(() => result.current.updateFlagNote(id, 'Custom follow-up note'))
  await waitFor(() => expect(serverIngredient.flaggedNote).toBe('Custom follow-up note'))
  await waitFor(() => expect(client.isMutating()).toBe(0))
  vi.mocked(patchScheduleIngredientFollowUp).mockRejectedValueOnce(new Error('Ingredient save failed'))
  act(() => result.current.toggleFlag(id))
  await waitFor(() => expect(result.current.saveError).toBe('Ingredient save failed'))
  await waitFor(() => expect(result.current.scratchpad.flags[id]).toEqual({ flagged: true, note: 'Custom follow-up note' }))
  act(() => {
    result.current.toggleResolved(id)
    result.current.setRowsResolved([id], true)
    result.current.setRowsResolved([id], false)
  })
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 750)) })
  expect(patchTaskStatusDetails).not.toHaveBeenCalled()
  act(() => result.current.markEirReceived())
  await waitFor(() => expect(patchTaskStatusDetails).toHaveBeenCalled())
  const statusDetails = vi.mocked(patchTaskStatusDetails).mock.calls.at(-1)?.[0].statusDetails as { savedState: unknown }
  const savedState = statusDetails.savedState
  expect(savedState).toEqual(expect.objectContaining({ eirReceived: true }))
  expect(savedState).not.toHaveProperty('flags')
  expect(savedState).not.toHaveProperty('halacha')
  expect(savedState).not.toHaveProperty('resolved')
  unmount()
  client.clear()
})

it('loads halachic review from ingredients and saves review toggles and typed notes without task PATCHes', async () => {
  let serverIngredient = { ApplicationID: 1166, IngredientId: 566, isHalachic: true, halachicNote: 'Server review', isFlagged: true, flaggedNote: 'Keep follow-up' }
  const id = getApplicationIngredientRowId(serverIngredient, 0)
  vi.mocked(fetchScheduleAIngredients).mockImplementation(async () => ({ scheduleIngredients: [{ ...serverIngredient }], kashIngredients: [] }))
  vi.mocked(patchScheduleIngredientHalachicReview).mockImplementation(async (_id, attributes) => {
    serverIngredient = { ...serverIngredient, ...attributes }
    return {}
  })
  vi.mocked(patchTaskStatusDetails).mockResolvedValue({} as never)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const initialStatus = { savedState: {
    halacha: { [id]: { open: false, note: 'Old task review' } },
  } }
  const { result, unmount } = renderHook(() => {
    const { data } = useScheduleAIngredients('1166')
    return useScheduleAScratchpad('1166', '123', initialStatus, data?.scheduleIngredients)
  }, { wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> })
  await waitFor(() => expect(result.current.scratchpad.halacha[id]).toEqual({ open: true, note: 'Server review' }))
  act(() => result.current.toggleHalacha(id))
  await waitFor(() => expect(result.current.scratchpad.halacha[id]?.open).toBe(false))
  expect(patchScheduleIngredientHalachicReview).toHaveBeenCalledWith('566', { isHalachic: false, halachicNote: 'Server review' }, 'token')
  await waitFor(() => expect(client.isMutating()).toBe(0))
  act(() => result.current.toggleHalacha(id))
  await waitFor(() => expect(result.current.scratchpad.halacha[id]?.open).toBe(true))
  await waitFor(() => expect(client.isMutating()).toBe(0))
  act(() => result.current.updateHalachaNote(id, 'Typed review note'))
  await waitFor(() => expect(serverIngredient.halachicNote).toBe('Typed review note'))
  expect(patchScheduleIngredientHalachicReview).toHaveBeenLastCalledWith('566', {
    isHalachic: true, halachicNote: 'Typed review note',
  }, 'token')
  await act(async () => { await client.invalidateQueries({ queryKey: applicationsQueryKeys.scheduleAIngredients('1166') }) })
  expect(result.current.scratchpad.halacha[id]).toEqual({ open: true, note: 'Typed review note' })
  expect(result.current.scratchpad.flags[id]).toEqual({ flagged: true, note: 'Keep follow-up' })
  await waitFor(() => expect(client.isMutating()).toBe(0))
  vi.mocked(patchScheduleIngredientHalachicReview).mockRejectedValueOnce(new Error('Review save failed'))
  act(() => result.current.toggleHalacha(id))
  await waitFor(() => expect(result.current.saveError).toBe('Review save failed'))
  await waitFor(() => expect(result.current.scratchpad.halacha[id]).toEqual({ open: true, note: 'Typed review note' }))
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 750)) })
  expect(patchTaskStatusDetails).not.toHaveBeenCalled()
  unmount()
  client.clear()
})
