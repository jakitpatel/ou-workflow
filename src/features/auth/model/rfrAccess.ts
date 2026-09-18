import { enableRfrSession, isRfrSession, storeRfrApplicationId } from './tokenStorage'

type RoleUser = {
  role?: string | null
  roles?: Array<{ name: string }> | null
}

export function isRfrUser(user: RoleUser): boolean {
  const activeRole = user.role?.trim().toUpperCase()
  if (activeRole === 'RFR') return true
  if (activeRole && activeRole !== 'ALL') return false
  const roles = (user.roles ?? []).map((role) => role.name.trim().toUpperCase()).filter(Boolean)
  return roles.length > 0 && roles.every((role) => role === 'RFR')
}

export function isRfrApplicationPath(pathname: string): boolean {
  return /^\/ou-workflow\/rfr-dashboard\/[^/]+\/?$/.test(pathname)
}

export function isRfrAccessRestricted(user: RoleUser): boolean {
  return isRfrSession() || isRfrUser(user)
}

// UI routing policy; API authorization remains enforced by the server.
export function getRfrRedirect(pathname: string, user: RoleUser): string | null {
  if (!isRfrAccessRestricted(user) || pathname === '/profile' || pathname === '/profile/' || isRfrApplicationPath(pathname)) return null
  const legacyDetail = pathname.match(/^\/ou-workflow\/(?:ncrc-dashboard|tasks-dashboard)\/([^/]+)\/?$/)
  return legacyDetail ? `/ou-workflow/rfr-dashboard/${legacyDetail[1]}` : '/profile'
}

export function getStoredRfrRedirect(pathname: string): string | null {
  try {
    const user = JSON.parse(sessionStorage.getItem('user') ?? 'null') as RoleUser | null
    if (isRfrApplicationPath(pathname) || (user && isRfrUser(user))) enableRfrSession()
    if (isRfrApplicationPath(pathname)) {
      storeRfrApplicationId(decodeURIComponent(pathname.split('/')[3]))
    }
    return getRfrRedirect(pathname, user ?? {})
  } catch {
    return null
  }
}
