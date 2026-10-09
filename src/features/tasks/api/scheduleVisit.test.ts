import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchWithAuth } from '@/shared/api/httpClient'

import { scheduleVisit } from './scheduleVisit'

vi.mock('@/shared/api/httpClient', () => ({ fetchWithAuth: vi.fn() }))
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchWithAuth).mockResolvedValue({ success: true })
})

describe('schedule visit request contract', () => {
  it.each(['SCHEDULE', 'ACTUAL'] as const)(
    'sends %s in visit_type with the unchanged calendar date',
    async (visitType) => {
      await scheduleVisit({
        visitType,
        visitId: '2970391',
        visitDate: '2026-10-15',
        token: 'token',
      })
      expect(fetchWithAuth).toHaveBeenCalledWith({
        path: '/schedule_visit',
        method: 'POST',
        body: { visit_type: visitType, visit_id: '2970391', visit_date: '2026-10-15' },
        token: 'token',
      })
    },
  )
  it('preserves the existing drawer request when no visit type is specified', async () => {
    await scheduleVisit({ visitId: '2970391', visitDate: '2026-10-15' })
    expect(fetchWithAuth).toHaveBeenCalledWith(
      expect.objectContaining({ body: { visit_id: '2970391', visit_date: '2026-10-15' } }),
    )
  })
  it('reports an unsuccessful HTTP-200 response as failure', async () => {
    vi.mocked(fetchWithAuth).mockResolvedValue({ success: false, error: 'Invalid date' })
    await expect(
      scheduleVisit({ visitType: 'ACTUAL', visitId: '2970391', visitDate: '2026-10-15' }),
    ).rejects.toThrow('Invalid date')
  })
})
