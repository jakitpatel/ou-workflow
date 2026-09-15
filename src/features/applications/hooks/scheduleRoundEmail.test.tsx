import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApplicationMessage, updateApplicationMessage } from '@/features/applications/api'
import { useSendScheduleACommunicationEmail } from './useScheduleAIngredients'
import { useSendScheduleBCommunicationEmail } from './useScheduleBProducts'

vi.mock('@/context/UserContext', () => ({ useUser: () => ({ token: 'test', username: 'tester' }) }))
vi.mock('@/features/applications/api', () => ({
  createApplicationMessage: vi.fn(),
  updateApplicationMessage: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('VITE_EMAIL_IMPLIED_BCC', 'implied@example.com')
  vi.mocked(createApplicationMessage).mockResolvedValue({ data: { id: '42' } } as never)
  vi.mocked(updateApplicationMessage).mockResolvedValue({} as never)
})
afterEach(() => vi.unstubAllEnvs())

describe.each([
  ['A', useSendScheduleACommunicationEmail],
  ['B', useSendScheduleBCommunicationEmail],
] as const)('Schedule %s round email', (_name, useSend) => {
  function setup() {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    return renderHook(() => useSend(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    })
  }
  const input = { applicationId: '123', recipientEmail: 'to@example.com', subject: 'Round 1', body: 'Details' }

  it('stages manual copies and deduplicated implied Bcc before finalizing the email', async () => {
    const { result } = setup()
    await act(async () => {
      await result.current.mutateAsync({ ...input, ccUser: ' cc@example.com ', bccUser: 'manual@example.com; IMPLIED@example.com' })
    })
    expect(createApplicationMessage).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({ CCUser: 'cc@example.com', BCCUser: 'manual@example.com, IMPLIED@example.com', MessageType: 'Email-Staging' }),
    }))
    expect(updateApplicationMessage).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({ MessageType: 'Email' }),
    }))
  })

  it('adds implied Bcc when optional fields are absent in an older draft', async () => {
    const { result } = setup()
    await act(async () => { await result.current.mutateAsync(input) })
    expect(createApplicationMessage).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({ CCUser: null, BCCUser: 'implied@example.com' }),
    }))
  })

  it.each(['ccUser', 'bccUser'] as const)('rejects invalid %s before staging or sending', async (field) => {
    const { result } = setup()
    await act(async () => {
      await expect(result.current.mutateAsync({ ...input, [field]: 'invalid' })).rejects.toThrow('Enter valid email addresses')
    })
    expect(createApplicationMessage).not.toHaveBeenCalled()
    expect(updateApplicationMessage).not.toHaveBeenCalled()
  })
})
