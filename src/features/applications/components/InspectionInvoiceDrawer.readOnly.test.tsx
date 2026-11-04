import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createApplicationMessage } from '@/features/applications/api'
import { InspectionInvoiceDrawer } from './InspectionInvoiceDrawer'

// View Application > Inspection Invoice is read-only: an invoice that was already emailed can be
// seen, but its email cannot be sent again from there.
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/context/UserContext', () => ({
  useUser: () => ({ email: 'ncrc@local.test', token: 'token', username: 'ncrc' }),
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

const emailedInvoice = {
  savedState: {
    stage: 'outlook-opened',
    setup: { inspectionNeeded: 'YES', feeNeeded: 'YES', fee: '250' },
    generate: { invoiceId: 'INV-1659' },
    email: { sent: true, sentAt: '2026-11-03T18:00:00Z' },
  },
}

const mount = (readOnly: boolean) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <InspectionInvoiceDrawer
        open
        mode="embedded"
        readOnly={readOnly}
        applicationId={1659}
        applicationName="I.P.A. srl"
        taskInstanceId={901}
        taskName="Inspection Invoice"
        taskStatusDetails={emailedInvoice}
        onClose={vi.fn()}
      />
    </QueryClientProvider>,
  )

describe('InspectionInvoiceDrawer read-only (View Application)', () => {
  it('editable drawer: an emailed invoice offers "Send Email Again"', async () => {
    mount(false)
    expect(await screen.findByRole('button', { name: /Send Email Again/ })).toBeTruthy()
  })

  it('read-only: no "Send Email Again", no email preview, and nothing is sent', async () => {
    mount(true)
    await waitFor(() => expect(screen.getAllByText(/INV-1659/).length).toBeGreaterThan(0))
    expect(screen.queryByRole('button', { name: /Send Email Again/ })).toBeNull()
    expect(screen.queryByText('Review Email')).toBeNull()
    expect(screen.queryByRole('button', { name: /^Send/ })).toBeNull()
    expect(createApplicationMessage).not.toHaveBeenCalled()
  })
})
