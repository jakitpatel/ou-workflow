import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { confirmTask, patchTaskResult } from '@/features/tasks/api'
import type { Applicant } from '@/types/application'
import { useInspectionInvoiceDrawerState } from '@/features/applications/hooks/useInspectionInvoiceDrawerState'

vi.mock('@/context/UserContext', () => ({ useUser: () => ({ token: 'token', email: 'rc@example.invalid' }) }))
vi.mock('@/features/applications/api', () => ({
  createApplicationMessage: vi.fn(),
  fetchApplicationDetail: vi.fn(async () => ({ companyContacts: [], companyAddresses: [] })),
  generateInspectionInvoice: vi.fn(async () => ({ invoiceId: '612585' })),
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

const ASSIGNMENT_TASK_ID = '28199'
const applicant = {
  applicationId: 1715,
  stages: {
    inspection: {
      tasks: [{ name: 'Assignment', taskCategory: 'ASSIGNMENT1', taskType: 'ACTION', TaskInstanceId: ASSIGNMENT_TASK_ID }],
    },
  },
} as unknown as Applicant
const rfr = { id: '7', lookupKey: 'rfr-7', name: 'Rabbi Field', userName: 'rfield', email: 'rfield@example.invalid' }

const renderInvoice = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return renderHook(
    () => useInspectionInvoiceDrawerState({ applicationId: 1715, taskInstanceId: 28200, taskName: 'Invoice', applicant }),
    { wrapper },
  )
}

const assignmentCalls = (mock: typeof confirmTask | typeof patchTaskResult) =>
  vi.mocked(mock).mock.calls.filter(([request]) => (request as { taskId?: string }).taskId === ASSIGNMENT_TASK_ID)

describe('Generate Invoice and the Inspection Assignment task', () => {
  beforeEach(() => {
    vi.mocked(confirmTask).mockClear()
    vi.mocked(patchTaskResult).mockClear()
  })

  it('does not touch the assignment task when no inspection is needed (fee-only invoice)', async () => {
    const { result } = renderInvoice()
    act(() => {
      result.current.setInspection(false)
      result.current.setNoInspectionReason('Plant already inspected this year')
      result.current.setFeeRequiredValue(true)
    })
    act(() => result.current.setFeeAmount('20000'))
    await act(async () => { await result.current.generateInvoice() })

    expect(assignmentCalls(confirmTask)).toHaveLength(0)
    expect(assignmentCalls(patchTaskResult)).toHaveLength(0)
  })

  it("completes the assignment task for inspection + fee + don't wait for payment", async () => {
    const { result } = renderInvoice()
    act(() => {
      result.current.setInspection(true)
      result.current.setFeeRequiredValue(true)
    })
    await act(async () => { await result.current.pickRfr(rfr as never) })
    act(() => {
      result.current.setFeeAmount('20000')
      result.current.setAwaitPayment(false)
    })
    await act(async () => { await result.current.generateInvoice() })

    expect(assignmentCalls(patchTaskResult)).toHaveLength(1)
    const [completion] = assignmentCalls(confirmTask)
    expect(completion?.[0]).toMatchObject({ taskId: ASSIGNMENT_TASK_ID, override: '1', status: 'PENDING' })
  })

  it('records the RFR but waits for payment when "wait for payment" is on', async () => {
    const { result } = renderInvoice()
    act(() => {
      result.current.setInspection(true)
      result.current.setFeeRequiredValue(true)
    })
    await act(async () => { await result.current.pickRfr(rfr as never) })
    act(() => {
      result.current.setFeeAmount('20000')
      result.current.setAwaitPayment(true)
    })
    await act(async () => { await result.current.generateInvoice() })

    expect(assignmentCalls(patchTaskResult)).toHaveLength(1)
    expect(assignmentCalls(confirmTask)).toHaveLength(0)
  })
})
