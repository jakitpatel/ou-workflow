import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeScratchpadKey, useScheduleAScratchpad } from './useScheduleAIngredients'

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

// Flags, halacha and resolved marks are stored on the ingredients in the database; the task's
// saved state (and its browser copy) holds the rest, e.g. the EIR progress used below.
describe('useScheduleAScratchpad', () => {
  beforeEach(() => {
    window.localStorage.clear()
    mocks.username = 'iar.one'
    mocks.fetchTaskInstance.mockReset().mockResolvedValue({ data: { attributes: { StatusDetails: '{}' } } })
    mocks.patchTaskStatusDetails.mockReset().mockResolvedValue({})
  })

  it('scopes the browser copy per user', () => {
    expect(makeScratchpadKey(15, 'IAR.One')).toBe('schedule-a-ingredients-v33:iar.one:15')
    expect(makeScratchpadKey(15, 'iar.two')).not.toBe(makeScratchpadKey(15, 'iar.one'))
  })

  // Audit F8: once the ScheduleA task id is known (even a NEW task), a task-owned edit reaches the server.
  it('saves a task-owned edit to the ScheduleA task StatusDetails, without database-owned marks', async () => {
    const { result } = renderHook(() => useScheduleAScratchpad(15, 569), { wrapper })
    await waitFor(() => expect(mocks.fetchTaskInstance).toHaveBeenCalledWith({ taskId: '569', token: 'token' }))
    await waitFor(() => expect(result.current.scratchpad).toBeDefined())

    act(() => result.current.markEirReceived())
    await waitFor(
      () =>
        expect(mocks.patchTaskStatusDetails).toHaveBeenCalledWith({
          taskId: '569',
          statusDetails: { savedState: expect.objectContaining({ eirReceived: true }) },
          token: 'token',
        }),
      { timeout: 2000 },
    )
    const savedState = mocks.patchTaskStatusDetails.mock.calls.at(-1)?.[0].statusDetails.savedState
    expect(savedState).not.toHaveProperty('flags')
    expect(savedState).not.toHaveProperty('halacha')
    expect(savedState).not.toHaveProperty('resolved')
    const browserCopy = JSON.parse(window.localStorage.getItem(makeScratchpadKey(15, 'iar.one'))!)
    expect(browserCopy.eirReceived).toBe(true)
    expect(browserCopy).not.toHaveProperty('flags')
  })

  it("does not adopt another user's marks from the old shared browser key", async () => {
    window.localStorage.setItem(
      'schedule-a-ingredients-v32:15',
      JSON.stringify({ username: 'someone.else', eirReceived: true }),
    )
    const { result } = renderHook(() => useScheduleAScratchpad(15, null), { wrapper })
    await waitFor(() => expect(result.current.isLoadingSavedState).toBe(false))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(result.current.scratchpad.eirReceived).toBe(false)
  })

  it('adopts marks the same user saved under the old shared browser key, ignoring old flags', async () => {
    window.localStorage.setItem(
      'schedule-a-ingredients-v32:15',
      JSON.stringify({ username: 'iar.one', eirReceived: true, flags: { 'app-1': { flagged: true, note: 'mine' } } }),
    )
    const { result } = renderHook(() => useScheduleAScratchpad(15, null), { wrapper })
    await waitFor(() => expect(result.current.scratchpad.eirReceived).toBe(true))
    expect(result.current.scratchpad.flags).toEqual({})
  })

  it('reads marks back from a StatusDetails Python repr containing quotes', async () => {
    mocks.fetchTaskInstance.mockResolvedValue({
      data: {
        attributes: {
          StatusDetails: `{'savedState': {'eirReceived': True, 'scheduleAReadyBy': "o'brien"}}`,
        },
      },
    })
    const { result } = renderHook(() => useScheduleAScratchpad(15, 569), { wrapper })
    await waitFor(() => expect(result.current.scratchpad.scheduleAReadyBy).toBe("o'brien"))
    expect(result.current.scratchpad.eirReceived).toBe(true)
  })

  // Found while browser-verifying F8: unreadable server state was replaced by an empty save.
  it('never auto-saves over server state it could not read', async () => {
    mocks.fetchTaskInstance.mockResolvedValue({ data: { attributes: { StatusDetails: "{'savedState': {'eirReceived': " } } })
    const { result } = renderHook(() => useScheduleAScratchpad(15, 569), { wrapper })
    await waitFor(() => expect(result.current.saveError).toMatch(/could not be read/))

    act(() => result.current.markEirReceived())
    await new Promise((resolve) => setTimeout(resolve, 900))
    expect(mocks.patchTaskStatusDetails).not.toHaveBeenCalled()
  })

  it('never auto-saves when the ScheduleA task could not be loaded', async () => {
    mocks.fetchTaskInstance.mockRejectedValue(new Error('500'))
    const { result } = renderHook(() => useScheduleAScratchpad(15, 569), { wrapper })
    await waitFor(() => expect(result.current.saveError).toMatch(/could not be read/), { timeout: 3000 })
    await new Promise((resolve) => setTimeout(resolve, 900))
    expect(mocks.patchTaskStatusDetails).not.toHaveBeenCalled()
  })
})
