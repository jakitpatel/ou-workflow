import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { confirmTask, patchTaskResult } from '@/features/tasks/api'
import {
  buildInvoiceGuiDisplayResult,
  useInspectionInvoiceDrawerState,
} from '@/features/applications/hooks/useInspectionInvoiceDrawerState'

vi.mock('@/context/UserContext', () => ({ useUser: () => ({ token: 'token', email: 'rc@example.invalid' }) }))
vi.mock('@/features/applications/api', () => ({
  createApplicationMessage: vi.fn(),
  fetchApplicationDetail: vi.fn(async () => ({ companyContacts: [], companyAddresses: [] })),
  generateInspectionInvoice: vi.fn(),
  uploadApplicationFile: vi.fn(),
}))
vi.mock('@/features/tasks/api', () => ({
  confirmTask: vi.fn(async () => ({})),
  patchTaskGuiDisplayResult: vi.fn(async () => ({})),
  patchTaskResult: vi.fn(async () => ({})),
}))
vi.mock('@/features/applications/cache/applicationListCache', () => ({
  refreshApplicationInListCaches: vi.fn(async () => true),
}))
vi.mock('@/features/tasks/hooks/useTaskQueries', () => ({
  useUserListByRole: () => ({ data: [], isError: false, isLoading: false }),
}))

const renderInvoice = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return renderHook(
    () => useInspectionInvoiceDrawerState({ applicationId: 1715, taskInstanceId: 28200, taskName: 'Invoice' }),
    { wrapper },
  )
}

const completeTaskResult = () => (vi.mocked(confirmTask).mock.lastCall?.[0] as { result?: string }).result

describe('Inspection Invoice Mark Paid completeTask result', () => {
  beforeEach(() => vi.mocked(confirmTask).mockClear())

  it('sends "Mark Paid & Inspection not needed" when no inspection is needed', async () => {
    const { result } = renderInvoice()
    act(() => result.current.setInspection(false))
    await act(async () => { await result.current.markPaid() })

    expect(confirmTask).toHaveBeenCalledOnce()
    expect(vi.mocked(confirmTask).mock.lastCall?.[0]).toMatchObject({
      taskId: '28200',
      result: 'Mark Paid & Inspection not needed',
    })
  })

  it('still sends "Mark Paid" when an inspection is needed', async () => {
    const { result } = renderInvoice()
    act(() => result.current.setInspection(true))
    await act(async () => { await result.current.markPaid() })
    expect(completeTaskResult()).toBe('Mark Paid')
  })
})

describe('Inspection Invoice GUIDisplayResult', () => {
  beforeEach(() => vi.mocked(patchTaskResult).mockClear())

  it('adds Inspection and Fee Y/N after the invoice id', () => {
    const base = { invoiceDate: '2026-11-08', invoiceId: '612585', rfr: null, subtotal: 20000 }
    expect(buildInvoiceGuiDisplayResult({ ...base, inspectionNeeded: true, feeRequired: true }))
      .toBe('{RFR:-, $20,000, NOV 8, 612585, Inspection:Y, Fee:Y}')
    expect(buildInvoiceGuiDisplayResult({ ...base, inspectionNeeded: false, feeRequired: true, paid: true }))
      .toBe('{RFR:-, $20,000, NOV 8, 612585, Inspection:N, Fee:Y, Paid}')
    expect(buildInvoiceGuiDisplayResult({ ...base, inspectionNeeded: null, feeRequired: false }))
      .toBe('{RFR:-, $20,000, NOV 8, 612585, Inspection:-, Fee:N}')
  })

  it('writes the user selection to the task when the invoice is marked paid', async () => {
    const { result } = renderInvoice()
    act(() => result.current.setInspection(false))
    await act(async () => { await result.current.markPaid() })
    const saved = vi.mocked(patchTaskResult).mock.lastCall?.[0] as { guiDisplayResult?: string }
    expect(saved.guiDisplayResult).toMatch(/, Inspection:N, Fee:Y, Paid\}$/)
  })
})
