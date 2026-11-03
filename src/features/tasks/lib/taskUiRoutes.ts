import { TASK_CATEGORIES, TASK_TYPES } from '@/lib/constants/task'

/**
 * The UI a task's action button opens. Shared by the Application Dashboard and Tasks &
 * Notifications, so the same task opens the same UI on both screens.
 */
export type TaskUi =
  | 'certification-drawer'
  | 'prelim-resolution-drawer'
  | 'schedule-a-drawer'
  | 'schedule-b-drawer'
  | 'inspection-invoice-drawer'
  | 'inspection-assignment-drawer'
  | 'inspection-visit-drawer'
  | 'contract-drawer'
  | 'confirm'
  | 'condition-modal'
  | 'upload-modal'
  | 'action-modal'

export type TaskUiRoute = {
  ui: TaskUi
  /** Task types (lower case) this row applies to; omitted means any type. */
  types?: readonly string[]
  /** Task categories (lower case) this row applies to; omitted means any category. */
  categories?: readonly string[]
  /** Only when the task name contains this text (case-insensitive). */
  nameIncludes?: string
  /** Only when the whole task name (trimmed, lower-cased) matches this pattern. */
  namePattern?: RegExp
}

const { ACTION, CONFIRM, CONDITION, CONDITIONAL, PROGRESS, UPLOAD } = TASK_TYPES
const C = TASK_CATEGORIES
const CONDITION_TYPES = [CONDITION, CONDITIONAL] as const

/**
 * Task type / category / name -> UI. Rows are checked in order and the first match wins, so put
 * specific rows above general ones. A task matching no row does nothing. Values are compared
 * trimmed and lower-cased.
 */
export const TASK_UI_ROUTES: readonly TaskUiRoute[] = [
  { ui: 'certification-drawer', types: [ACTION], categories: [C.CERTIFICATE] },
  // Intake company / plant resolution (ResolveCompany, ResolvePlant, ResolvePlant2, ...).
  { ui: 'prelim-resolution-drawer', types: [ACTION], categories: [C.INPUT], namePattern: /^(resolvecompany|resolveplant\d*)$/ },

  { ui: 'schedule-a-drawer', types: [ACTION], categories: [C.SCHEDULEA, C.SCHEDULEA_ASSIGNING, C.SCHEDULEA_START] },
  { ui: 'schedule-a-drawer', types: CONDITION_TYPES, categories: [C.APPROVAL_SIGNOFF_A] },
  { ui: 'schedule-b-drawer', types: [ACTION], categories: [C.SCHEDULEB, C.SCHEDULEB_ASSIGNING, C.SCHEDULEB_START] },
  { ui: 'schedule-b-drawer', types: CONDITION_TYPES, categories: [C.APPROVAL_SIGNOFF_B] },

  { ui: 'inspection-invoice-drawer', types: [ACTION], categories: [C.INVOICE] },
  { ui: 'inspection-assignment-drawer', types: [ACTION], categories: [C.ASSIGNMENT1] },
  { ui: 'inspection-visit-drawer', types: [ACTION], categories: [C.VISIT] },

  { ui: 'contract-drawer', types: [ACTION], categories: [C.CONTRACT] },
  { ui: 'contract-drawer', types: [CONFIRM], categories: [C.CONFIRMATION], nameIncludes: 'contract' },
  // Completes the task at once with assignee "Confirmed" and result "yes".
  { ui: 'confirm', types: [CONFIRM], categories: [C.CONFIRMATION] },

  { ui: 'condition-modal', types: CONDITION_TYPES, categories: [C.APPROVAL, C.APPROVAL1] },

  // NDA legal review.
  { ui: 'upload-modal', types: [ACTION], categories: ['ndareview'] },
  { ui: 'upload-modal', types: [ACTION], categories: [C.UPLOAD, C.EMAIL] },
  { ui: 'upload-modal', types: [UPLOAD], categories: [C.UPLOAD] },

  // RFR recommendation uses the assignment modal.
  { ui: 'action-modal', types: [ACTION], categories: [C.ASSIGNMENT, 'assignrfr'] },
  // Any other action task.
  { ui: 'condition-modal', types: [ACTION] },
  { ui: 'condition-modal', types: [PROGRESS], categories: [C.PROGRESS_TASK] },
]

type TaskLike = {
  name?: unknown
  taskName?: unknown
  taskType?: unknown
  TaskType?: unknown
  taskCategory?: unknown
  TaskCategory?: unknown
}

const normalize = (value: unknown) => String(value ?? '').trim().toLowerCase()

/** The first route matching the task, or undefined when the screen should do nothing. */
export function resolveTaskUi(
  task: TaskLike,
  routes: readonly TaskUiRoute[] = TASK_UI_ROUTES,
): TaskUi | undefined {
  const type = normalize(task.taskType ?? task.TaskType)
  const category = normalize(task.taskCategory ?? task.TaskCategory)
  const name = normalize(task.name ?? task.taskName)
  return routes.find(
    (route) =>
      (!route.types || route.types.includes(type)) &&
      (!route.categories || route.categories.includes(category)) &&
      (!route.nameIncludes || name.includes(route.nameIncludes.toLowerCase())) &&
      (!route.namePattern || route.namePattern.test(name)),
  )?.ui
}
