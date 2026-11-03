import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Applicant, ApplicationDetail } from '@/types/application'
import { ContractStageDrawer } from './ContractStageDrawer'

const mocks = vi.hoisted(() => ({
  detail: undefined as ApplicationDetail | undefined,
  rcDirectory: [] as Array<Record<string, string>>,
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
    data: [],
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
