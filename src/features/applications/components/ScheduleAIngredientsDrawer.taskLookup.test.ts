import { describe, expect, it } from 'vitest'
import type { Applicant } from '@/types/application'
import { findScheduleATaskInstanceId } from './ScheduleAIngredientsDrawer'

const application = (applicationId: number, tasks: Array<Record<string, unknown>>) =>
  ({ applicationId, stages: { Ingredients: { status: '', progress: 0, tasks } } }) as unknown as Applicant

// Audit F8: from the Tasks dashboard the ScheduleA task is NEW and missing from the pending list.
describe('findScheduleATaskInstanceId', () => {
  const tasks = [
    { name: 'Assign Ingredients', taskType: 'ACTION', taskCategory: 'SCHEDULEAASSIGNING', TaskInstanceId: 567, status: 'PENDING' },
    { name: 'ScheduleA', taskType: 'ACTION', taskCategory: 'SCHEDULEA', TaskInstanceId: 569, status: 'NEW' },
  ]

  it('finds the NEW ScheduleA task of the matching application', () => {
    expect(findScheduleATaskInstanceId([application(14, []), application(15, tasks)], '15')).toBe(569)
  })

  it('accepts backend-cased fields', () => {
    const upper = [{ name: 'ScheduleA', TaskType: 'ACTION', TaskCategory: 'SCHEDULEA', taskInstanceId: 42 }]
    expect(findScheduleATaskInstanceId([application(15, upper)], 15)).toBe(42)
  })

  it('returns null when the application or task is missing', () => {
    expect(findScheduleATaskInstanceId(undefined, 15)).toBeNull()
    expect(findScheduleATaskInstanceId([application(15, tasks.slice(0, 1))], 15)).toBeNull()
  })
})
