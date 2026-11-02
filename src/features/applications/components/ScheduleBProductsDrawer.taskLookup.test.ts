import { describe, expect, it } from 'vitest'
import type { Applicant } from '@/types/application'
import { findScheduleBTaskInstanceId } from './ScheduleBProductsDrawer'

const application = (applicationId: number, tasks: Array<Record<string, unknown>>) =>
  ({ applicationId, stages: { Products: { status: '', progress: 0, tasks } } }) as unknown as Applicant

// fu-followups (F8 for Schedule B): from the Tasks dashboard the ScheduleB task is NEW and missing from the pending list.
describe('findScheduleBTaskInstanceId', () => {
  const tasks = [
    { name: 'Assign to Products', taskType: 'ACTION', taskCategory: 'SCHEDULEBASSIGNING', TaskInstanceId: 573, status: 'PENDING' },
    { name: 'ScheduleB', taskType: 'ACTION', taskCategory: 'SCHEDULEB', TaskInstanceId: 575, status: 'NEW' },
  ]

  it('finds the NEW ScheduleB task of the matching application', () => {
    expect(findScheduleBTaskInstanceId([application(14, []), application(15, tasks)], '15')).toBe(575)
  })

  it('accepts backend-cased fields', () => {
    const upper = [{ name: 'ScheduleB', TaskType: 'ACTION', TaskCategory: 'SCHEDULEB', taskInstanceId: 42 }]
    expect(findScheduleBTaskInstanceId([application(15, upper)], 15)).toBe(42)
  })

  it('returns null when the application or task is missing', () => {
    expect(findScheduleBTaskInstanceId(undefined, 15)).toBeNull()
    expect(findScheduleBTaskInstanceId([application(15, tasks.slice(0, 1))], 15)).toBeNull()
  })
})
