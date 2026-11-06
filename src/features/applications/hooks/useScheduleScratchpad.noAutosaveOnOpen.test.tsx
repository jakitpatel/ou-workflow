import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useScheduleAScratchpad } from './useScheduleAIngredients'
import { useScheduleBScratchpad } from './useScheduleBProducts'

// w6b: the scratchpad hooks auto-save only after a real user change, never on hydrate.
const mocks = vi.hoisted(() => ({
  fetchTaskInstance: vi.fn(),
  patchTaskStatusDetails: vi.fn(),
}))

vi.mock('@/context/UserContext', () => ({
  useUser: () => ({ token: 'token', username: 'iar.one' }),
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
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
describe('useScheduleAScratchpad (task-owned marks)', () => {
  const savedA = (readyBy: string) =>
    JSON.stringify({ savedState: { username: 'someone', rounds: [], scheduleAReadyBy: readyBy } })

  beforeEach(() => {
    window.localStorage.clear()
    mocks.fetchTaskInstance.mockReset().mockResolvedValue({ data: { attributes: { StatusDetails: '{}' } } })
    mocks.patchTaskStatusDetails.mockReset().mockResolvedValue({})
  })

  it('does not save on hydrate, with empty, fetched or passed-in state', async () => {
    const empty = renderHook(() => useScheduleAScratchpad(15, 569), { wrapper })
    await waitFor(() => expect(mocks.fetchTaskInstance).toHaveBeenCalled())
    await wait(900)
    empty.unmount()

    mocks.fetchTaskInstance.mockResolvedValue({ data: { attributes: { StatusDetails: savedA('fetched') } } })
    const fetched = renderHook(() => useScheduleAScratchpad(15, 569), { wrapper })
    await waitFor(() => expect(fetched.result.current.scratchpad.scheduleAReadyBy).toBe('fetched'))
    await wait(900)
    fetched.unmount()

    const passed = renderHook(() => useScheduleAScratchpad(15, 569, savedA('passed')), { wrapper })
    await waitFor(() => expect(passed.result.current.scratchpad.scheduleAReadyBy).toBe('passed'))
    await wait(900)
    expect(mocks.patchTaskStatusDetails).not.toHaveBeenCalled()
  })

  it('does not save when the server state changes and re-hydrates', async () => {
    const { result, rerender } = renderHook(({ details }) => useScheduleAScratchpad(15, 569, details), {
      wrapper,
      initialProps: { details: savedA('v1') },
    })
    await waitFor(() => expect(result.current.scratchpad.scheduleAReadyBy).toBe('v1'))
    rerender({ details: savedA('v2') })
    await waitFor(() => expect(result.current.scratchpad.scheduleAReadyBy).toBe('v2'))
    await wait(900)
    expect(mocks.patchTaskStatusDetails).not.toHaveBeenCalled()
  })

  it('saves once after an edit, and not for an edit that leaves the server state unchanged', async () => {
    const { result } = renderHook(() => useScheduleAScratchpad(15, 569, savedA('v1')), { wrapper })
    await waitFor(() => expect(result.current.scratchpad.scheduleAReadyBy).toBe('v1'))

    // "EIR not required" is already off on the server: equal to what it holds, so nothing to save.
    act(() => result.current.clearEirNotRequired())
    await wait(900)
    expect(mocks.patchTaskStatusDetails).not.toHaveBeenCalled()

    act(() => result.current.markEirReceived())
    await waitFor(() => expect(mocks.patchTaskStatusDetails).toHaveBeenCalledTimes(1), { timeout: 2000 })
    await wait(900)
    expect(mocks.patchTaskStatusDetails).toHaveBeenCalledTimes(1)
  })

  it('read-only: edits are ignored, nothing is saved, and the browser copy is untouched', async () => {
    const { result } = renderHook(
      () => useScheduleAScratchpad(15, 569, savedA('server'), { readOnly: true }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.scratchpad.scheduleAReadyBy).toBe('server'))
    act(() => result.current.markEirReceived())
    act(() => result.current.retrySave())
    await wait(900)
    expect(result.current.scratchpad.eirReceived).toBe(false)
    expect(mocks.patchTaskStatusDetails).not.toHaveBeenCalled()
    expect(window.localStorage.length).toBe(0)
  })
})

describe('useScheduleBScratchpad (task-owned marks)', () => {
  const savedA = (readyBy: string) =>
    JSON.stringify({ savedState: { username: 'someone', rounds: [], scheduleBReadyBy: readyBy } })

  beforeEach(() => {
    window.localStorage.clear()
    mocks.fetchTaskInstance.mockReset().mockResolvedValue({ data: { attributes: { StatusDetails: '{}' } } })
    mocks.patchTaskStatusDetails.mockReset().mockResolvedValue({})
  })

  it('does not save on hydrate, with empty, fetched or passed-in state', async () => {
    const empty = renderHook(() => useScheduleBScratchpad(15, 569), { wrapper })
    await waitFor(() => expect(mocks.fetchTaskInstance).toHaveBeenCalled())
    await wait(900)
    empty.unmount()

    mocks.fetchTaskInstance.mockResolvedValue({ data: { attributes: { StatusDetails: savedA('fetched') } } })
    const fetched = renderHook(() => useScheduleBScratchpad(15, 569), { wrapper })
    await waitFor(() => expect(fetched.result.current.scratchpad.scheduleBReadyBy).toBe('fetched'))
    await wait(900)
    fetched.unmount()

    const passed = renderHook(() => useScheduleBScratchpad(15, 569, savedA('passed')), { wrapper })
    await waitFor(() => expect(passed.result.current.scratchpad.scheduleBReadyBy).toBe('passed'))
    await wait(900)
    expect(mocks.patchTaskStatusDetails).not.toHaveBeenCalled()
  })

  it('does not save when the server state changes and re-hydrates', async () => {
    const { result, rerender } = renderHook(({ details }) => useScheduleBScratchpad(15, 569, details), {
      wrapper,
      initialProps: { details: savedA('v1') },
    })
    await waitFor(() => expect(result.current.scratchpad.scheduleBReadyBy).toBe('v1'))
    rerender({ details: savedA('v2') })
    await waitFor(() => expect(result.current.scratchpad.scheduleBReadyBy).toBe('v2'))
    await wait(900)
    expect(mocks.patchTaskStatusDetails).not.toHaveBeenCalled()
  })

  it('saves once after an edit, and not for an edit that leaves the server state unchanged', async () => {
    const { result } = renderHook(() => useScheduleBScratchpad(15, 569, savedA('v1')), { wrapper })
    await waitFor(() => expect(result.current.scratchpad.scheduleBReadyBy).toBe('v1'))

    // "EIR not required" is already off on the server: equal to what it holds, so nothing to save.
    act(() => result.current.clearEirNotRequired())
    await wait(900)
    expect(mocks.patchTaskStatusDetails).not.toHaveBeenCalled()

    act(() => result.current.markEirReceived())
    await waitFor(() => expect(mocks.patchTaskStatusDetails).toHaveBeenCalledTimes(1), { timeout: 2000 })
    await wait(900)
    expect(mocks.patchTaskStatusDetails).toHaveBeenCalledTimes(1)
  })

  it('read-only: edits are ignored, nothing is saved, and the browser copy is untouched', async () => {
    const { result } = renderHook(
      () => useScheduleBScratchpad(15, 569, savedA('server'), { readOnly: true }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.scratchpad.scheduleBReadyBy).toBe('server'))
    act(() => result.current.markEirReceived())
    act(() => result.current.retrySave())
    await wait(900)
    expect(result.current.scratchpad.eirReceived).toBe(false)
    expect(mocks.patchTaskStatusDetails).not.toHaveBeenCalled()
    expect(window.localStorage.length).toBe(0)
  })
})
