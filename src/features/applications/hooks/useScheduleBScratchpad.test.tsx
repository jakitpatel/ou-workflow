import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useScheduleBScratchpad } from './useScheduleBProducts'

const mocks = vi.hoisted(() => ({
  username: 'iar.one',
  fetchTaskInstance: vi.fn(),
  patchTaskStatusDetails: vi.fn(),
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

describe('useScheduleBScratchpad', () => {
  beforeEach(() => {
    window.localStorage.clear()
    mocks.username = 'iar.one'
    mocks.fetchTaskInstance.mockReset().mockResolvedValue({ data: { attributes: { StatusDetails: '{}' } } })
    mocks.patchTaskStatusDetails.mockReset().mockResolvedValue({})
  })

  it('saves a flag to the ScheduleB task StatusDetails', async () => {
    const { result } = renderHook(() => useScheduleBScratchpad(15, 575), { wrapper })
    await waitFor(() => expect(mocks.fetchTaskInstance).toHaveBeenCalledWith({ taskId: '575', token: 'token' }))
    await waitFor(() => expect(result.current.scratchpad).toBeDefined())

    act(() => result.current.toggleFlag('app-1'))
    await waitFor(
      () =>
        expect(mocks.patchTaskStatusDetails).toHaveBeenCalledWith({
          taskId: '575',
          statusDetails: { savedState: expect.objectContaining({ flags: { 'app-1': { flagged: true, note: '' } } }) },
          token: 'token',
        }),
      { timeout: 2000 },
    )
    expect(window.localStorage.length).toBe(0)
  })

  it('never keeps Schedule B marks in the browser, and clears copies earlier versions left', async () => {
    window.localStorage.setItem('schedule-b-products-v33:iar.one:15', JSON.stringify({ flags: { 'app-1': { flagged: true, note: 'old' } } }))
    window.localStorage.setItem('schedule-b-products-v33:iar.one:15:unsaved', JSON.stringify({ base: '', draft: {} }))
    window.localStorage.setItem('schedule-b-products-v32:15', JSON.stringify({ username: 'iar.one', flags: { 'app-1': { flagged: true, note: 'mine' } } }))
    window.localStorage.setItem('unrelated-key', 'kept')
    const { result } = renderHook(() => useScheduleBScratchpad(15, 569), { wrapper })
    await waitFor(() => expect(result.current.isLoadingSavedState).toBe(false))
    // Old browser copies are neither read nor kept.
    expect(result.current.scratchpad.flags).toEqual({})
    expect(Object.keys(window.localStorage)).toEqual(['unrelated-key'])

    act(() => result.current.toggleFlag('app-1'))
    await waitFor(() => expect(mocks.patchTaskStatusDetails).toHaveBeenCalled(), { timeout: 2000 })
    expect(Object.keys(window.localStorage)).toEqual(['unrelated-key'])
  })

  it('reads marks back from a StatusDetails Python repr containing quotes', async () => {
    mocks.fetchTaskInstance.mockResolvedValue({
      data: { attributes: { StatusDetails: `{'savedState': {'flags': {'app-1': {'flagged': True, 'note': "supplier's LOC"}}}}` } },
    })
    const { result } = renderHook(() => useScheduleBScratchpad(15, 575), { wrapper })
    await waitFor(() => expect(result.current.scratchpad.flags['app-1']?.note).toBe("supplier's LOC"))
  })

  // Same data-loss guard as Schedule A (F8): unreadable server state was replaced by an empty save.
  it('never auto-saves over server state it could not read', async () => {
    mocks.fetchTaskInstance.mockResolvedValue({ data: { attributes: { StatusDetails: "{'savedState': {'flags': " } } })
    const { result } = renderHook(() => useScheduleBScratchpad(15, 575), { wrapper })
    await waitFor(() => expect(result.current.saveError).toMatch(/could not be read/))

    act(() => result.current.toggleFlag('app-1'))
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
