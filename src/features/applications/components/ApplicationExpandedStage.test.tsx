import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Applicant, Task } from '@/types/application'
import { ApplicationExpandedStage } from './ApplicationExpandedStage'

vi.mock('@/context/UserContext', () => ({ useUser: () => ({ username: 'tester', role: 'NCRC' }) }))
vi.mock('@/features/tasks/hooks/useTaskQueries', () => ({ useFetchTaskRoles: () => ({ data: [] }) }))
vi.mock('@/features/tasks/hooks/useTaskMutations', () => ({ useUndoTaskMutation: () => ({}) }))
vi.mock('@/features/tasks/notes/useTaskNotesDrawerState', () => ({
  useTaskNotesDrawerState: () => ({
    activeNotes: {}, activeLoading: {},
    getCounts: () => ({ incoming: 0, outgoing: 0, private: 0, mention: 0 }),
    isLoading: () => false,
  }),
}))
vi.mock('@/features/tasks/notes/TaskNotesDrawer', () => ({ TaskNotesDrawer: () => null }))
vi.mock('@/features/applications/components/ApplicationDetailsDrawer', () => ({ ApplicationDetailsDrawer: () => null }))

function setup(classification: Omit<Partial<Task>, 'status'> & { status?: string }, applicationOverrides: Partial<Applicant> = {}) {
  const task = { TaskInstanceId: 123, name: 'Receive signed contract', status: 'PENDING', taskRoles: [{ taskRole: 'NCRC' }], ...classification } as Task
  const applicant = { applicationId: 1, assignedRoles: [{ NCRC: 'tester' }], stages: { contract: { tasks: [task], progress: 0 } }, ...applicationOverrides } as unknown as Applicant
  const onAction = vi.fn()
  render(<ApplicationExpandedStage expandedStage="contract" setExpandedStage={vi.fn()} applicant={applicant} handleTaskAction={onAction} />)
  return onAction
}

describe('external confirmation stage tasks', () => {
  it.each([
    { taskType: 'CONFIRM', taskCategory: 'EXTERNAL' },
    { taskType: ' confirm ', taskCategory: ' external ' },
    { TaskType: 'CONFIRM', TaskCategory: 'EXTERNAL' },
  ])('opens a dismissible informational dialog for %j', (classification) => {
    const onAction = setup(classification)
    fireEvent.click(screen.getByRole('button', { name: 'Receive signed contract' }))
    expect(screen.getByRole('dialog').textContent).toContain('Waiting for external "Receive signed contract" event.')
    expect(onAction).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it.each([
    { taskType: 'ACTION', taskCategory: 'EXTERNAL' },
    { taskType: 'WAIT', taskCategory: 'EXTERNAL' },
    { taskType: 'CONFIRM', taskCategory: 'CONFIRMATION' },
  ])('preserves disabled behavior for other task classifications %j', (classification) => {
    const onAction = setup({ ...classification, status: 'NEW' })
    fireEvent.click(screen.getByText('Receive signed contract'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(onAction).not.toHaveBeenCalled()
  })

  it.each(['NEW', 'COMPLETED'])('renders %s external confirmation tasks as non-actionable text', (status) => {
    const onAction = setup({ taskType: 'CONFIRM', taskCategory: 'EXTERNAL', status })
    expect(screen.queryByRole('button', { name: 'Receive signed contract' })).toBeNull()
    fireEvent.click(screen.getByText('Receive signed contract'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(onAction).not.toHaveBeenCalled()
  })

  it.each([
    { assignedRoles: [{ NCRC: 'someone-else' }] },
    { status: 'COMPLETED' },
  ])('respects assignment and application status restrictions %j', (applicationOverrides) => {
    const onAction = setup({ taskType: 'CONFIRM', taskCategory: 'EXTERNAL' }, applicationOverrides)
    expect(screen.queryByRole('button', { name: 'Receive signed contract' })).toBeNull()
    fireEvent.click(screen.getByText('Receive signed contract'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(onAction).not.toHaveBeenCalled()
  })
})
