import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MyMessageApplicationActions } from './MyMessageApplicationActions'

const { navigate, fetchDetails } = vi.hoisted(() => ({ navigate: vi.fn(), fetchDetails: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))
vi.mock('@/context/UserContext', () => ({ useUser: () => ({ token: 'token' }) }))
vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: { queryFn: () => unknown }) => {
    options.queryFn()
    return { data: {}, isLoading: false, error: null }
  },
}))
vi.mock('@/features/prelim/api', () => ({ fetchPrelimApplicationDetails: fetchDetails }))
vi.mock('@/features/applications/components/ApplicationDetailsDrawer', () => ({
  ApplicationDetailsDrawer: ({ applicationId }: { applicationId: number }) => (
    <div>Workflow details {applicationId}</div>
  ),
}))
vi.mock('@/features/prelim/components/PrelimApplicationDetailsDrawer', () => ({
  PrelimApplicationDetailsDrawer: ({ externalReferenceId }: { externalReferenceId: number }) => (
    <div>Intake details {externalReferenceId}</div>
  ),
}))

describe('My Messages application actions', () => {
  beforeEach(() => vi.clearAllMocks())
  it.each([undefined, 'WORKFLOW', 'SUBMISSION'])(
    'opens the matching drawer and filtered dashboard for %s',
    async (applicationType) => {
      const onNavigate = vi.fn()
      render(
        <MyMessageApplicationActions
          applicationId={1261}
          applicationType={applicationType}
          onNavigate={onNavigate}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: 'AppId: 1261' }))
      const submission = applicationType === 'SUBMISSION'
      expect(
        await screen.findByText(`${submission ? 'Intake' : 'Workflow'} details 1261`),
      ).toBeTruthy()
      if (submission) expect(fetchDetails).toHaveBeenCalledWith(1261, 'token')
      else expect(fetchDetails).not.toHaveBeenCalled()
      fireEvent.click(screen.getByRole('button', { name: 'ViewApp:1261' }))
      expect(onNavigate).toHaveBeenCalledOnce()
      expect(navigate).toHaveBeenCalledWith({
        to: submission ? '/ou-workflow/prelim-dashboard' : '/ou-workflow/ncrc-dashboard',
        search: {
          q: '',
          status: 'all',
          page: 0,
          applicationId: 1261,
          ...(submission ? {} : { priority: 'all', myOnly: true }),
        },
      })
    },
  )
})
