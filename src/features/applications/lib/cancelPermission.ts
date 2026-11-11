import { normalizeTaskRoles } from '@/lib/utils/taskHelpers'
import type { Applicant, Task } from '@/types/application'

export type CancelPermissionContext = {
  task: Task | null
  application: Applicant
  username?: string | null
  userRoles: string[]
  /** Users the current user is an assistant to. */
  delegated?: { name: string }[] | null
  taskRolesAll?: string[]
}

export type CancelPermission = {
  allowed: boolean
  /** True when the user acts as the assistant of the person assigned to the task role. */
  isAssistant: boolean
}

const DENIED: CancelPermission = { allowed: false, isAssistant: false }

const normalizeName = (value: unknown) =>
  typeof value === 'string' ? value.trim().toLowerCase() : ''

/**
 * Decides whether the user may run an application's cancel / withdraw task
 * (Intake "Cancel Submission", Application Dashboard "Cancel Application" and their undo tasks).
 *
 * Allowed:
 * - anyone, when the task belongs to a group-assignment role;
 * - the user assigned to one of the task's roles on the application (e.g. the designated NCRC);
 * - an assistant of that assigned user. An assistant can do whatever the assigned role can do,
 *   so the assistant does not need to hold the role themselves.
 */
export function getCancelPermission({
  task,
  application,
  username,
  userRoles,
  delegated,
  taskRolesAll = [],
}: CancelPermissionContext): CancelPermission {
  if (!task) return DENIED

  const taskRoles = normalizeTaskRoles(task.taskRoles)
  if (taskRoles.length === 0) return DENIED

  if (taskRolesAll.some((taskRole) => taskRoles.includes(taskRole))) {
    return { allowed: true, isAssistant: false }
  }

  const assignedRoles = Array.isArray(application?.assignedRoles) ? application.assignedRoles : []
  const assigneesOf = (roles: string[]) =>
    assignedRoles.flatMap((assignedRole) =>
      roles.map((role) => normalizeName(assignedRole?.[role.toUpperCase()])).filter(Boolean),
    )

  const currentUser = normalizeName(username)
  const heldTaskRoles = userRoles.map((r) => r.toLowerCase()).filter((r) => taskRoles.includes(r))
  if (currentUser && assigneesOf(heldTaskRoles).includes(currentUser)) {
    return { allowed: true, isAssistant: false }
  }

  const assistedUsers = (delegated ?? []).map((item) => normalizeName(item?.name)).filter(Boolean)
  if (assistedUsers.length > 0 && assigneesOf(taskRoles).some((name) => assistedUsers.includes(name))) {
    return { allowed: true, isAssistant: true }
  }

  return DENIED
}
