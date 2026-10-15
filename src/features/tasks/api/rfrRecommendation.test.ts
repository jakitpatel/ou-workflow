import { expect, it, vi } from 'vitest'
import { fetchWithAuth } from '@/shared/api/httpClient'
import { confirmTask } from './index'
import { buildRfrRecommendationCompletion } from '../lib/rfrRecommendation'

vi.mock('@/shared/api/httpClient', () => ({ fetchWithAuth: vi.fn().mockResolvedValue({ success: true }) }))

it('sends the RFR recommendation completion payload', async () => {
  await confirmTask({ taskId: '123', username: 'S.Benjamin', token: 'token', ...buildRfrRecommendationCompletion('selected.rfr') })
  expect(fetchWithAuth).toHaveBeenCalledExactlyOnceWith({
    path: '/complete_task', method: 'POST', token: 'token',
    body: {
      task_instance_id: '123', capacity: 'DESIGNATED', completed_by: 'S.Benjamin',
      completion_notes: 'Task completed successfully', result: '{selectRFR:YES, RFR:selected.rfr}',
      GUIDisplayResult: '{RFR:selected.rfr}',
    },
  })
})
