import { render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
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


afterEach(() => vi.useRealTimers())
it('defaults to the first local calendar day and previews the correct term', () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 27, 12))
  render(<ContractStageDrawer open applicant={app16} applicationId={16} onClose={vi.fn()} />)
  const date = document.querySelector('input[type="date"]') as HTMLInputElement
  expect(date.value).toBe('2026-10-01')
  expect(screen.queryByText(/September 30, 2026/)).toBeNull()
})
