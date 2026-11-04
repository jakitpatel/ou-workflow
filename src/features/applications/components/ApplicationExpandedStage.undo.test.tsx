import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Applicant, Task } from '@/types/application'
import { ApplicationExpandedStage } from './ApplicationExpandedStage'

// The task "Undo" button is switched off by TASK_UNDO_ENABLED; the implementation stays and
// returns when the switch is turned back on.
const flags = vi.hoisted(() => ({ undo: false }))
vi.mock('@/features/tasks/model/taskUndo', () => ({
  get TASK_UNDO_ENABLED() { return flags.undo },
}))
vi.mock('@/context/UserContext', () => ({ useUser: () => ({ username: 'tester', role: 'NCRC' }) }))
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }))
vi.mock('@/features/tasks/hooks/useTaskQueries', () => ({ useFetchTaskRoles: () => ({ data: [] }) }))
vi.mock('@/features/tasks/hooks/useTaskMutations', () => ({ useUndoTaskMutation: () => ({ isPending: false }) }))
vi.mock('@/features/tasks/notes/useTaskNotesDrawerState', () => ({
  useTaskNotesDrawerState: () => ({
    activeNotes: {}, activeLoading: {},
    getCounts: () => ({ incoming: 0, outgoing: 0, private: 0, mention: 0 }),
    isLoading: () => false,
  }),
}))
vi.mock('@/features/tasks/notes/TaskNotesDrawer', () => ({ TaskNotesDrawer: () => null }))
vi.mock('@/features/applications/components/ApplicationDetailsDrawer', () => ({ ApplicationDetailsDrawer: () => null }))

const renderCompletedTask = () => {
  const task = {
    TaskInstanceId: 123, name: 'Application Review', status: 'COMPLETED',
    taskType: 'CONDITION', taskCategory: 'APPROVAL', taskRoles: [{ taskRole: 'NCRC' }],
  } as unknown as Task
  const applicant = {
    applicationId: 1, assignedRoles: [{ NCRC: 'tester' }],
    stages: { intake: { tasks: [task], progress: 100 } },
  } as unknown as Applicant
  render(<ApplicationExpandedStage expandedStage="intake" setExpandedStage={vi.fn()} applicant={applicant} handleTaskAction={vi.fn()} />)
}

describe('task Undo button switch', () => {
  beforeEach(() => { flags.undo = false })

  it('is hidden while TASK_UNDO_ENABLED is off', () => {
    renderCompletedTask()
    expect(screen.getByText('Application Review')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Undo Application Review' })).toBeNull()
  })

  it('comes back unchanged when TASK_UNDO_ENABLED is turned on', () => {
    flags.undo = true
    renderCompletedTask()
    expect(screen.getByRole('button', { name: 'Undo Application Review' })).toBeTruthy()
  })
})
