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
