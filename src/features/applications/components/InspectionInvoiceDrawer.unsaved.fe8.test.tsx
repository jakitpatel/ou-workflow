import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Applicant } from '@/types/application'
import { InspectionInvoiceDrawer } from './InspectionInvoiceDrawer'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/context/UserContext', () => ({
  useUser: () => ({ email: 'david.cohen@local.test', token: 'token', username: 'david.cohen' }),
}))
vi.mock('@/features/applications/api', () => ({
  createApplicationMessage: vi.fn(),
  fetchApplicationDetail: vi.fn(async () => ({ companyContacts: [], companyAddresses: [] })),
  generateInspectionInvoice: vi.fn(),
  uploadApplicationFile: vi.fn(),
}))
vi.mock('@/features/tasks/hooks/useTaskQueries', () => ({
  useUserListByRole: () => ({ data: [], isError: false, isLoading: false }),
}))

// fe8 RECHECK-1: the invoice setup (fee, notes…) is saved only by Generate Invoice / Complete,
// so closing with typed values asks first instead of silently discarding them (as Contract does).
const applicant = {
  id: 4343,
  applicationId: 4343,
  company: 'FIX-fe8 Foods',
  plant: 'FIX-fe8 Plant',
  stages: { inspection: { tasks: [{ TaskInstanceId: 901, name: 'Invoice' }] } },
} as unknown as Applicant

const mount = (taskStatusDetails?: unknown) => {
  const onClose = vi.fn()
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <InspectionInvoiceDrawer
        open
        applicant={applicant}
        applicationId={4343}
        taskInstanceId={901}
        taskName="Invoice"
        taskStatusDetails={taskStatusDetails}
        onClose={onClose}
      />
    </QueryClientProvider>,
  )
  return onClose
}
const closeX = () => fireEvent.click(screen.getByRole('button', { name: 'Close inspection invoice drawer' }))
const feeInput = () => screen.getByPlaceholderText('Enter fee amount') as HTMLInputElement

describe('InspectionInvoiceDrawer unsaved setup (RECHECK-1)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('closes without asking when nothing was typed', () => {
    const confirm = vi.spyOn(window, 'confirm')
    const onClose = mount()
    closeX()
    expect(confirm).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('asks before discarding a typed fee and note (X and Escape); Cancel keeps them', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const onClose = mount()
    fireEvent.change(feeInput(), { target: { value: '88' } })
    fireEvent.change(screen.getByPlaceholderText('Visible only to NCRC / admin. Not included in invoice PDF.'), {
      target: { value: 'FIX-fe8 "quoted" note' },
    })

    closeX()
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
    expect(feeInput().value).toBe('88')

    fireEvent.keyDown(feeInput(), { key: 'Escape' })
    expect(confirm).toHaveBeenCalledTimes(2)
    expect(onClose).not.toHaveBeenCalled()

    confirm.mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(confirm).toHaveBeenCalledTimes(3)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('values restored from the saved task state are not "unsaved"; changing them is', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const onClose = mount({
      savedState: { version: 1, stage: 'setup', setup: { feeAmount: '88', internalNotes: 'kept' } },
    })
    expect(feeInput().value).toBe('88')
    closeX()
    expect(confirm).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.change(feeInput(), { target: { value: '89' } })
    closeX()
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)

    // Typing the saved value back is not a change.
    fireEvent.change(feeInput(), { target: { value: '88' } })
    closeX()
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(2)
  })
  it('preserves preview edits on Escape and prompts before discarding an email-only draft', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const onClose = mount({ savedState: { version: 1, stage: 'generated', generate: { invoiceId: 'HUNT-C-02' } } })
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Review Email' })) })
    fireEvent.change(screen.getByLabelText('To'), { target: { value: 'edited@example.invalid' } })
    fireEvent.change(screen.getByLabelText('Body'), { target: { value: 'My carefully edited draft' } })
    fireEvent.keyDown(screen.getByLabelText('Body'), { key: 'Escape' })
    expect(confirm).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('Body')).toBeNull()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Review Email' })) })
    expect((screen.getByLabelText('Body') as HTMLTextAreaElement).value).toBe('My carefully edited draft')
    expect((screen.getByLabelText('To') as HTMLInputElement).value).toBe('edited@example.invalid')
    fireEvent.click(screen.getByRole('button', { name: 'Close email preview' }))
    closeX()
    expect(confirm).toHaveBeenCalledOnce()
    expect(onClose).not.toHaveBeenCalled()
    confirm.mockReturnValue(true)
    closeX()
    expect(onClose).toHaveBeenCalledOnce()
  })

})
