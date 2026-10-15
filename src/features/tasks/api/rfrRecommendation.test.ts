import { expect, it, vi } from 'vitest'
import { fetchWithAuth } from '@/shared/api/httpClient'
import { confirmTask } from './index'
import { buildRfrRecommendationCompletion, postRfrRecommendationMessage } from '../lib/rfrRecommendation'

vi.mock('@/shared/api/httpClient', () => ({ fetchWithAuth: vi.fn().mockResolvedValue({ success: true }) }))

it('sends the RFR recommendation completion payload', async () => {
  await confirmTask({ taskId: '123', username: 'S.Benjamin', token: 'token', ...buildRfrRecommendationCompletion('selected.rfr', 'Rabbi Test Full Name') })
  expect(fetchWithAuth).toHaveBeenCalledExactlyOnceWith({
    path: '/complete_task', method: 'POST', token: 'token',
    body: {
      task_instance_id: '123', capacity: 'DESIGNATED', completed_by: 'S.Benjamin',
      completion_notes: 'Task completed successfully', result: '{selectRFR:YES, RFR:selected.rfr}',
      GUIDisplayResult: '{Recommended RFR:Rabbi Test Full Name}',
    },
  })
})

it('posts the public recommendation message in the application message envelope', async () => {
  vi.mocked(fetchWithAuth).mockClear()
  const before = Date.now()
  await postRfrRecommendationMessage({ applicationId: 1548, fullName: 'Full Name', username: 'S.Benjamin', token: 'token' })
  expect(fetchWithAuth).toHaveBeenCalledExactlyOnceWith({
    path: '/api/WFApplicationMessage', method: 'POST', token: 'token',
    body: { data: { type: 'WFApplicationMessage', attributes: {
      ApplicationID: 1548, MessageText: 'Recommanded RFR is Full Name', isPrivate: false,
      isRead: false, FromUser: 'S.Benjamin', MessageType: 'Text', SentDate: expect.any(String), Priority: 'NORMAL',
    } } },
  })
  const request = vi.mocked(fetchWithAuth).mock.calls[0][0]
  const timestamp = (request.body as { data: { attributes: { SentDate: string } } }).data.attributes.SentDate
  expect(Date.parse(timestamp)).toBeGreaterThanOrEqual(before)
  expect(Date.parse(timestamp)).toBeLessThanOrEqual(Date.now())
})
