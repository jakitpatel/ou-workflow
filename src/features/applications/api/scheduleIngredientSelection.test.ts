import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchWithAuth } from '@/shared/api/httpClient'
import { saveScheduleIngredientSelection } from './scheduleIngredientSelection'

vi.mock('@/shared/api/httpClient', () => ({ fetchWithAuth: vi.fn() }))

describe('Schedule ingredient selection', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each([
    [true, 'selected_ids'],
    [false, 'unselected_ids'],
  ] as const)('posts only the operation field for selected=%s', async (selected, field) => {
    await saveScheduleIngredientSelection(['17', '23'], selected, 'token')
    expect(fetchWithAuth).toHaveBeenCalledWith({
      path: '/schedule_ingredients',
      method: 'POST',
      body: { [field]: '17,23' },
      token: 'token',
    })
  })

  it('posts a single ingredient ID', async () => {
    await saveScheduleIngredientSelection(['17'], true, 'token')
    expect(fetchWithAuth).toHaveBeenCalledWith(expect.objectContaining({
      body: { selected_ids: '17' },
    }))
  })

  it('propagates save failures', async () => {
    vi.mocked(fetchWithAuth).mockRejectedValueOnce(new Error('Save failed'))
    await expect(saveScheduleIngredientSelection(['17'], false)).rejects.toThrow('Save failed')
  })
})
