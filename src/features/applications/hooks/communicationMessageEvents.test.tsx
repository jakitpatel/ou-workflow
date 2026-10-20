import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SSEMessage } from '@/hooks/useSSE'
import { fetchApplicationMessages } from '@/features/applications/api'
import { useScheduleACommunicationMessages } from './useScheduleAIngredients'
import { useScheduleBCommunicationMessages } from './useScheduleBProducts'
import { useContractCommunicationMessages } from './useContractRcNotification'

const listener = vi.hoisted(() => ({ callback: (_message: SSEMessage) => {}, enabled: false }))
vi.mock('@/hooks/useSSE', () => ({
  useSSE: (callback: (message: SSEMessage) => void, options: { enabled: boolean }) => {
    listener.callback = callback
    listener.enabled = options.enabled
  },
}))
vi.mock('@/context/UserContext', () => ({ useUser: () => ({ token: 'token' }) }))
vi.mock('@/features/applications/api', () => ({ fetchApplicationMessages: vi.fn() }))

const event: SSEMessage = {
  type: 'refresh_messages', pushSeqNum: 1070,
  data: { application_type: 'WORKFLOW', ApplicationId: 421, TaskInstanceId: 14080 },
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchApplicationMessages).mockResolvedValue([])
})

describe.each([
  ['Schedule A', useScheduleACommunicationMessages],
  ['Schedule B', useScheduleBCommunicationMessages],
  ['Contract', useContractCommunicationMessages],
] as const)('%s communication events', (_name, useMessages) => {
  it.each([1070, 0, undefined])('refreshes matching open drawer messages with pushSeqNum %s', async (pushSeqNum) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) =>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    const { result, rerender, unmount } = renderHook(({ open }) => useMessages({
      applicationId: open ? 421 : undefined, taskInstanceId: 14080,
    }), { wrapper, initialProps: { open: true } })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    vi.mocked(fetchApplicationMessages).mockClear()
    expect(listener.enabled).toBe(true)
    for (const ignored of [
      { ...event, type: 'reload_workflow_application' },
      { ...event, data: { ...event.data, ApplicationId: 999 } },
      { ...event, data: { ...event.data, TaskInstanceId: 999 } },
      { ...event, data: { ...event.data, application_type: 'SUBMISSION' } },
      { ...event, data: undefined },
    ]) act(() => listener.callback(ignored))
    expect(fetchApplicationMessages).not.toHaveBeenCalled()
    act(() => listener.callback({ ...event, pushSeqNum }))
    await waitFor(() => expect(fetchApplicationMessages).toHaveBeenCalledExactlyOnceWith({
      applicationId: '421', taskInstanceId: '14080', token: 'token', pushSeqNum: pushSeqNum ?? -1,
    }))
    await waitFor(() => expect(result.current.isFetching).toBe(false))
    rerender({ open: false })
    expect(listener.enabled).toBe(false)
    vi.mocked(fetchApplicationMessages).mockClear()
    act(() => listener.callback(event))
    expect(fetchApplicationMessages).not.toHaveBeenCalled()
    unmount()
    client.clear()
  })
})
