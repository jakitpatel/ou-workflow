import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { type ErrorDialogRef } from '@/components/ErrorDialog'
import { useUser } from '@/context/UserContext'
import { TASK_CATEGORIES, TASK_TYPES } from '@/lib/constants/task'
import {
  detectRole,
  getProgressStatus,
  normalizeStatus,
} from '@/lib/utils/taskHelpers'
import type { ApplicationTask } from '@/types/application'
import { useTasks } from '@/features/tasks/hooks/useTaskQueries'
import {
  useAssignTaskMutation,
  useConfirmTaskMutation,
} from '@/features/tasks/hooks/useTaskMutations'

type TaskSearchParams = {
  qs?: string
  days?: string | number
}

type DaysFilter = string | number

type InspectionFeeChoice = {
  inspectionNeeded: 'YES' | 'NO'
  feeNeeded: 'YES' | 'NO'
}

type TaskDashboardAction = ApplicationTask & {
  id?: string | number
  name?: string
  taskName?: string
  taskCategory?: string
  TaskCategory?: string
  TaskInstanceId?: string | number
}

type SelectedTaskAction = {
  application: any
  action: any
}

const DEBOUNCE_DELAY = 700

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  normal: 2,
  low: 3,
}

const STATUS = {
  NEW: 'new',
  IN_PROGRESS: 'in_progress',
  PENDING: 'pending',
  COMPLETED: 'completed',
  COMPLETE: 'complete',
} as const

const buildInspectionFeeResult = (value: InspectionFeeChoice): string =>
  `{inspectionNeeded:${value.inspectionNeeded}, feeNeeded:${value.feeNeeded}}`

const calculateTaskStats = (tasks: ApplicationTask[]) => {
  const normalizedTasks = tasks.map((task) => ({
    ...task,
    status: normalizeStatus(task.status),
  }))

  return {
    total: normalizedTasks.length,
    new: normalizedTasks.filter((task) => task.status === STATUS.NEW).length,
    inProgress: normalizedTasks.filter((task) => {
      const status = normalizeStatus(task.status)
      return status === STATUS.IN_PROGRESS || status === STATUS.PENDING
    }).length,
    overdue: normalizedTasks.filter((task) => task.daysOverdue > 0).length,
    completed: normalizedTasks.filter((task) => {
      const status = normalizeStatus(task.status)
      return status === STATUS.COMPLETED || status === STATUS.COMPLETE
    }).length,
  }
}

const getTaskActionPresentation = (application: TaskDashboardAction) => {
  const actionType = application.taskType?.toLowerCase()
  const actionCategory = (application.taskCategory || application.TaskCategory)?.toLowerCase()

  if (actionType === TASK_TYPES.CONFIRM && actionCategory === TASK_CATEGORIES.CONFIRMATION) {
    return { type: 'execute', assignee: 'Confirmed', result: 'no' as const }
  }

  if (
    (actionType === TASK_TYPES.CONDITIONAL || actionType === TASK_TYPES.CONDITION) &&
    [TASK_CATEGORIES.APPROVAL, TASK_CATEGORIES.APPROVAL1].includes(actionCategory as any)
  ) {
    return { type: 'condition' as const }
  }

  if (actionType === TASK_TYPES.ACTION && actionCategory === TASK_CATEGORIES.ASSIGNMENT) {
    return { type: 'assignment' as const }
  }

  if (
    actionType === TASK_TYPES.ACTION &&
    [TASK_CATEGORIES.SELECTOR, TASK_CATEGORIES.INPUT, TASK_CATEGORIES.SCHEDULING].includes(
      actionCategory as any,
    )
  ) {
    return { type: 'condition' as const }
  }

  if (
    (actionType === TASK_TYPES.ACTION &&
      [TASK_CATEGORIES.UPLOAD, TASK_CATEGORIES.EMAIL].includes(actionCategory as any)) ||
    (actionType === TASK_TYPES.UPLOAD && actionCategory === TASK_CATEGORIES.UPLOAD)
  ) {
    return { type: 'upload' as const }
  }

  if (actionType === TASK_TYPES.PROGRESS && actionCategory === TASK_CATEGORIES.PROGRESS_TASK) {
    return { type: 'condition' as const }
  }

  return { type: 'none' as const }
}

const resolveCapacity = (action: TaskDashboardAction, username?: string | null) => {
  const assigneeValue = action.assignee

  if (
    typeof assigneeValue === 'string' &&
    assigneeValue.trim() !== '' &&
    assigneeValue.toUpperCase() !== 'NULL'
  ) {
    return username?.toLowerCase() === assigneeValue.toLowerCase()
      ? 'MEMBER'
      : 'ASSISTANT'
  }

  return 'DESIGNATED'
}

export function useTaskDashboardState() {
  const search = useSearch({ strict: false }) as TaskSearchParams
  const navigate = useNavigate()
  const params = useParams({ strict: false })
  const errorDialogRef = useRef<ErrorDialogRef>(null)

  const searchTerm = search.qs || ''
  const daysFilter = search.days || 'pending'
  const applicationId = (params as { applicationId?: string | number })?.applicationId

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm)
  const [showPlantHistory, setShowPlantHistory] = useState<string | null>(null)
  const [showActionModal, setShowActionModal] = useState<any>(null)
  const [showConditionModal, setShowConditionModal] = useState<any>(null)
  const [showUploadModal, setShowUploadModal] = useState<any>(null)
  const [selectedAction, setSelectedAction] = useState<SelectedTaskAction | null>(null)

  const { username, role, roles, token } = useUser()

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, DEBOUNCE_DELAY)

    return () => clearTimeout(handler)
  }, [searchTerm])

  const normalizedAppId = useMemo(() => {
    if (typeof applicationId === 'string' || applicationId === undefined) {
      return applicationId
    }
    return applicationId != null ? String(applicationId) : undefined
  }, [applicationId])

  const tasksQuery = useTasks(normalizedAppId, debouncedSearchTerm, daysFilter)
  const tasks = tasksQuery.data ?? []

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element | null
      if (
        target &&
        !target.closest('.task-assignment-panel') &&
        !target.closest('.plant-history-modal')
      ) {
        setShowPlantHistory(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const taskStats = useMemo(() => calculateTaskStats(tasks), [tasks])

  const filteredTasks = useMemo(() => {
    const isAllRole = role?.toUpperCase() === 'ALL'
    const userRoles = isAllRole
      ? (roles ?? []).map((userRole) => userRole.name?.toLowerCase()).filter(Boolean)
      : role
        ? [role.toLowerCase()]
        : []

    const visibleTasks = tasks.filter((task) => {
      if (!isAllRole) {
        const taskRole = task.assigneeRole?.toLowerCase()
        return Boolean(taskRole && userRoles.includes(taskRole))
      }
      return true
    })

    return visibleTasks.sort((a, b) => {
      const aPriority = normalizeStatus(a.priority)
      const bPriority = normalizeStatus(b.priority)
      const priorityDiff =
        (PRIORITY_ORDER[aPriority] ?? 99) - (PRIORITY_ORDER[bPriority] ?? 99)

      if (priorityDiff !== 0) return priorityDiff
      return (b.daysActive ?? 0) - (a.daysActive ?? 0)
    })
  }, [tasks, role, roles])

  const confirmTaskMutation = useConfirmTaskMutation({
    onError: (message) => errorDialogRef.current?.open(message),
  })

  const assignTaskMutation = useAssignTaskMutation({
    onError: (message) => errorDialogRef.current?.open(message),
  })

  const executeAction = useCallback(
    (
      assignee: string,
      action: any,
      result?: string | InspectionFeeChoice,
      selectedActionArg?: SelectedTaskAction | null,
    ) => {
      const taskType = action.taskType?.toLowerCase()
      const taskCategory = (action.taskCategory || action.TaskCategory)?.toLowerCase()
      const taskId = action.taskInstanceId ?? action.TaskInstanceId ?? action.id
      const capacity = resolveCapacity(action, username)

      const mutationParams = {
        taskId: String(taskId ?? ''),
        token: token ?? undefined,
        username: username ?? undefined,
        capacity,
      }

      if (taskType === TASK_TYPES.CONFIRM && taskCategory === TASK_CATEGORIES.CONFIRMATION) {
        confirmTaskMutation.mutate(mutationParams)
        return
      }

      if (
        (taskType === TASK_TYPES.CONDITIONAL || taskType === TASK_TYPES.CONDITION) &&
        [TASK_CATEGORIES.APPROVAL, TASK_CATEGORIES.APPROVAL1].includes(taskCategory as any)
      ) {
        if (taskCategory === TASK_CATEGORIES.APPROVAL1 && result && typeof result === 'object') {
          confirmTaskMutation.mutate({
            ...mutationParams,
            result: buildInspectionFeeResult(result),
            resultData: buildInspectionFeeResult(result),
          })
          return
        }

        confirmTaskMutation.mutate({
          ...mutationParams,
          result: typeof result === 'string' ? result : undefined,
        })
        return
      }

      if (
        taskType === TASK_TYPES.ACTION &&
        [TASK_CATEGORIES.SELECTOR, TASK_CATEGORIES.INPUT, TASK_CATEGORIES.SCHEDULING].includes(
          taskCategory as any,
        )
      ) {
        confirmTaskMutation.mutate({
          ...mutationParams,
          result: typeof result === 'string' ? result : undefined,
        })
        return
      }

      if (taskType === TASK_TYPES.PROGRESS && taskCategory === TASK_CATEGORIES.PROGRESS_TASK) {
        const stringResult = typeof result === 'string' ? result : ''
        confirmTaskMutation.mutate({
          ...mutationParams,
          result: stringResult || undefined,
          status: stringResult ? getProgressStatus(stringResult) : '',
        })
        return
      }

      if (taskType === TASK_TYPES.ACTION && taskCategory === TASK_CATEGORIES.ASSIGNMENT) {
        const effectiveSelectedAction = selectedActionArg ?? selectedAction
        const rawAppId =
          effectiveSelectedAction?.application?.applicationId ??
          effectiveSelectedAction?.application?.id ??
          action.applicationId
        const appId = rawAppId == null || Number.isNaN(Number(rawAppId)) ? null : Number(rawAppId)
        const rawLabel = action.PreScript ?? effectiveSelectedAction?.action?.PreScript
        const roleType = detectRole(rawLabel)

        assignTaskMutation.mutate({
          appId,
          taskId: String(taskId ?? ''),
          role: roleType,
          assignee,
          token: token ?? undefined,
          capacity,
        })
      }
    },
    [assignTaskMutation, confirmTaskMutation, selectedAction, token, username],
  )

  const completeTaskWithResult = useCallback(
    (action: any, result: string, status?: string, completionNotes?: string) => {
      const taskId = action.taskInstanceId ?? action.TaskInstanceId ?? action.id
      const capacity = resolveCapacity(action, username)

      confirmTaskMutation.mutate({
        taskId: String(taskId ?? ''),
        token: token ?? undefined,
        username: username ?? undefined,
        capacity,
        result,
        status,
        completionNotes,
      })
    },
    [confirmTaskMutation, token, username],
  )

  const handleTaskAction = useCallback(
    (event: React.MouseEvent<HTMLElement>, application: ApplicationTask) => {
      event.stopPropagation()
      event.preventDefault()

      const action: any = {
        ...application,
        id: application.taskInstanceId,
        name: application.taskName,
        taskName: application.taskName,
        taskCategory: application.TaskCategory,
        TaskInstanceId: application.taskInstanceId,
      }
      const nextSelectedAction = { application: action, action }
      setSelectedAction(nextSelectedAction)

      const actionPresentation = getTaskActionPresentation(action)

      if (actionPresentation.type === 'execute') {
        executeAction(
          actionPresentation.assignee,
          action,
          actionPresentation.result,
          nextSelectedAction,
        )
        return
      }

      if (actionPresentation.type === 'condition') {
        setShowConditionModal(action)
        return
      }

      if (actionPresentation.type === 'assignment') {
        setShowActionModal(action)
        return
      }

      if (actionPresentation.type === 'upload') {
        setShowUploadModal(action)
      }
    },
    [executeAction],
  )

  const setSearchTerm = useCallback(
    (value: string) => {
      navigate({
        search: (prev: TaskSearchParams) => ({
          ...prev,
          qs: value,
        }),
      } as any)
    },
    [navigate],
  )

  const setDaysFilter = useCallback(
    (value: DaysFilter) => {
      navigate({
        search: (prev: TaskSearchParams) => ({
          ...prev,
          days: value,
        }),
      } as any)
    },
    [navigate],
  )

  const handleShowPlantHistory = useCallback((plantName: string) => {
    setShowPlantHistory(plantName)
  }, [])

  return {
    username,
    role,
    searchTerm,
    daysFilter,
    filteredTasks,
    taskStats,
    isLoading: tasksQuery.isLoading,
    isError: tasksQuery.isError,
    error: tasksQuery.error,
    showPlantHistory,
    setShowPlantHistory,
    showActionModal,
    setShowActionModal,
    showConditionModal,
    setShowConditionModal,
    showUploadModal,
    setShowUploadModal,
    selectedAction,
    executeAction,
    completeTaskWithResult,
    handleTaskAction,
    handleShowPlantHistory,
    setSearchTerm,
    setDaysFilter,
    errorDialogRef,
  }
}
