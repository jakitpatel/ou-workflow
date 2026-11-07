import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Applicant, ApplicationDetail } from '@/types/application'
import { ContractStageDrawer } from './ContractStageDrawer'

const mocks = vi.hoisted(() => ({
  detail: undefined as ApplicationDetail | undefined,
  rcDirectory: [] as Array<Record<string, string>>,
  messages: [] as Array<Record<string, unknown>>,
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/context/UserContext', () => ({
  useUser: () => ({ email: 'local.admin@local.test', token: 'token', username: 'local.admin' }),
}))
vi.mock('@/features/applications/hooks/useApplicationDetail', () => ({
  useApplicationDetail: () => ({ data: mocks.detail }),
}))
vi.mock('@/features/applications/hooks/useContractSchedules', () => ({
  useContractSchedules: () => ({
    contractIngredients: [],
    contractProducts: [],
    ingredientsQuery: { isSuccess: true },
    productsQuery: { isSuccess: true },
  }),
}))
vi.mock('@/features/applications/hooks/useContractRcNotification', () => ({
  useContractRcNotification: () => ({
    generateContractPackage: vi.fn(),
    generateContractInvoice: vi.fn(),
    isGeneratingContractPackage: false,
    isGeneratingContractInvoice: false,
    isUploadingContractAttachment: false,
    saveContractStageState: vi.fn(),
    uploadContractEmailAttachment: vi.fn(),
  }),
  useSendContractCommunicationEmail: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useContractCommunicationMessages: () => ({
    data: mocks.messages,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}))
vi.mock('@/features/tasks/hooks/useTaskMutations', () => ({
  useConfirmTaskMutation: () => ({ isPending: false, mutateAsync: vi.fn(), mutate: vi.fn() }),
}))
vi.mock('@/features/tasks/hooks/useTaskQueries', () => ({
  useUserListByRole: () => ({ data: mocks.rcDirectory }),
}))

// Mirrors get_applications_v1 for app 16 (audit api-samples/applications_v1.json).
const app16 = {
  id: 16,
  applicationId: 16,
  company: 'Sample Pacific Noodle Works',
  plant: 'Main Plant',
  status: 'CONTRACT',
  assignedRC: '',
  companyRC: 'rachel.levy',
  RCDetails: '[{"userid":4,"First":"Rachel","Last":"Levy","email":"rachel.levy"}]',
  assignedRoles: [
    { DISPATCH: 'sarah.gold', isPrimary: true },
    { NCRC: 'rachel.levy', isPrimary: true },
  ],
  stages: {},
} as unknown as Applicant

const renderDrawer = (applicant: Applicant) => {
  const view = render(
    <ContractStageDrawer
      open
      applicant={applicant}
      applicationId={applicant.applicationId}
      assignedRoles={applicant.assignedRoles}
      taskName="Contract"
      onClose={vi.fn()}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Cover' }))
  return view
}

describe('ContractStageDrawer coordinators (F3)', () => {
  beforeEach(() => {
    mocks.detail = undefined
    mocks.messages = []
    mocks.rcDirectory = [
      { name: 'Local Admin', assigneeValue: 'local.admin', email: 'local.admin@local.test' },
      { name: 'Rachel Levy', assigneeValue: 'rachel.levy', email: 'rachel.levy@local.test' },
    ]
  })

  it('shows the application RC and NCRC, not the signed-in user', () => {
    renderDrawer(app16)
    expect(screen.getByText('RC: rachel.levy')).toBeTruthy()
    expect(screen.getByText('NCRC: rachel.levy')).toBeTruthy()
    expect(screen.queryByText(/local\.admin/)).toBeNull()
    expect(screen.getByRole('button', { name: /Generate Contract Package/ })).toHaveProperty(
      'disabled',
      false,
    )
    // The invoice carries the RC contact line from the RC record.
    fireEvent.click(screen.getByRole('button', { name: 'Invoice' }))
    expect(document.body.textContent).toMatch(/rachel\.levy\s+\(212\) 563-4000\s+rachel\.levy@local\.test/)
  })

  it('flags a missing RC/NCRC and blocks generating the package', () => {
    renderDrawer({
      ...app16,
      companyRC: '',
      RCDetails: null,
      assignedRoles: [{ DISPATCH: 'sarah.gold', isPrimary: true }],
    } as unknown as Applicant)
    expect(screen.getByText('RC: Not assigned')).toBeTruthy()
    expect(screen.getByText('NCRC: Not assigned')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toContain('No RC is assigned')
    expect(screen.getByRole('button', { name: /Generate Contract Package/ })).toHaveProperty(
      'disabled',
      true,
    )
    expect(screen.queryByText(/local\.admin/)).toBeNull()
  })
})

describe('ContractStageDrawer Communication attachments', () => {
  it('starts each round collapsed (To/Subject only) and expands to the message, attachments and (collapsed) reply', () => {
    mocks.messages = [
      { MessageID: 500, MessageType: 'Email', parentMessageId: 0, Subject: 'OU Kosher Contract Package - Round 1',
        ToUser: 'company@example.test', SentDate: '2026-11-01', MessageTextPlain: 'Please sign.',
        Attachments: 'Contract.pdf<https://files.example.test/contract.pdf>' },
      { MessageID: 501, MessageType: 'Email', parentMessageId: 500, Subject: 'RE: OU Kosher Contract Package - Round 1',
        FromUser: 'company@example.test', SentDate: '2026-11-03', MessageTextPlain: 'Signed copy attached.',
        Attachments: '"Signed Contract.pdf<s3://oucert-email-attachments-dev/2026/11/03/x/Signed Contract.pdf>"' },
    ]
    renderDrawer(app16)
    fireEvent.click(screen.getByRole('button', { name: 'Communication' }))

    // Collapsed by default: only the round header, To and Subject show.
    const roundToggle = screen.getByRole('button', { name: /Round 1/ })
    expect(roundToggle.getAttribute('aria-expanded')).toBe('false')
    expect(screen.getByText('company@example.test')).toBeTruthy()
    expect(screen.getByText('OU Kosher Contract Package - Round 1')).toBeTruthy()
    expect(screen.queryByText('Please sign.')).toBeNull()
    expect(screen.queryByText('Signed copy attached.')).toBeNull()
    expect(screen.queryAllByRole('group', { name: 'Attachments' })).toHaveLength(0)

    fireEvent.click(roundToggle)
    expect(roundToggle.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText('Please sign.')).toBeTruthy()

    // The reply is collapsed too: its header, To and Subject show, its text and files don't.
    const replyToggle = screen.getByRole('button', { name: /Reply.*From company@example\.test/ })
    expect(replyToggle.getAttribute('aria-expanded')).toBe('false')
    expect(screen.getByText('RE: OU Kosher Contract Package - Round 1')).toBeTruthy()
    expect(screen.queryByText('Signed copy attached.')).toBeNull()
    expect(screen.getAllByRole('group', { name: 'Attachments' })).toHaveLength(1)

    fireEvent.click(replyToggle)
    expect(replyToggle.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText('Signed copy attached.')).toBeTruthy()

    const groups = screen.getAllByRole('group', { name: 'Attachments' })
    expect(groups).toHaveLength(2)
    expect(groups[0].querySelector('a')?.getAttribute('href')).toBe('https://files.example.test/contract.pdf')
    expect(groups[0].textContent).toContain('Contract.pdf')
    expect(groups[1].textContent).toContain('Signed Contract.pdf')
    expect(groups[1].querySelector('a')).toBeNull()
    // The company's response is labelled "Reply", in red.
    expect(screen.getByText('Reply').className).toContain('text-red-700')
    // A round the company answered is labelled "Request/Reply".
    expect(screen.getByText('Request/Reply')).toBeTruthy()
    expect(screen.queryByText('Responded')).toBeNull()
  })
})

describe('ContractStageDrawer contract type (company.is_new)', () => {
  beforeEach(() => {
    mocks.messages = []
  })

  const contractType = () => screen.getByTestId('contract-type').textContent?.trim()

  it.each([
    ['Y', 'New Company Certification'],
    ['N', 'Plant Addendum Certification'],
    [undefined, 'Plant Addendum Certification'],
  ])('shows only the contract type for company.is_new = %s', (isNew, label) => {
    mocks.detail = { company: [{ companyName: 'Sample', ...(isNew ? { is_new: isNew } : {}) }] } as unknown as ApplicationDetail
    renderDrawer(app16)
    expect(contractType()).toBe(label)
    expect(screen.queryByText('Determined by the system')).toBeNull()
    expect(screen.queryByText('Set')).toBeNull()
  })

  it('shows the payment cycle only for a plant addendum', () => {
    mocks.detail = { company: [{ is_new: 'Y' }] } as unknown as ApplicationDetail
    const view = renderDrawer(app16)
    expect(screen.queryByText('Company payment cycle')).toBeNull()
    view.unmount()

    mocks.detail = { company: [{ is_new: 'N' }] } as unknown as ApplicationDetail
    renderDrawer(app16)
    expect(screen.getByText('Company payment cycle')).toBeTruthy()
  })

  it('says it is loading until the application detail arrives', () => {
    mocks.detail = undefined
    renderDrawer(app16)
    expect(contractType()).toBe('Loading contract type...')
  })
})

describe('ContractStageDrawer Communication reply without a parent', () => {
  it('lists an RE: reply under its round (by refMessageId), not as another round', () => {
    const root = 'OU Kosher - Contract Package for Acme (App #16, Task: #28141, refMessageId: #845, Round 2)'
    mocks.messages = [
      { MessageID: 845, MessageType: 'Email', parentMessageId: null, Subject: root, ToUser: 'company@example.test', SentDate: '2026-11-01', MessageTextPlain: 'Please sign.' },
      { MessageID: 846, MessageType: 'Email', parentMessageId: null, Subject: `RE: ${root}`, FromUser: 'company@example.test', SentDate: '2026-11-03', MessageTextPlain: 'Signed.' },
    ]
    renderDrawer(app16)
    fireEvent.click(screen.getByRole('button', { name: 'Communication' }))

    // One Round 2 card (not a second one for the reply), marked answered.
    const rounds = screen.getAllByRole('button', { name: /^Round 2/ })
    expect(rounds).toHaveLength(1)
    expect(rounds[0].textContent).toContain('Request/Reply')
    fireEvent.click(rounds[0])
    expect(screen.getByRole('button', { name: /Reply.*From company@example\.test/ })).toBeTruthy()
    expect(screen.getByText(`RE: ${root}`)).toBeTruthy()
  })
})
