import { afterEach, describe, expect, it } from 'vitest'
import { getRfrRedirect, getStoredRfrRedirect, isRfrUser, isRfrAccessRestricted } from './rfrAccess'
import { consumeAuthRedirect, storeAuthRedirect, clearSessionArtifacts, getRfrApplicationId } from './tokenStorage'
import { buildRfrApplicationUrl } from '@/features/applications/utils/rfrApplicationLink'

afterEach(() => sessionStorage.clear())

describe('RFR access and email links', () => {
  it('remembers the latest RFR application on Profile and clears it on sign-out', () => {
    getStoredRfrRedirect('/ou-workflow/rfr-dashboard/421')
    getStoredRfrRedirect('/profile')
    expect(getRfrApplicationId()).toBe('421')
    getStoredRfrRedirect('/ou-workflow/rfr-dashboard/1332/')
    getStoredRfrRedirect('/profile')
    expect(getRfrApplicationId()).toBe('1332')
    clearSessionArtifacts()
    expect(getRfrApplicationId()).toBeNull()
  })
  it('keeps mixed-role accounts restricted after an RFR link, profile navigation, and session reload', () => {
    const user = { role: 'ALL', roles: [{ name: 'NCRC' }, { name: 'RFR' }] }
    sessionStorage.setItem('user', JSON.stringify(user))
    expect(getStoredRfrRedirect('/ou-workflow/rfr-dashboard/421')).toBeNull()
    expect(getStoredRfrRedirect('/profile')).toBeNull()
    expect(isRfrAccessRestricted(user)).toBe(true)
    expect(getStoredRfrRedirect('/')).toBe('/profile')
    sessionStorage.setItem('user', JSON.stringify({ ...user, role: 'NCRC' }))
    expect(getStoredRfrRedirect('/ou-workflow/ncrc-dashboard')).toBe('/profile')
    expect(getStoredRfrRedirect('/ou-workflow/prelim-dashboard')).toBe('/profile')
    expect(getStoredRfrRedirect('/ou-workflow/tasks-dashboard')).toBe('/profile')
    expect(getStoredRfrRedirect('/ou-workflow/ncrc-dashboard/421')).toBe('/ou-workflow/rfr-dashboard/421')
    clearSessionArtifacts()
    expect(isRfrAccessRestricted(user)).toBe(false)
    expect(getStoredRfrRedirect('/ou-workflow/ncrc-dashboard')).toBeNull()
  })

  it('restricts active RFR and RFR-only accounts without restricting other staff roles', () => {
    expect(isRfrUser({ role: ' rfr ' })).toBe(true)
    expect(isRfrUser({ role: 'ALL', roles: [{ name: 'RFR' }] })).toBe(true)
    expect(isRfrUser({ role: 'ALL', roles: [{ name: 'NCRC' }, { name: 'RFR' }] })).toBe(false)
    expect(isRfrUser({ role: 'NCRC', roles: [{ name: 'RFR' }] })).toBe(false)
    expect(isRfrUser({ role: 'ALL', roles: [] })).toBe(false)
  })

  it('allows RFR detail and profile, redirects legacy links and blocks other pages', () => {
    const user = { role: 'RFR' }
    expect(getRfrRedirect('/ou-workflow/rfr-dashboard/421', user)).toBeNull()
    expect(getRfrRedirect('/profile', user)).toBeNull()
    expect(getRfrRedirect('/ou-workflow/ncrc-dashboard/421', user)).toBe('/ou-workflow/rfr-dashboard/421')
    for (const path of ['/', '/ou-workflow/ncrc-dashboard', '/ou-workflow/prelim-dashboard', '/ou-workflow/tasks-dashboard', '/sse-test']) {
      expect(getRfrRedirect(path, user)).toBe('/profile')
      expect(getRfrRedirect(path, { role: 'NCRC' })).toBeNull()
    }
    sessionStorage.setItem('user', JSON.stringify({ role: 'ALL', roles: [{ name: 'RFR' }] }))
    expect(getStoredRfrRedirect('/ou-workflow/ncrc-dashboard')).toBe('/profile')
  })

  it('builds direct links for local and deployed base paths and preserves the login destination', () => {
    const local = new URL(buildRfrApplicationUrl('421', '/'))
    expect(local.pathname).toBe('/ou-workflow/rfr-dashboard/421')
    expect(local.search).toBe('')
    expect(new URL(buildRfrApplicationUrl('421', '/dashboard/')).pathname).toBe('/dashboard/ou-workflow/rfr-dashboard/421')
    storeAuthRedirect(local.toString())
    expect(consumeAuthRedirect()).toBe('/ou-workflow/rfr-dashboard/421')
  })
})
