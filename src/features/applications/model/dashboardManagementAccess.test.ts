import { describe, expect, it } from 'vitest'
import { canManageDashboard } from './dashboardManagementAccess'

describe('dashboard management access', () => {
  it.each([
    ['MIS', null, true],
    ['ALL', [{ name: 'MIS' }, { name: 'NCRC' }], true],
    ['ALL', [{ name: 'NCRC' }], false],
    ['ALL', null, false],
    ['NCRC', [{ name: 'MIS' }], false],
    ['DISPATCH', null, false],
    [null, null, false],
    [' all ', [{ name: ' mis ' }], true],
  ])('checks active role %s and assigned roles %j', (role, roles, expected) => {
    expect(canManageDashboard(role, roles)).toBe(expected)
  })
})
