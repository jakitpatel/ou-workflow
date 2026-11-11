import { redactDiagnosticText } from '@/shared/diagnostics/recentErrors'
import type { RecentError } from '@/shared/diagnostics/recentErrors'
import type { IssueReportContext } from '../model/issueReport'

export type IssueReportEnvironment = {
  pathname: string
  search: string
  pageTitle: string
  username?: string | null
  role?: string | null
  build: { version: string; commit: string; env: string }
  userAgent: string
  viewport: { width: number; height: number }
  timeZone: string
  now: Date
  recentErrors: RecentError[]
  includeRecentErrors: boolean
}

const APPLICATION_PATH = /\/(?:ncrc|rfr|tasks|prelim)-dashboard\/(\d+)(?:\/|$)/
const APPLICATION_SEARCH_KEYS = ['applicationId', 'appId', 'applicationID']

const toPositiveInteger = (value: unknown): number | null => {
  const parsed = Number(typeof value === 'string' ? value.trim() : value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

/** The application the user is looking at, from the route path or the search params. */
export function getApplicationIdFromLocation(pathname: string, search: string): number | null {
  const fromPath = toPositiveInteger(APPLICATION_PATH.exec(pathname)?.[1])
  if (fromPath) return fromPath

  const params = new URLSearchParams(search)
  for (const key of APPLICATION_SEARCH_KEYS) {
    const value = toPositiveInteger(params.get(key))
    if (value) return value
  }
  return null
}

/**
 * Builds the automatic context for an issue report. Only the path is kept (no query string, which
 * can hold search text); recent errors are already redacted and are left out unless the user agrees.
 */
export function buildIssueReportContext(env: IssueReportEnvironment): IssueReportContext {
  return {
    page: env.pathname || '/',
    pageTitle: redactDiagnosticText(env.pageTitle, 120),
    applicationId: getApplicationIdFromLocation(env.pathname, env.search),
    appVersion: env.build.version,
    appCommit: env.build.commit,
    appEnvironment: env.build.env,
    username: env.username?.trim() ?? '',
    role: env.role?.trim() ?? '',
    userAgent: env.userAgent,
    viewport: `${Math.round(env.viewport.width)}x${Math.round(env.viewport.height)}`,
    timeZone: env.timeZone,
    reportedAt: env.now.toISOString(),
    recentErrors: env.includeRecentErrors ? env.recentErrors : [],
  }
}
