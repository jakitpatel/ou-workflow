import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { InspectionInvoiceDrawer } from './InspectionInvoiceDrawer'

// Once an invoice is generated its details (template, fee, expenses, date, notes) cannot be
// changed from the Inspection Invoice task drawer: there is no Edit / unlock any more.
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

const saved = (stage: string, invoiceId?: string) => ({
  savedState: {
    stage,
    setup: { inspectionNeeded: 'YES', feeNeeded: 'YES', fee: '250' },
    generate: invoiceId ? { invoiceId } : {},
  },
})

const mount = (taskStatusDetails: unknown) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <InspectionInvoiceDrawer
        open
        applicationId={1659}
        applicationName="I.P.A. srl"
        taskInstanceId={901}
        taskName="Inspection Invoice"
        taskStatusDetails={taskStatusDetails}
        onClose={vi.fn()}
      />
    </QueryClientProvider>,
  )

const detailFields = () => [
  screen.getByPlaceholderText('Enter fee amount'),
  screen.getByPlaceholderText('Optional'),
  screen.getByPlaceholderText('Visible only to NCRC / admin. Not included in invoice PDF.'),
] as HTMLInputElement[]

describe('Inspection Invoice details after generation', () => {
  it('before generating, the invoice details can be edited', async () => {
    mount(saved('configured'))
    await waitFor(() => detailFields().forEach((field) => expect(field.disabled).toBe(false)))
  })

  it.each(['generated', 'outlook-opened', 'sent-captured', 'paid'])(
    'once the invoice is %s, the details are locked and there is no Edit button',
    async (stage) => {
      mount(saved(stage, 'INV-1659'))
      await waitFor(() => detailFields().forEach((field) => expect(field.disabled).toBe(true)))
      expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull()
      expect(screen.getByText('Invoice generated. Invoice details can no longer be changed.')).toBeTruthy()
    },
  )
})
