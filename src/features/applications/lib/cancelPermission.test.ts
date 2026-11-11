import { describe, expect, it } from 'vitest'
import { getCancelPermission } from './cancelPermission'
import type { Applicant, Task } from '@/types/application'

const cancelTask = {
  TaskInstanceId: 501,
  name: 'Cancel Application',
  status: 'pending',
  taskRoles: [{ taskRole: 'NCRC' }],
} as unknown as Task

const application = {
  applicationId: 42,
  status: 'inp',
  assignedRoles: [{ NCRC: 'rcohen' }, { RFR: 'dlevi' }],
} as unknown as Applicant

const base = { task: cancelTask, application, taskRolesAll: [] as string[] }

describe('getCancelPermission', () => {
  it('allows the designated NCRC', () => {
    expect(getCancelPermission({ ...base, username: 'RCohen', userRoles: ['ncrc'] }))
      .toEqual({ allowed: true, isAssistant: false })
  })

  it('allows the assistant of the designated NCRC even without holding the NCRC role', () => {
    expect(getCancelPermission({
      ...base,
      username: 'asst1',
      userRoles: ['dispatch'],
      delegated: [{ name: 'RCohen ' }],
    })).toEqual({ allowed: true, isAssistant: true })
  })

  it('allows the assistant who also holds the NCRC role', () => {
    expect(getCancelPermission({
      ...base,
      username: 'asst1',
      userRoles: ['ncrc'],
      delegated: [{ name: 'rcohen' }],
    })).toEqual({ allowed: true, isAssistant: true })
  })

  it('refuses an NCRC who is not assigned and not an assistant of the assigned NCRC', () => {
    expect(getCancelPermission({
      ...base,
      username: 'other',
      userRoles: ['ncrc'],
      delegated: [{ name: 'someoneelse' }],
    }).allowed).toBe(false)
  })

  it('refuses an assistant of a user assigned only to a role the task does not use', () => {
    expect(getCancelPermission({
      ...base,
      username: 'asst2',
      userRoles: ['ncrc'],
      delegated: [{ name: 'dlevi' }],
    }).allowed).toBe(false)
  })

  it('refuses a user who is assigned in a role they do not currently hold', () => {
    expect(getCancelPermission({ ...base, username: 'rcohen', userRoles: ['rfr'] }).allowed).toBe(false)
  })

  it('refuses when there is no pending cancel task or the task has no roles', () => {
    expect(getCancelPermission({ ...base, task: null, username: 'rcohen', userRoles: ['ncrc'] }).allowed)
      .toBe(false)
    expect(getCancelPermission({
      ...base,
      task: { ...cancelTask, taskRoles: [] } as unknown as Task,
      username: 'rcohen',
      userRoles: ['ncrc'],
      delegated: [{ name: 'rcohen' }],
    }).allowed).toBe(false)
  })

  it('allows anyone when the task belongs to a group-assignment role', () => {
    expect(getCancelPermission({ ...base, taskRolesAll: ['ncrc'], username: 'x', userRoles: [] }).allowed)
      .toBe(true)
  })
})
