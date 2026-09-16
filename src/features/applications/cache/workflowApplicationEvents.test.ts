import { QueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchApplicants } from '@/features/applications/api'
import { applicationsQueryKeys } from '@/features/applications/model/queryKeys'
import type { SSEMessage } from '@/hooks/useSSE'
import { refreshWorkflowApplicationFromEvent } from './workflowApplicationEvents'

vi.mock('@/features/applications/api', () => ({ fetchApplicants: vi.fn() }))

const event: SSEMessage = {
  type: 'reload_workflow_application',
  data: { ApplicationType: 'WORKFLOW', application_id: 1332, task_instance_id: 18580 },
}

describe('workflow application events', () => {
  beforeEach(() => vi.mocked(fetchApplicants).mockReset())

  it('fetches only the matching ID and patches paged and infinite caches without invalidating lists', async () => {
    const client = new QueryClient()
    const target = { id: 1332, applicationId: 1332, status: 'new' }
    const other = { id: 1333, applicationId: 1333, status: 'new' }
    const updated = { ...target, status: 'completed' }
    const meta = { total_count: 52, offset: 0, limit: 50 }
    const pagedKey = applicationsQueryKeys.paged({ page: 0 })
    const infiniteKey = applicationsQueryKeys.infinite({})
    const otherKey = applicationsQueryKeys.paged({ page: 50 })
    const otherPage = { data: [other], meta }
    client.setQueryData(pagedKey, { data: [target, other], meta })
    client.setQueryData(infiniteKey, {
      pages: [otherPage, { data: [target], meta }], pageParams: [0, 50],
    })
    client.setQueryData(otherKey, otherPage)
    const untouched = client.getQueryData(otherKey)
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    vi.mocked(fetchApplicants).mockResolvedValue({ data: [updated], meta } as Awaited<ReturnType<typeof fetchApplicants>>)

    await refreshWorkflowApplicationFromEvent(event, client, 'token')

    expect(fetchApplicants).toHaveBeenCalledExactlyOnceWith({
      applicationId: 1332, limit: 1, myOnly: false, page: 0, token: 'token',
    })
    expect(client.getQueryData(pagedKey)).toEqual({ data: [updated, other], meta })
    expect(client.getQueryData(infiniteKey)).toEqual({
      pages: [otherPage, { data: [updated], meta }], pageParams: [0, 50],
    })
    expect(client.getQueryData(otherKey)).toBe(untouched)
    expect(invalidate).not.toHaveBeenCalled()
    client.clear()
  })

  it.each([
    { ...event, type: 'refresh_messages' },
    { ...event, data: { ...event.data, ApplicationType: 'PRELIM' } },
    ...[undefined, null, '', 'invalid', true, 0, -1].map((application_id) => ({
      ...event, data: { ...event.data, application_id },
    })),
    { ...event, data: { ...event.data, application_id: 9999 } },
  ])('ignores irrelevant, invalid, or uncached events: %j', async (message) => {
    const client = new QueryClient()
    client.setQueryData(applicationsQueryKeys.paged({}), { data: [{ applicationId: 1332 }] })
    await refreshWorkflowApplicationFromEvent(message, client, 'token')
    expect(fetchApplicants).not.toHaveBeenCalled()
    client.clear()
  })

  it('keeps cached data when the filtered response is empty', async () => {
    const client = new QueryClient()
    const key = applicationsQueryKeys.paged({})
    client.setQueryData(key, { data: [{ applicationId: 1332 }] })
    const original = client.getQueryData(key)
    vi.mocked(fetchApplicants).mockResolvedValue({
      status: 'ok',
      data: [],
      meta: { total_count: 0, offset: 0, limit: 1, async_enabled: false, count: 0, processing_time: 0 },
    })
    await refreshWorkflowApplicationFromEvent(event, client, 'token')
    expect(client.getQueryData(key)).toBe(original)
    client.clear()
  })
})
