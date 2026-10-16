import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchPrelimApplications } from '@/features/prelim/api'
import { mapPrelimApplicantsResponse } from '@/features/prelim/api/mappers'
import { prelimQueryKeys } from '@/features/prelim/model/queryKeys'
import { applicationsQueryKeys } from '@/features/applications/model/queryKeys'
import { tasksQueryKeys } from '@/features/tasks/model/queryKeys'
import { useAssignTaskMutation, useConfirmTaskMutation } from './useTaskMutations'
import { confirmTask } from '@/features/tasks/api'
import { fetchWithAuth } from '@/shared/api/httpClient'

vi.mock('@/shared/api/httpClient', () => ({ fetchWithAuth: vi.fn().mockResolvedValue({}) }))

vi.mock('@/features/prelim/api', () => ({ fetchPrelimApplications: vi.fn() }))
vi.mock('@/features/tasks/api', () => ({
  confirmTask: vi.fn().mockResolvedValue({}),
  assignTask: vi.fn().mockResolvedValue({}),
  createTaskNote: vi.fn(),
  patchTaskStatus: vi.fn(),
  undoTask: vi.fn(),
}))

describe('intake task mutation refresh', () => {
  beforeEach(() => { vi.mocked(fetchPrelimApplications).mockReset() })

  it.each([false, true])('saves the selected RFR after completion and before refresh (save fails: %s)', async (fails) => {
    const client = new QueryClient()
    const onError = vi.fn()
    const events: string[] = []
    vi.mocked(confirmTask).mockImplementationOnce(async () => { events.push('complete'); return {} })
    vi.mocked(fetchWithAuth).mockImplementationOnce(async () => {
      events.push('save')
      if (fails) throw new Error('Service unavailable')
      return {}
    })
    vi.spyOn(client, 'invalidateQueries').mockImplementation(async () => { events.push('refresh') })
    const { result, unmount } = renderHook(() => useConfirmTaskMutation({ onError }), {
      wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    })
    await act(async () => {
      await result.current.mutateAsync({ taskId: '232', applicationId: 15, token: 'token', rfrRecommendationUsername: 'selected.rfr' })
    })
    expect(events).toEqual(['complete', 'save', 'refresh'])
    expect(fetchWithAuth).toHaveBeenLastCalledWith({
      path: '/global_data', method: 'POST', token: 'token',
      body: { applicationId: 15, taskInstanceId: 232, jsonData: { RFRRecommendation: 'selected.rfr' } },
    })
    if (fails) expect(onError).toHaveBeenCalledWith('RFR recommendation completed, but saving application global data failed: Service unavailable')
    else expect(onError).not.toHaveBeenCalled()
    unmount()
    client.clear()
  })

  it('does not save global data when completion fails', async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    vi.mocked(fetchWithAuth).mockClear()
    vi.mocked(confirmTask).mockRejectedValueOnce(new Error('Completion failed'))
    const { result, unmount } = renderHook(() => useConfirmTaskMutation(), {
      wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    })
    await act(async () => {
      await expect(result.current.mutateAsync({ taskId: '232', applicationId: 15, rfrRecommendationUsername: 'selected.rfr' })).rejects.toThrow('Completion failed')
    })
    expect(fetchWithAuth).not.toHaveBeenCalled()
    unmount()
    client.clear()
  })

  it.each(['confirm', 'assign'] as const)('%s updates the intake application without invalidating application lists', async (action) => {
    const client = new QueryClient()
    const key = prelimQueryKeys.list({ page: 0 })
    client.setQueryData(key, mapPrelimApplicantsResponse({ data: [{ applicationId: 1367, status: 'new' }] }))
    const response = mapPrelimApplicantsResponse({ data: [{ applicationId: 1367, status: 'completed' }] })
    vi.mocked(fetchPrelimApplications).mockResolvedValue(response)
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result, unmount } = renderHook(() => ({
      confirm: useConfirmTaskMutation({ includeApplicationLists: false, includePrelimLists: true }),
      assign: useAssignTaskMutation({ includeApplicationLists: false, includePrelimLists: true }),
    }), { wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> })

    await act(async () => {
      if (action === 'confirm') {
        await result.current.confirm.mutateAsync({ taskId: '19463', applicationId: 1367, token: 'token', result: 'YES' })
      } else {
        await result.current.assign.mutateAsync({ taskId: '19463', appId: 1367, token: 'token', role: 'NCRC', assignee: 'USER' })
      }
    })
    expect(fetchPrelimApplications).toHaveBeenCalledExactlyOnceWith({ applicationId: 1367, page: 0, limit: 1, token: 'token' })
    expect(client.getQueryData(key)).toEqual(response)
    expect(invalidate).toHaveBeenCalledExactlyOnceWith({ queryKey: tasksQueryKeys.lists() })
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: applicationsQueryKeys.lists() })
    unmount()
    client.clear()
  })
})
