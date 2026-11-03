import { describe, expect, it } from 'vitest'
import { NCRC_TASK_UI_ROUTES, resolveNcrcTaskUi, type NcrcTaskUi } from './ncrcTaskUiRoutes'

const task = (taskType: string, taskCategory: string, name = 'Task') => ({ name, taskType, taskCategory })

describe('NCRC_TASK_UI_ROUTES (Application Dashboard task -> UI)', () => {
  it.each<[string, string, string, NcrcTaskUi]>([
    ['action', 'certificate', 'Certificate', 'certification-drawer'],
    ['action', 'schedulea', 'ScheduleA', 'schedule-a-drawer'],
    ['action', 'scheduleaassigning', 'Assign ingredients', 'schedule-a-drawer'],
    ['action', 'scheduleastart', 'Start ingredients', 'schedule-a-drawer'],
    ['condition', 'approvalsignoffa', 'Sign off A', 'schedule-a-drawer'],
    ['conditional', 'approvalsignoffa', 'Sign off A', 'schedule-a-drawer'],
    ['action', 'scheduleb', 'ScheduleB', 'schedule-b-drawer'],
    ['action', 'schedulebassigning', 'Assign products', 'schedule-b-drawer'],
    ['action', 'schedulebstart', 'Start products', 'schedule-b-drawer'],
    ['condition', 'approvalsignoffb', 'Sign off B', 'schedule-b-drawer'],
    ['action', 'invoice', 'Invoice', 'inspection-invoice-drawer'],
    ['action', 'assignment1', 'Assign inspector', 'inspection-assignment-drawer'],
    ['action', 'visit', 'Visit date', 'inspection-visit-drawer'],
    ['action', 'contract', 'Contract', 'contract-drawer'],
    ['confirm', 'confirmation', 'Confirm Contract Sent', 'contract-drawer'],
    ['confirm', 'confirmation', 'Confirm payment', 'confirm'],
    ['condition', 'approval', 'Approve', 'condition-modal'],
    ['conditional', 'approval1', 'Approve', 'condition-modal'],
    ['action', 'ndareview', 'NDA legal review', 'upload-modal'],
    ['action', 'upload', 'Upload', 'upload-modal'],
    ['action', 'email', 'Email', 'upload-modal'],
    ['upload', 'upload', 'Upload', 'upload-modal'],
    ['action', 'assignment', 'Assign NCRC', 'action-modal'],
    ['action', 'assignrfr', 'RFR recommendation', 'action-modal'],
    ['action', 'selector', 'Select', 'condition-modal'],
    ['action', 'something-new', 'Anything', 'condition-modal'],
    ['progress', 'progress_task', 'Progress', 'condition-modal'],
  ])('%s / %s ("%s") opens %s', (type, category, name, ui) => {
    expect(resolveNcrcTaskUi(task(type, category, name))).toBe(ui)
  })

  it('does nothing for tasks no row matches', () => {
    expect(resolveNcrcTaskUi(task('progress', 'other'))).toBeUndefined()
    expect(resolveNcrcTaskUi(task('upload', 'email'))).toBeUndefined()
    expect(resolveNcrcTaskUi(task('confirm', 'approval'))).toBeUndefined()
    expect(resolveNcrcTaskUi({})).toBeUndefined()
  })

  it('compares trimmed, case-insensitive values and accepts PascalCase backend fields', () => {
    expect(resolveNcrcTaskUi({ name: 'X', TaskType: ' ACTION ', TaskCategory: 'Visit' })).toBe('inspection-visit-drawer')
    expect(resolveNcrcTaskUi({ name: 'X', taskType: 'Action', TaskCategory: 'NDAReview' })).toBe('upload-modal')
    expect(resolveNcrcTaskUi({ name: 'SEND CONTRACT', taskType: 'Confirm', taskCategory: 'Confirmation' })).toBe('contract-drawer')
  })

  it('prefers camelCase fields over PascalCase ones, like the rest of the app', () => {
    expect(resolveNcrcTaskUi({ taskType: 'action', TaskType: 'upload', taskCategory: 'visit' })).toBe('inspection-visit-drawer')
  })

  it('a task without a name is not treated as a contract and does not throw', () => {
    expect(resolveNcrcTaskUi({ taskType: 'confirm', taskCategory: 'confirmation' })).toBe('confirm')
  })

  it('first match wins: specific rows sit above the catch-all action row', () => {
    const catchAll = NCRC_TASK_UI_ROUTES.findIndex((route) => route.types?.includes('action') && !route.categories)
    expect(catchAll).toBeGreaterThan(0)
    NCRC_TASK_UI_ROUTES.slice(catchAll + 1).forEach((route) => expect(route.types).not.toContain('action'))
  })

  it('can be given a different table', () => {
    expect(resolveNcrcTaskUi(task('action', 'visit'), [{ ui: 'action-modal', categories: ['visit'] }])).toBe('action-modal')
  })
})
