import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import type { Applicant, Task } from '@/types/application'
import { InspectionAssignmentDrawer } from './InspectionAssignmentDrawer'

const mocks = vi.hoisted(() => ({
  assign: vi.fn().mockResolvedValue({ visitId: '789' }),
  message: vi.fn().mockResolvedValue({}),
  display: vi.fn().mockResolvedValue({}),
  result: vi.fn(),
  rfrs: [{ id: 'rfr1', userName: 'rfr1', name: 'Test RFR', email: 'rfr@example.com' }],
}))
vi.mock('@/context/UserContext', () => ({ useUser: () => ({ email: 'sender@example.com', username: 'sender', token: 'token' }) }))
vi.mock('@/features/applications/hooks/useApplicationDetail', () => ({
  useApplicationDetail: () => ({
    data: {
      plantAddresses: [{ street: '101 Plant Street', type: 'Physical' }],
      plantContacts: {
        primaryContact: [{ name: 'Plant Contact', role: 'Plant Manager', email: 'plant@example.com', phone: '555-0100' }],
      },
      companyContacts: {
        primaryContact: [{ name: 'Company Contact', email: 'company@example.com' }],
      },
    },
  }),
}))
vi.mock('@/features/tasks/hooks/useTaskQueries', () => ({ useUserListByRole: () => ({ data: mocks.rfrs }) }))
vi.mock('@/features/tasks/hooks/useTaskMutations', () => ({ useAssignTaskMutation: () => ({ mutateAsync: mocks.assign }) }))
vi.mock('@/features/applications/api', () => ({ createApplicationMessage: mocks.message }))
vi.mock('@/features/tasks/api', () => ({ patchTaskGuiDisplayResult: mocks.display, patchTaskResult: mocks.result }))
vi.mock('@/features/applications/cache/applicationListCache', () => ({ refreshApplicationInListCaches: vi.fn().mockResolvedValue(true) }))

it('creates and notifies without a Visit Date task or status-details save', async () => {
  const task = { TaskInstanceId: 123, name: 'Assign RFR' } as Task
  const applicant = { applicationId: 1, company: 'Test company', stages: {} } as Applicant
  render(
    <QueryClientProvider client={new QueryClient()}>
      <InspectionAssignmentDrawer open applicant={applicant} task={task} onClose={vi.fn()} />
    </QueryClientProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: /Test RFR/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Create Assignment & Notify' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Resend Notification' })).toBeTruthy())
  expect(mocks.assign).toHaveBeenCalledWith(expect.objectContaining({ taskId: '123', assignee: 'rfr1' }))
  expect(mocks.message).toHaveBeenCalledWith(expect.objectContaining({ payload: expect.objectContaining({ TaskInstanceId: '123', ToUser: 'rfr@example.com' }) }))
  expect(mocks.message).toHaveBeenCalledWith(expect.objectContaining({
    payload: expect.objectContaining({
      MessageTextPlain: expect.stringContaining(
        'Address: 101 Plant Street\nPrimary Contact: Plant Contact\nRole: Plant Manager\nEmail: plant@example.com\nPhone: 555-0100\n\nCompany: Test company\nPrimary Contact: Company Contact\nEmail: company@example.com',
      ),
    }),
  }))
  expect(mocks.display).toHaveBeenCalledWith(expect.objectContaining({ taskId: '123', result: expect.stringContaining('Visit #789') }))
  expect(mocks.result).not.toHaveBeenCalled()
})
