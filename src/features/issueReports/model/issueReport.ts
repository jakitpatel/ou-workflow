import type { RecentError } from '@/shared/diagnostics/recentErrors'

export const ISSUE_CATEGORIES = [
  { value: 'bug', label: 'Something is not working' },
  { value: 'data', label: 'Wrong or missing data' },
  { value: 'access', label: 'Access or permissions' },
  { value: 'performance', label: 'Slow or not loading' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'other', label: 'Other' },
] as const

export const ISSUE_SEVERITIES = [
  { value: 'low', label: 'Low – minor, I can keep working' },
  { value: 'medium', label: 'Medium – slows me down' },
  { value: 'high', label: 'High – I cannot do my work' },
] as const

export type IssueCategory = (typeof ISSUE_CATEGORIES)[number]['value']
export type IssueSeverity = (typeof ISSUE_SEVERITIES)[number]['value']

export const ISSUE_SUMMARY_MAX_LENGTH = 150
export const ISSUE_DESCRIPTION_MAX_LENGTH = 4000

export const MAX_ATTACHMENTS = 3
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
export const ATTACHMENT_ACCEPT = 'image/png,image/jpeg,image/gif,image/webp,application/pdf,text/plain,.log,.txt'

/** What the user types. */
export type IssueReportDraft = {
  category: IssueCategory
  severity: IssueSeverity
  summary: string
  description: string
  includeRecentErrors: boolean
}

/** Collected automatically when the report is submitted. */
export type IssueReportContext = {
  page: string
  pageTitle: string
  applicationId: number | null
  appVersion: string
  appCommit: string
  appEnvironment: string
  username: string
  role: string
  userAgent: string
  viewport: string
  timeZone: string
  reportedAt: string
  recentErrors: RecentError[]
}

/** The JSON sent in the `report` field of POST /report_issue. */
export type IssueReportPayload = Omit<IssueReportDraft, 'includeRecentErrors'> & {
  context: IssueReportContext
  attachmentNames: string[]
}

export type IssueReportResult = {
  reportId: string
}
