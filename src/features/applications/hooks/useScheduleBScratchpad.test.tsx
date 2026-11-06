import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useScheduleBScratchpad } from './useScheduleBProducts'

const mocks = vi.hoisted(() => ({
  patchReview: vi.fn(),
  username: 'iar.one',
  fetchTaskInstance: vi.fn(),
  patchTaskStatusDetails: vi.fn(),
}))

vi.mock('../api/scheduleProductReview', () => ({
  patchScheduleProductFollowUp: mocks.patchReview,
  patchScheduleProductHalachicReview: mocks.patchReview,
}))

vi.mock('@/context/UserContext', () => ({
  useUser: () => ({ token: 'token', username: mocks.username }),
}))
vi.mock('@/features/tasks/api', () => ({
  fetchTaskInstance: mocks.fetchTaskInstance,
  patchTaskStatusDetails: mocks.patchTaskStatusDetails,
}))
vi.mock('@/features/applications/cache/applicationListCache', () => ({
  refreshApplicationInListCaches: vi.fn(async () => {}),
}))

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)

// Flags, halacha and resolved marks are stored on the ingredients in the database; the task's
// saved state (and its browser copy) holds the rest, e.g. the EIR progress used below.
describe('useScheduleBScratchpad', () => {
  beforeEach(() => {
    mocks.patchReview.mockReset().mockResolvedValue({})
    window.localStorage.clear()
    mocks.username = 'iar.one'
    mocks.fetchTaskInstance.mockReset().mockResolvedValue({ data: { attributes: { StatusDetails: '{}' } } })
    mocks.patchTaskStatusDetails.mockReset().mockResolvedValue({})
  })

  it('saves a task-owned edit to the ScheduleB task StatusDetails, without database-owned marks', async () => {
    const { result } = renderHook(() => useScheduleBScratchpad(15, 575), { wrapper })
    await waitFor(() => expect(mocks.fetchTaskInstance).toHaveBeenCalledWith({ taskId: '575', token: 'token' }))
    await waitFor(() => expect(result.current.scratchpad).toBeDefined())

    act(() => result.current.markEirReceived())
    await waitFor(
      () =>
        expect(mocks.patchTaskStatusDetails).toHaveBeenCalledWith({
          taskId: '575',
          statusDetails: { savedState: expect.objectContaining({ eirReceived: true }) },
          token: 'token',
        }),
      { timeout: 2000 },
    )
    const savedState = mocks.patchTaskStatusDetails.mock.calls.at(-1)?.[0].statusDetails.savedState
    expect(savedState).not.toHaveProperty('flags')
    expect(savedState).not.toHaveProperty('halacha')
    expect(savedState).not.toHaveProperty('resolved')
  })

  it('never keeps Schedule B marks in the browser, and clears copies earlier versions left', async () => {
    window.localStorage.setItem('schedule-b-products-v33:iar.one:15', JSON.stringify({ eirReceived: true }))
    window.localStorage.setItem('schedule-b-products-v33:iar.one:15:unsaved', JSON.stringify({ base: '', draft: {} }))
    window.localStorage.setItem('schedule-b-products-v32:15', JSON.stringify({ username: 'iar.one', eirReceived: true }))
    window.localStorage.setItem('unrelated-key', 'kept')
    const { result } = renderHook(() => useScheduleBScratchpad(15, 575), { wrapper })
    await waitFor(() => expect(result.current.isLoadingSavedState).toBe(false))
    // Old browser copies are neither read nor kept.
    expect(result.current.scratchpad.eirReceived).toBe(false)
    expect(Object.keys(window.localStorage)).toEqual(['unrelated-key'])

    act(() => result.current.markEirReceived())
    await waitFor(() => expect(mocks.patchTaskStatusDetails).toHaveBeenCalled(), { timeout: 2000 })
    expect(Object.keys(window.localStorage)).toEqual(['unrelated-key'])
  })

  it('reads marks back from a StatusDetails Python repr containing quotes', async () => {
    mocks.fetchTaskInstance.mockResolvedValue({
      data: {
        attributes: {
          StatusDetails: `{'savedState': {'eirReceived': True, 'scheduleBReadyBy': "o'brien"}}`,
        },
      },
    })
    const { result } = renderHook(() => useScheduleBScratchpad(15, 575), { wrapper })
    await waitFor(() => expect(result.current.scratchpad.scheduleBReadyBy).toBe("o'brien"))
    expect(result.current.scratchpad.eirReceived).toBe(true)
  })

  // Found while browser-verifying F8: unreadable server state was replaced by an empty save.
  it('never auto-saves over server state it could not read', async () => {
    mocks.fetchTaskInstance.mockResolvedValue({ data: { attributes: { StatusDetails: "{'savedState': {'eirReceived': " } } })
    const { result } = renderHook(() => useScheduleBScratchpad(15, 575), { wrapper })
    await waitFor(() => expect(result.current.saveError).toMatch(/could not be read/))

    act(() => result.current.markEirReceived())
    await new Promise((resolve) => setTimeout(resolve, 900))
    expect(mocks.patchTaskStatusDetails).not.toHaveBeenCalled()
  })

  it('never auto-saves when the ScheduleB task could not be loaded', async () => {
    mocks.fetchTaskInstance.mockRejectedValue(new Error('500'))
    const { result } = renderHook(() => useScheduleBScratchpad(15, 575), { wrapper })
    await waitFor(() => expect(result.current.saveError).toMatch(/could not be read/), { timeout: 3000 })
    await new Promise((resolve) => setTimeout(resolve, 900))
    expect(mocks.patchTaskStatusDetails).not.toHaveBeenCalled()
  })
})

describe('Schedule B database review saves', () => {
  beforeEach(() => { mocks.patchReview.mockReset().mockResolvedValue({}); mocks.patchTaskStatusDetails.mockReset() })
  it('patches flags and Halachic notes without saving TaskInstance', async () => {
    const products = [{ ScheduleProductId: 2034, isFlagged: false, flaggedNote: 'Existing', isHalachic: false }]
    const { result } = renderHook(() => useScheduleBScratchpad(15, 575, '{}', { products }), { wrapper })
    act(() => result.current.toggleFlag('application--2034'))
    await waitFor(() => expect(mocks.patchReview).toHaveBeenCalledWith('2034', { isFlagged: true, flaggedNote: 'Existing' }, 'token'))
    act(() => result.current.updateFlagNote('application--2034', 'New note'))
    await waitFor(() => expect(mocks.patchReview).toHaveBeenCalledWith('2034', { isFlagged: true, flaggedNote: 'New note' }, 'token'))
    act(() => result.current.updateHalachaNote('application--2034', 'Review'))
    await waitFor(() => expect(mocks.patchReview).toHaveBeenCalledWith('2034', { isHalachic: true, halachicNote: 'Review' }, 'token'))
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 800)) })
    expect(mocks.patchTaskStatusDetails).not.toHaveBeenCalled()
  })
})
