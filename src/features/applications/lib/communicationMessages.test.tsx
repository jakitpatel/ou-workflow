import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { ApplicationEmail } from '@/types/application'
import { isEmailMessage, selectEmailMessages } from './communicationMessages'
import { useContractCommunicationMessages } from '../hooks/useContractRcNotification'
import { useScheduleACommunicationMessages } from '../hooks/useScheduleAIngredients'
import { useScheduleBCommunicationMessages } from '../hooks/useScheduleBProducts'

// The Communication tabs (Contract, Schedule A, Schedule B) list only messages whose MessageType
// includes "Email"; notes ("Text") and messages without a type are left out.
const messages = [
  { MessageID: 1, MessageType: 'Email', Subject: 'Round 1' },
  { MessageID: 2, MessageType: 'Text', Subject: 'Internal note' },
  { MessageID: 3, MessageType: 'EMAIL', Subject: 'Round 2' },
  { MessageID: 4, MessageType: 'InboundEmail', Subject: 'Reply' },
  { MessageID: 5, Subject: 'No type' },
  { MessageID: 6, MessageType: null, Subject: 'Null type' },
] as ApplicationEmail[]

vi.mock('@/context/UserContext', () => ({ useUser: () => ({ token: 'token', username: 'tester' }) }))
vi.mock('@/features/applications/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/applications/api')>()),
  fetchApplicationMessages: vi.fn(async () => messages),
}))
vi.mock('@/features/applications/hooks/useCommunicationMessageEvents', () => ({ useCommunicationMessageEvents: vi.fn() }))

describe('isEmailMessage / selectEmailMessages', () => {
  it('keeps messages whose MessageType includes "Email" (any case)', () => {
    expect(selectEmailMessages(messages).map((message) => message.MessageID)).toEqual([1, 3, 4])
    expect(isEmailMessage({ messageType: 'email' } as never)).toBe(true)
    expect(isEmailMessage({ MessageType: 'Text' })).toBe(false)
  })
})

describe.each([
  ['Contract', useContractCommunicationMessages],
  ['Schedule A', useScheduleACommunicationMessages],
  ['Schedule B', useScheduleBCommunicationMessages],
] as const)('%s Communication tab messages', (_name, useMessages) => {
  it('lists only email messages', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
    const { result } = renderHook(() => useMessages({ applicationId: 1659, taskInstanceId: 901 }), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.map((message) => message.MessageID)).toEqual([1, 3, 4])
  })
})
