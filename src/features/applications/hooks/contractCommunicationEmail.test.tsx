import type { ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expect, it, vi } from 'vitest'
import { createApplicationMessage, updateApplicationMessage } from '@/features/applications/api'
import { useSendContractCommunicationEmail } from './useContractRcNotification'
import { assertEmailAttachmentSize } from '@/shared/email/attachmentSizeValidation'

vi.mock('@/context/UserContext', () => ({
  useUser: () => ({ token: 'token', username: 'sender' }),
}))
vi.mock('@/features/applications/api', () => ({
  createApplicationMessage: vi.fn(),
  updateApplicationMessage: vi.fn(),
}))
vi.mock('@/shared/email/attachmentSizeValidation', () => ({ assertEmailAttachmentSize: vi.fn() }))

it.each([
  'Package.pdf<s3://newcompany-documents/contracts/1441/contract_package.pdf>',
  'Invoice.pdf<s3://newcompany-documents/contracts/1441/Contract_Invoice_612522.pdf>',
  'Package.pdf<s3://newcompany-documents/contracts/1441/contract_package.pdf>, Invoice.pdf<s3://newcompany-documents/contracts/1441/Contract_Invoice_612522.pdf>',
])('stages Communication email with server attachments: %s', async (attachments) => {
  vi.mocked(createApplicationMessage).mockResolvedValue({ data: { id: '42' } })
  vi.mocked(updateApplicationMessage).mockResolvedValue({})
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useSendContractCommunicationEmail(), { wrapper })
  await act(async () => {
    await result.current.mutateAsync({
      applicationId: 1441,
      taskInstanceId: 20,
      attachments,
      body: 'Contract attached\n\nCertification package:\n/file/1308',
      companyName: 'Company',
      subject: 'Contract',
      toUser: 'recipient@example.com',
    })
  })
  expect(assertEmailAttachmentSize).toHaveBeenCalledWith(undefined)
  expect(createApplicationMessage).toHaveBeenCalledWith(
    expect.objectContaining({
      payload: expect.objectContaining({
        MessageType: 'Email-Staging',
        Attachments: attachments,
        MessageTextPlain: 'Contract attached',
      }),
    }),
  )
  expect(updateApplicationMessage).toHaveBeenCalledWith(
    expect.objectContaining({
      messageId: '42',
      payload: expect.objectContaining({ MessageType: 'Email' }),
    }),
  )
  client.clear()
})
