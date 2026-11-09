import { describe, expect, it } from 'vitest'
import type { Applicant, Task } from '@/types/application'
import { mapTaskToAction, mapTaskToUndoAction } from './taskHelpers'

// A pending task the signed-in NCRC is assigned to: actionable unless its stage is completed.
const application = {
  applicationId: 1715,
  status: 'INP',
  assignedRoles: [{ NCRC: 'kleinc' }],
} as unknown as Applicant
const task = (status: string) =>
  ({ TaskInstanceId: 900, name: 'Review', status, taskRoles: [{ taskRole: 'NCRC' }] }) as unknown as Task
const context = (stageStatus: string | undefined, status = 'PENDING') => ({
  task: task(status),
  application,
  username: 'kleinc',
  userRoles: ['ncrc'],
  delegated: [],
  stageStatus,
})

describe('tasks in a completed stage', () => {
  it.each([undefined, 'IN_PROGRESS', 'pending', 'New'])('stay actionable when the stage status is %s', (stageStatus) => {
    expect(mapTaskToAction(context(stageStatus)).disabled).toBe(false)
  })

  it.each(['COMPLETED', 'completed', 'Complete', 'done'])('are not actionable when the stage status is %s', (stageStatus) => {
    expect(mapTaskToAction(context(stageStatus)).disabled).toBe(true)
    expect(mapTaskToAction(context(stageStatus, 'IN_PROGRESS')).disabled).toBe(true)
  })

  it('cannot be undone once the stage is completed', () => {
    expect(mapTaskToUndoAction(context('COMPLETED', 'COMPLETED')).disabled).toBe(true)
  })
})
