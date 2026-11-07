import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ApplicationEmail } from '@/types/application'
import { fetchApplicationMessages } from '@/features/applications/api'
import { isEmailMessage, isRoundEmail, isRoundEmailSubject, selectEmailMessages } from './communicationMessages'
import { useContractCommunicationMessages } from '../hooks/useContractRcNotification'
import { useScheduleACommunicationMessages } from '../hooks/useScheduleAIngredients'
import { useScheduleBCommunicationMessages } from '../hooks/useScheduleBProducts'

// The subject reported from the server (App #1715): it must be listed whatever task opened the tab.
const REPORTED =
  'OU Schedule A - Additional Information Needed (App #1715, Task: #28140, refMessageId: #845, Round 2)'

// What GET /api/WFApplicationMessage?filter[ApplicationID]=1715 returns: every message of the
// application, for all its tasks, including replies stored without a TaskInstanceId.
const messages = [
  { MessageID: 1, MessageType: 'Email', Subject: REPORTED, TaskInstanceId: 28140 },
  { MessageID: 2, MessageType: 'InboundEmail', Subject: `RE: ${REPORTED}`, TaskInstanceId: null },
  { MessageID: 3, MessageType: 'Email', Subject: 'OU Schedule B - Additional Information Needed (App #1715, Task: #28555, Round 1)' },
  { MessageID: 4, MessageType: 'Text', Subject: REPORTED },
  { MessageID: 5, MessageType: 'Email', Subject: 'Welcome to OU Kosher' },
] as ApplicationEmail[]

vi.mock('@/context/UserContext', () => ({ useUser: () => ({ token: 'token', username: 'tester' }) }))
vi.mock('@/features/applications/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/applications/api')>()),
  fetchApplicationMessages: vi.fn(async () => messages),
}))
vi.mock('@/features/applications/hooks/useCommunicationMessageEvents', () => ({ useCommunicationMessageEvents: vi.fn() }))

describe('isEmailMessage / selectEmailMessages', () => {
  it('keeps messages whose MessageType includes "Email" (any case)', () => {
    expect(selectEmailMessages(messages).map((message) => message.MessageID)).toEqual([1, 2, 3, 5])
    expect(isEmailMessage({ messageType: 'email' } as never)).toBe(true)
    expect(isEmailMessage({ MessageType: 'Text' })).toBe(false)
  })
})

describe('round subject format', () => {
  it.each([
    REPORTED,
    `RE: ${REPORTED}`,
    'Fw: OU Kosher - Contract Package for Acme, Inc. (App #7, Task: #8, refMessageId: #9, Round 1)',
    'OU Schedule B - Additional Information Needed (App #1, Task: #42, Round 1)',
    'ou schedule a - more info (app #1, task: #9, refmessageid: #3, round 12)',
  ])('accepts %j', (subject) => {
    expect(isRoundEmailSubject(subject)).toBe(true)
  })

  it.each([
    'Welcome to OU Kosher',
    'OU Schedule A - Additional Information Needed (App #1715, Round 2)',
    'OU Schedule A (App #1715, Task: #28140, Round 2)',
    'Schedule A - Additional Information Needed (App #1715, Task: #28140, Round 2)',
    null,
  ])('rejects %j', (subject) => {
    expect(isRoundEmailSubject(subject)).toBe(false)
  })

  it('needs an email message type as well as the format', () => {
    expect(isRoundEmail({ MessageType: 'Email', Subject: REPORTED })).toBe(true)
    expect(isRoundEmail({ MessageType: 'Text', Subject: REPORTED })).toBe(false)
  })
})

describe.each([
  ['Contract', useContractCommunicationMessages],
  ['Schedule A', useScheduleACommunicationMessages],
  ['Schedule B', useScheduleBCommunicationMessages],
] as const)('%s Communication tab messages', (_name, useMessages) => {
  beforeEach(() => vi.mocked(fetchApplicationMessages).mockClear())

  // 28140 is the task in the subject; 99999 is another task (e.g. the drawer opened from a later task).
  it.each([28140, 99999, undefined])(
    'fetches by application only and keeps round emails whatever the task (opened from task %s)',
    async (taskInstanceId) => {
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
      const { result } = renderHook(() => useMessages({ applicationId: 1715, taskInstanceId }), { wrapper })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      const [request] = vi.mocked(fetchApplicationMessages).mock.calls[0]
      expect(request).toMatchObject({ applicationId: '1715' })
      expect(request).not.toHaveProperty('taskInstanceId')
      // 1 = the reported subject, 2 = its reply, 3 = another round email (each tab keeps its own
      // rounds by title when it builds the round cards).
      expect(result.current.data?.map((message) => message.MessageID)).toEqual([1, 2, 3])
    },
  )
})

describe('reply subjects', () => {
  it('treats RE:/FW:/Fwd: subjects as replies to the refMessageId round', async () => {
    const { getReplyParentMessageId, getSubjectRefMessageId, isReplySubject } = await import('./communicationMessages')
    expect(isReplySubject(`RE: ${REPORTED}`)).toBe(true)
    expect(isReplySubject(`Fwd: RE: ${REPORTED}`)).toBe(true)
    expect(isReplySubject(REPORTED)).toBe(false)
    expect(getSubjectRefMessageId(REPORTED)).toBe('845')
    expect(getSubjectRefMessageId('OU Schedule B - x (App #1, Task: #2, refMsgId: #77, Round 1)')).toBe('77')

    // A reply stored without a parent belongs to the round in its subject.
    expect(getReplyParentMessageId({ Subject: `RE: ${REPORTED}`, parentMessageId: null })).toBe('845')
    expect(getReplyParentMessageId({ Subject: `RE: ${REPORTED}`, parentMessageId: 0 })).toBe('845')
    // The server's parent wins when it is set; a round email has no parent.
    expect(getReplyParentMessageId({ Subject: `RE: ${REPORTED}`, parentMessageId: 900 })).toBe('900')
    expect(getReplyParentMessageId({ Subject: REPORTED, parentMessageId: null })).toBe('')
  })
})
