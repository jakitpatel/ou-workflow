import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Applicant } from '@/types/application'
import { PrelimApplicationCard } from './PrelimApplicationCard'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fetchWithAuth } from '@/shared/api/httpClient'

vi.mock('@/shared/api/httpClient', () => ({ fetchWithAuth: vi.fn() }))

const user = vi.hoisted(() => ({
  username: 'assistant.user', role: 'NCRC', roles: [] as { name: string }[], token: 'test-token',
  delegated: [{ name: 'S.Benjamin' }],
}))
vi.mock('@/context/UserContext', () => ({ useUser: () => user }))
vi.mock('@/features/tasks/hooks/useTaskQueries', () => ({ useFetchTaskRoles: () => ({ data: [] }) }))
vi.mock('./PrelimResolvedSection', () => ({ PrelimResolvedSection: () => null }))
vi.mock('./PrelimApplicationMessages', () => ({ PrelimApplicationMessages: () => null }))
vi.mock('./PrelimStageTasksPanel', () => ({ PrelimStageTasksPanel: () => null }))

function setup(status = 'PENDING', name = 'Cancel Submission', applicationStatus = 'NEW') {
  const task = { TaskInstanceId: 123, name, status, taskCategory: 'APPROVAL',
    taskRoles: [{ taskRole: 'NCRC' }], taskType: 'CONDITION' }
  const company = { applicationId: 421, company: 'Example', status: applicationStatus,
    assignedRoles: [{ NCRC: 's.benjamin' }],
    stages: { GlobalSubmission: { tasks: [task] } },
  } as unknown as Applicant
  const handleCancelTask = vi.fn()
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  render(<QueryClientProvider client={queryClient}><PrelimApplicationCard company={company} expanded={false} setExpanded={vi.fn()}
    onViewApplication={vi.fn()} handleCancelTask={handleCancelTask} /></QueryClientProvider>)
  return { company, handleCancelTask, invalidate }
}

describe('assistant cancellation permission', () => {
  beforeEach(() => {
    user.role = 'NCRC'
    user.roles = []
    vi.mocked(fetchWithAuth).mockReset().mockResolvedValue({})
    user.delegated = [{ name: 'S.Benjamin' }]
  })

  it('allows the assistant to cancel with ASSISTANT capacity', async () => {
    const { company, handleCancelTask } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Submission' }))
    expect((screen.getByRole('button', { name: 'Yes, Withdraw' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Withdrawal Reason'), { target: { value: 'Requested cancellation' } })
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Withdraw' }))
    await waitFor(() => expect(handleCancelTask).toHaveBeenCalledWith(company,
      expect.objectContaining({ TaskInstanceId: 123, capacity: 'ASSISTANT' }), 'Requested cancellation'))
    expect(fetchWithAuth).not.toHaveBeenCalled()
  })

  it.each(['unrelated delegate', 'wrong role', 'completed task'])('disables cancellation for %s', (scenario) => {
    if (scenario === 'unrelated delegate') user.delegated = [{ name: 'someone.else' }]
    if (scenario === 'wrong role') user.role = 'PROD'
    setup(scenario === 'completed task' ? 'COMPLETED' : 'PENDING')
    const button = screen.getByRole('button', { name: /cannot be canceled/ }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it('patches Mark Legacy without a stage task and refreshes lists and details', async () => {
    user.role = 'MIS'
    const { handleCancelTask, invalidate } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Mark Legacy' }))
    expect(screen.getByRole('heading', { name: 'Mark Legacy' })).toBeTruthy()
    expect(screen.queryByRole('textbox')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledWith({
      path: '/api/WFApplication/421', method: 'PATCH', token: 'test-token',
      body: { data: { attributes: { Status: 'LEGACY' }, id: 421, type: 'WFApplication' } },
    }))
    expect(handleCancelTask).not.toHaveBeenCalled()
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['prelim', 'list'] }))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['prelim', 'detail'] })
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Mark Legacy' })).toBeNull())
  })

  it.each(['WITHDRAWN', 'LEGACY', 'WTH'])('hides Mark Legacy for %s applications', (status) => {
    user.role = 'MIS'
    setup('PENDING', 'Mark Legacy', status)
    expect(screen.queryByRole('button', { name: 'Mark Legacy' })).toBeNull()
  })

  it('hides Mark Legacy for non-MIS users even when a task grants access', () => {
    setup('PENDING', 'Mark Legacy')
    expect(screen.queryByRole('button', { name: 'Mark Legacy' })).toBeNull()
  })

  it('allows MIS in the user role list regardless of task status', () => {
    user.roles = [{ name: 'MIS' }]
    setup('COMPLETED', 'Mark Legacy')
    expect((screen.getByRole('button', { name: 'Mark Legacy' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('keeps the dialog open without refreshing when the PATCH fails', async () => {
    user.role = 'MIS'
    vi.mocked(fetchWithAuth).mockRejectedValue(new Error('Update failed'))
    const { invalidate, handleCancelTask } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Mark Legacy' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
    await waitFor(() => expect((screen.getByRole('button', { name: 'Yes' }) as HTMLButtonElement).disabled).toBe(false))
    expect(screen.getByRole('heading', { name: 'Mark Legacy' })).toBeTruthy()
    expect(invalidate).not.toHaveBeenCalled()
    expect(handleCancelTask).not.toHaveBeenCalled()
  })
})
