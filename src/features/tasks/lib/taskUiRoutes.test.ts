import { describe, expect, it } from 'vitest'
import { TASK_UI_ROUTES, resolveTaskUi, type TaskUi } from './taskUiRoutes'

const task = (taskType: string, taskCategory: string, name = 'Task') => ({ name, taskType, taskCategory })

describe('TASK_UI_ROUTES (task -> UI, both dashboards)', () => {
  it.each<[string, string, string, TaskUi]>([
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
    ['condition', 'approvalok', 'Application Review', 'condition-modal'],
    ['conditional', 'APPROVALOK', 'Application Review', 'condition-modal'],
    ['action', 'ndareview', 'NDA legal review', 'upload-modal'],
    ['action', 'upload', 'Upload', 'upload-modal'],
    ['action', 'email', 'Email', 'upload-modal'],
    ['upload', 'upload', 'Upload', 'upload-modal'],
    ['action', 'assignment', 'Assign NCRC', 'action-modal'],
    ['action', 'assignrfr', 'RFR recommendation', 'action-modal'],
    ['action', 'resolvecompany', 'ResolveCompany', 'prelim-resolution-drawer'],
    ['ACTION', 'RESOLVEPLANT', 'ResolvePlant1', 'prelim-resolution-drawer'],
    ['confirm', 'external', 'Receive signed contract', 'external-wait-dialog'],
    ['CONFIRM', 'EXTERNAL', 'Visit date', 'external-wait-dialog'],
    ['action', 'input', 'ResolveCompany', 'prelim-resolution-drawer'],
    ['action', 'input', 'ResolvePlant', 'prelim-resolution-drawer'],
    ['action', 'input', 'ResolvePlant2', 'prelim-resolution-drawer'],
    ['action', 'input', 'ResolvePlantX', 'condition-modal'],
    ['action', 'input', 'Enter value', 'condition-modal'],
    ['action', 'selector', 'ResolveCompany', 'condition-modal'],
    ['action', 'selector', 'Select', 'condition-modal'],
    ['action', 'something-new', 'Anything', 'condition-modal'],
    ['progress', 'progress_task', 'Progress', 'condition-modal'],
  ])('%s / %s ("%s") opens %s', (type, category, name, ui) => {
    expect(resolveTaskUi(task(type, category, name))).toBe(ui)
  })

  it('does nothing for tasks no row matches', () => {
    expect(resolveTaskUi(task('progress', 'other'))).toBeUndefined()
    expect(resolveTaskUi(task('upload', 'email'))).toBeUndefined()
    expect(resolveTaskUi(task('confirm', 'approval'))).toBeUndefined()
    expect(resolveTaskUi({})).toBeUndefined()
  })

  it('compares trimmed, case-insensitive values and accepts PascalCase backend fields', () => {
    expect(resolveTaskUi({ name: 'X', TaskType: ' ACTION ', TaskCategory: 'Visit' })).toBe('inspection-visit-drawer')
    expect(resolveTaskUi({ name: 'X', taskType: 'Action', TaskCategory: 'NDAReview' })).toBe('upload-modal')
    expect(resolveTaskUi({ name: 'SEND CONTRACT', taskType: 'Confirm', taskCategory: 'Confirmation' })).toBe('contract-drawer')
  })

  it('prefers camelCase fields over PascalCase ones, like the rest of the app', () => {
    expect(resolveTaskUi({ taskType: 'action', TaskType: 'upload', taskCategory: 'visit' })).toBe('inspection-visit-drawer')
  })

  it('reads the Tasks screen field names (taskName) as well as the dashboard ones (name)', () => {
    expect(resolveTaskUi({ taskName: 'ResolvePlant3', taskType: 'action', TaskCategory: 'input' })).toBe('prelim-resolution-drawer')
    expect(resolveTaskUi({ taskName: 'Send Contract', taskType: 'confirm', taskCategory: 'confirmation' })).toBe('contract-drawer')
  })

  it('a task without a name is not treated as a contract and does not throw', () => {
    expect(resolveTaskUi({ taskType: 'confirm', taskCategory: 'confirmation' })).toBe('confirm')
  })

  it('first match wins: specific rows sit above the catch-all action row', () => {
    const catchAll = TASK_UI_ROUTES.findIndex((route) => route.types?.includes('action') && !route.categories)
    expect(catchAll).toBeGreaterThan(0)
    TASK_UI_ROUTES.slice(catchAll + 1).forEach((route) => expect(route.types).not.toContain('action'))
  })

  it('can be given a different table', () => {
    expect(resolveTaskUi(task('action', 'visit'), [{ ui: 'action-modal', categories: ['visit'] }])).toBe('action-modal')
  })
})
