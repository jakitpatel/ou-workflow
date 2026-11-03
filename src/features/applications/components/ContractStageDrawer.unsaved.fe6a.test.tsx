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

// fe6a NEW-12: the setup form (fee, comment, dates) is saved only by an action, so closing the
// drawer with typed values asks first instead of silently discarding them.
const applicant = (statusDetails?: string) =>
  ({
    id: 4242,
    applicationId: 4242,
    company: 'FIX-fe6a Foods',
    plant: 'FIX-fe6a Plant',
    status: 'CONTRACT',
    assignedRC: 'rachel.levy',
    assignedRoles: [{ NCRC: 'david.cohen', isPrimary: true }],
    stages: { contract: { tasks: [{ TaskInstanceId: 900, name: 'Prepare Contract', StatusDetails: statusDetails }] } },
  }) as unknown as Applicant

const mount = (statusDetails?: string) => {
  const onClose = vi.fn()
  render(
    <ContractStageDrawer
      open
      applicant={applicant(statusDetails)}
      applicationId={4242}
      taskInstanceId={900}
      taskName="Prepare Contract"
      onClose={onClose}
    />,
  )
  return onClose
}
const close = () => fireEvent.click(screen.getByRole('button', { name: 'Close contract stage drawer' }))

describe('ContractStageDrawer unsaved setup (NEW-12)', () => {
  beforeEach(() => {
    mocks.detail = undefined
    mocks.rcDirectory = []
    vi.restoreAllMocks()
  })

  it('closes without asking when nothing was typed', () => {
    const confirm = vi.spyOn(window, 'confirm')
    const onClose = mount()
    close()
    expect(confirm).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('asks before discarding a typed fee and comment; staying keeps them', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const onClose = mount()
    fireEvent.change(screen.getByPlaceholderText('Enter annual certification fee'), { target: { value: '88' } })
    fireEvent.change(screen.getByPlaceholderText('Comment for the certification invoice...'), {
      target: { value: 'FIX-fe6a "quoted" comment' },
    })
    close()
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
    expect((screen.getByPlaceholderText('Enter annual certification fee') as HTMLInputElement).value).toBe('88')

    confirm.mockReturnValue(true)
    close()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('values restored from the saved task state are not "unsaved"', () => {
    const confirm = vi.spyOn(window, 'confirm')
    const onClose = mount(
      JSON.stringify({ savedState: { version: 1, stage: 'setup', setup: { annualFee: '88', certificationInvoiceComment: 'kept' } } }),
    )
    expect((screen.getByPlaceholderText('Enter annual certification fee') as HTMLInputElement).value).toBe('88')
    close()
    expect(confirm).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
