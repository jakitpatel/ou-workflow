import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Applicant } from '@/types/application'
import { PrelimApplicationCard } from './PrelimApplicationCard'

const user = vi.hoisted(() => ({
  username: 'assistant.user', role: 'NCRC', roles: [],
  delegated: [{ name: 'S.Benjamin' }],
}))
vi.mock('@/context/UserContext', () => ({ useUser: () => user }))
vi.mock('@/features/tasks/hooks/useTaskQueries', () => ({ useFetchTaskRoles: () => ({ data: [] }) }))
vi.mock('./PrelimResolvedSection', () => ({ PrelimResolvedSection: () => null }))
vi.mock('./PrelimApplicationMessages', () => ({ PrelimApplicationMessages: () => null }))
vi.mock('./PrelimStageTasksPanel', () => ({ PrelimStageTasksPanel: () => null }))

function setup(status = 'PENDING', name = 'Cancel Submission') {
  const task = { TaskInstanceId: 123, name, status, taskCategory: 'APPROVAL',
    taskRoles: [{ taskRole: 'NCRC' }], taskType: 'CONDITION' }
  const company = { applicationId: 421, company: 'Example', status: 'NEW',
    assignedRoles: [{ NCRC: 's.benjamin' }],
    stages: { GlobalSubmission: { tasks: [task] } },
  } as unknown as Applicant
  const handleCancelTask = vi.fn()
  render(<PrelimApplicationCard company={company} expanded={false} setExpanded={vi.fn()}
    onViewApplication={vi.fn()} handleCancelTask={handleCancelTask} />)
  return { company, handleCancelTask }
}

describe('assistant cancellation permission', () => {
  beforeEach(() => {
    user.role = 'NCRC'
    user.delegated = [{ name: 'S.Benjamin' }]
  })

  it('allows the assistant to cancel with ASSISTANT capacity', async () => {
    const { company, handleCancelTask } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Submission' }))
    fireEvent.change(screen.getByLabelText('Withdrawal Reason'), { target: { value: 'Requested cancellation' } })
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Withdraw' }))
    await waitFor(() => expect(handleCancelTask).toHaveBeenCalledWith(company,
      expect.objectContaining({ TaskInstanceId: 123, capacity: 'ASSISTANT' }), 'Requested cancellation'))
  })

  it.each(['unrelated delegate', 'wrong role', 'completed task'])('disables cancellation for %s', (scenario) => {
    if (scenario === 'unrelated delegate') user.delegated = [{ name: 'someone.else' }]
    if (scenario === 'wrong role') user.role = 'PROD'
    setup(scenario === 'completed task' ? 'COMPLETED' : 'PENDING')
    const button = screen.getByRole('button', { name: /cannot be canceled/ }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it('completes Mark Legacy with the selected task and assistant capacity', async () => {
    const { company, handleCancelTask } = setup('PENDING', 'Mark Legacy')
    fireEvent.click(screen.getByRole('button', { name: 'Mark Legacy' }))
    expect(screen.getByRole('heading', { name: 'Mark Legacy' })).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Mark Legacy Reason'), { target: { value: '  Legacy submission  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Mark Legacy' }))
    await waitFor(() => expect(handleCancelTask).toHaveBeenCalledWith(company,
      expect.objectContaining({ TaskInstanceId: 123, name: 'Mark Legacy', capacity: 'ASSISTANT' }), 'Legacy submission'))
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Mark Legacy' })).toBeNull())
  })

  it.each(['unrelated delegate', 'wrong role', 'completed task'])('disables Mark Legacy for %s', (scenario) => {
    if (scenario === 'unrelated delegate') user.delegated = [{ name: 'someone.else' }]
    if (scenario === 'wrong role') user.role = 'PROD'
    setup(scenario === 'completed task' ? 'COMPLETED' : 'PENDING', 'Mark Legacy')
    expect((screen.getByRole('button', { name: 'Mark Legacy' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
