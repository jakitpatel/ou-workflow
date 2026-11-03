import type { AssignedRole } from '@/types/application'

// Resolves the application's coordinators for the contract stage. These names and emails go
// into the agreement, cover letter, signature block and email cc, so they must come from the
// application's assignments - never from the signed-in user.

type CoordinatorDirectoryEntry = {
  name?: string
  assigneeValue?: string
  userName?: string
  fullName?: string
  email?: string
}

type CoordinatorSource = {
  assignedRoles?: AssignedRole[]
  assignedRC?: unknown
  companyRC?: unknown
  RCDetails?: unknown
  assignedNCRC?: unknown
  DesignatedRC?: unknown
  DesignatedNCRC?: unknown
}

export type ContractCoordinators = {
  /** RC username/identifier, '' when no RC is assigned. */
  rcName: string
  /** RC email from the RC record, '' when it is not on file. */
  rcEmail: string
  /** NCRC username/identifier, '' when no NCRC is assigned. */
  ncrcName: string
}

const text = (value: unknown) =>
  typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''

const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

const sameIdentity = (left: string, right: string) =>
  Boolean(left) && Boolean(right) && left.toLowerCase() === right.toLowerCase()

const getRoleValue = (assignedRoles: AssignedRole[] | undefined, roleName: string) => {
  const target = roleName.toLowerCase()
  for (const role of Array.isArray(assignedRoles) ? assignedRoles : []) {
    if (!role || typeof role !== 'object') continue
    for (const [key, value] of Object.entries(role)) {
      if (key === 'isPrimary' || key.toLowerCase() !== target) continue
      const resolved = text(value)
      if (resolved) return resolved
    }
  }
  return ''
}

type RcDetail = { username: string; fullName: string; email: string }

/** RCDetails arrives as a JSON string (list API) or an array of {userid, First, Last, email}. */
export const parseRcDetails = (value: unknown): RcDetail[] => {
  let rows: unknown = value
  if (typeof value === 'string') {
    try {
      rows = JSON.parse(value)
    } catch {
      return []
    }
  }
  if (!Array.isArray(rows)) rows = rows && typeof rows === 'object' ? [rows] : []

  return (rows as unknown[]).flatMap((row) => {
    if (!row || typeof row !== 'object') return []
    const record = row as Record<string, unknown>
    const rawEmail = text(record.email ?? record.Email ?? record.EMail)
    const fullName = [text(record.First ?? record.first), text(record.Last ?? record.last)]
      .filter(Boolean)
      .join(' ')
    const username = text(record.userName ?? record.username) || (looksLikeEmail(rawEmail) ? '' : rawEmail)
    return [{ username, fullName, email: looksLikeEmail(rawEmail) ? rawEmail : '' }]
  })
}

const designatedName = (value: unknown) => {
  if (typeof value === 'string') return value.trim()
  if (!value || typeof value !== 'object') return ''
  const record = value as Record<string, unknown>
  return (
    text(record.userName ?? record.username ?? record.email) ||
    [text(record.FIRST ?? record.First ?? record.first), text(record.LAST ?? record.Last ?? record.last)]
      .filter(Boolean)
      .join(' ')
  )
}

export function resolveContractCoordinators({
  applicant,
  applicationDetail,
  assignedRoles,
  rcDirectory = [],
}: {
  applicant?: CoordinatorSource | null
  applicationDetail?: CoordinatorSource | null
  assignedRoles?: AssignedRole[]
  rcDirectory?: CoordinatorDirectoryEntry[]
}): ContractCoordinators {
  const roleSources = [applicationDetail?.assignedRoles, assignedRoles, applicant?.assignedRoles]
  const rcDetails = [
    ...parseRcDetails(applicant?.RCDetails),
    ...parseRcDetails(applicationDetail?.RCDetails),
  ]

  const rcName =
    roleSources.map((roles) => getRoleValue(roles, 'RC')).find(Boolean) ||
    text(applicant?.assignedRC) ||
    text(applicationDetail?.assignedRC) ||
    text(applicant?.companyRC) ||
    text(applicationDetail?.companyRC) ||
    rcDetails.map((detail) => detail.username || detail.email).find(Boolean) ||
    designatedName(applicationDetail?.DesignatedRC) ||
    ''

  const directoryEntry = rcDirectory.find((entry) =>
    [entry.assigneeValue, entry.userName, entry.name, entry.fullName, entry.email].some((value) =>
      sameIdentity(text(value), rcName),
    ),
  )
  const matchingDetail = rcDetails.find((detail) =>
    [detail.username, detail.email, detail.fullName].some((value) => sameIdentity(value, rcName)),
  )
  const directoryEmail = text(directoryEntry?.email)

  const rcEmail = !rcName
    ? ''
    : (looksLikeEmail(directoryEmail) ? directoryEmail : '') ||
      matchingDetail?.email ||
      (looksLikeEmail(rcName) ? rcName : '')

  const ncrcName =
    roleSources.map((roles) => getRoleValue(roles, 'NCRC')).find(Boolean) ||
    text(applicationDetail?.assignedNCRC) ||
    text(applicant?.assignedNCRC) ||
    designatedName(applicationDetail?.DesignatedNCRC) ||
    ''

  return { rcName, rcEmail, ncrcName }
}
