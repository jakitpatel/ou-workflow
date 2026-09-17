import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchMyMessages } from './index'
import { fetchWithAuth } from '@/shared/api/httpClient'

vi.mock('@/shared/api/httpClient', () => ({ fetchWithAuth: vi.fn() }))

beforeEach(() => vi.clearAllMocks())

describe('application global messages', () => {
  it('maps GlobalMessages from the existing application-filtered request', async () => {
    vi.mocked(fetchWithAuth).mockResolvedValue({
      messages: {
        GlobalMessages: [
          {
            MessageID: 7,
            ApplicationID: 42,
            MessageText: 'Global application note',
            isPrivate: true,
          },
        ],
      },
    })
    const result = await fetchMyMessages({ applicationId: 42, token: 'test-token' })
    expect(fetchWithAuth).toHaveBeenCalledTimes(1)
    const request = vi.mocked(fetchWithAuth).mock.calls[0][0]
    expect(request.path.split('?')[0]).toBe('/get_my_messages_v1')
    expect(new URLSearchParams(request.path.split('?')[1]).get('filter[ApplicationID]')).toBe('42')
    expect(result.global).toEqual([
      expect.objectContaining({
        MessageID: 7,
        ApplicationID: 42,
        text: 'Global application note',
        isPrivate: true,
      }),
    ])
  })

  it('returns an empty Global list if the backend omits it', async () => {
    vi.mocked(fetchWithAuth).mockResolvedValue({ messages: {} })
    expect((await fetchMyMessages()).global).toEqual([])
  })
})
