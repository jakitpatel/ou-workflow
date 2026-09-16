import { QueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchPrelimApplications } from '@/features/prelim/api'
import { prelimQueryKeys } from '@/features/prelim/model/queryKeys'
import type { SSEMessage } from '@/hooks/useSSE'
import { refreshSubmissionApplicationFromEvent } from './submissionApplicationEvents'

vi.mock('@/features/prelim/api', () => ({ fetchPrelimApplications: vi.fn() }))

const event: SSEMessage = {
  type: 'reload_submission_application',
  data: { ApplicationType: 'SUBMISSION', application_id: 1367, task_instance_id: 18580 },
}

describe('submission application events', () => {
  beforeEach(() => vi.mocked(fetchPrelimApplications).mockReset())

  it('fetches only the matching ID and patches paged and infinite caches without invalidating lists', async () => {
    const client = new QueryClient()
    const target = { id: 1367, applicationId: 1367, status: 'new' }
    const other = { id: 1333, applicationId: 1333, status: 'new' }
    const updated = { ...target, status: 'completed' }
    const meta = { total_count: 52, offset: 0, limit: 50 }
    const pagedKey = prelimQueryKeys.list({ page: 0 })
    const infiniteKey = [...prelimQueryKeys.list({}), 'infinite']
    const otherKey = prelimQueryKeys.list({ page: 50 })
    const otherPage = { data: [other], meta }
    client.setQueryData(pagedKey, { data: [target, other], meta })
    client.setQueryData(infiniteKey, {
      pages: [otherPage, { data: [target], meta }], pageParams: [0, 50],
    })
    client.setQueryData(otherKey, otherPage)
    const untouched = client.getQueryData(otherKey)
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    vi.mocked(fetchPrelimApplications).mockResolvedValue({ data: [updated], meta } as Awaited<ReturnType<typeof fetchPrelimApplications>>)

    await refreshSubmissionApplicationFromEvent(event, client, 'token')

    expect(fetchPrelimApplications).toHaveBeenCalledExactlyOnceWith({
      applicationId: 1367, limit: 1, page: 0, token: 'token',
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
    client.setQueryData(prelimQueryKeys.list({}), { data: [{ applicationId: 1367 }] })
    await refreshSubmissionApplicationFromEvent(message, client, 'token')
    expect(fetchPrelimApplications).not.toHaveBeenCalled()
    client.clear()
  })

  it('keeps cached data when the filtered response is empty', async () => {
    const client = new QueryClient()
    const key = prelimQueryKeys.list({})
    client.setQueryData(key, { data: [{ applicationId: 1367 }] })
    const original = client.getQueryData(key)
    vi.mocked(fetchPrelimApplications).mockResolvedValue({
      status: 'ok',
      data: [],
      meta: { total_count: 0, offset: 0, limit: 1, async_enabled: false, count: 0, processing_time: 0 },
    })
    await refreshSubmissionApplicationFromEvent(event, client, 'token')
    expect(client.getQueryData(key)).toBe(original)
    client.clear()
  })
})

