import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { type ErrorDialogRef } from '@/components/ErrorDialog'
import { useAppPreferences } from '@/context/AppPreferencesContext'
import { useUser } from '@/context/UserContext'
import { TASK_CATEGORIES, TASK_TYPES } from '@/lib/constants/task'
import {
  detectRole,
  getProgressStatus,
  normalizeStatus,
} from '@/lib/utils/taskHelpers'
import type { Applicant, ApplicationTask, Task } from '@/types/application'
import { useInfiniteTasks, useTasks } from '@/features/tasks/hooks/useTaskQueries'
import {
  useAssignTaskMutation,
  useConfirmTaskMutation,
} from '@/features/tasks/hooks/useTaskMutations'

type TaskSearchParams = {
  qs?: string
  days?: string | number
  page?: number
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

type ScheduleADrawerState = {
  open: boolean
  applicationId?: string | number
  applicationName?: string
  taskName?: string
}

type ScheduleBDrawerState = {
  open: boolean
  applicationId?: string | number
  applicationName?: string
  taskName?: string
}

type InspectionInvoiceDrawerState = {
  open: boolean
  applicant?: Applicant
  applicationId?: string | number
  applicationName?: string
  taskInstanceId?: string | number
  taskName?: string
}

type InspectionTaskDrawerState = {
  open: boolean
  applicant?: Applicant
  task?: Task
}

const DEBOUNCE_DELAY = 700
const PAGE_LIMIT = 50

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

const getTaskInstanceId = (task: ApplicationTask): number => {
  const taskId = Number((task as any).taskInstanceId ?? (task as any).TaskInstanceId ?? task.id)

  return Number.isFinite(taskId) ? taskId : 0
}

const mapApplicationTaskToStageTask = (task: ApplicationTask): Task => ({
  TaskInstanceId: getTaskInstanceId(task),
  name: task.taskName ?? (task as any).name ?? '',
  PreScript: task.PreScript ?? '',
  status: ['completed', 'in_progress', 'overdue', 'blocked', 'pending'].includes(
    String(task.status ?? '').toLowerCase(),
  )
    ? (String(task.status).toLowerCase() as Task['status'])
    : 'pending',
  assignee: task.assignee ?? '',
  daysActive: task.daysActive ?? 0,
  required: Boolean((task as any).required),
  overdue: (task.daysOverdue ?? 0) > 0 || Boolean((task as any).overdue),
  overdueDays: task.daysOverdue,
  daysPending: task.daysPending,
  daysOverdue: task.daysOverdue,
  description: task.taskDescription ?? '',
  completedBy: task.completedBy ?? undefined,
  CompletedDate: task.completedDate ?? undefined,
  taskType: task.taskType ?? task.TaskType,
  taskCategory: task.taskCategory ?? task.TaskCategory,
  StatusDetails: task.StatusDetails ?? task.statusDetails,
  Result: task.Result ?? task.result,
  ResultData: task.ResultData ?? task.resultData,
  GUIDisplayResult: task.GUIDisplayResult,
})

const buildInspectionApplicant = (selectedTask: ApplicationTask, tasks: ApplicationTask[]): Applicant => {
  const relatedTasks = tasks.filter((task) => task.applicationId === selectedTask.applicationId)
  const stageTasks = relatedTasks.length > 0 ? relatedTasks : [selectedTask]
  const stages = stageTasks.reduce<Applicant['stages']>((acc, task) => {
    const stageName = task.stageName || task.laneName || 'Tasks'

    acc[stageName] ??= {
      status: '',
      progress: 0,
      tasks: [],
    }
    acc[stageName].tasks.push(mapApplicationTaskToStageTask(task))

    return acc
  }, {})

  return {
    id: selectedTask.applicationId,
    applicationId: selectedTask.applicationId,
    companyId: selectedTask.companyId,
    company: selectedTask.companyName ?? '',
    plantId: selectedTask.plantId,
    plant: selectedTask.plantName ?? '',
    region: (selectedTask as any).region ?? '',
    priority: selectedTask.priority ?? 'NORMAL',
    status: '',
    assignedRC: '',
    daysInProcess: selectedTask.daysActive ?? 0,
    overdue: (selectedTask.daysOverdue ?? 0) > 0,
    daysOverdue: selectedTask.daysOverdue ?? 0,
    lastUpdate: selectedTask.completedDate ?? selectedTask.startedDate ?? '',
    nextAction: selectedTask.taskName ?? '',
    documents: 0,
    notes: 0,
    stages,
    externalReferenceId: selectedTask.companyId,
  }
}

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

  if (actionType === TASK_TYPES.ACTION && actionCategory === TASK_CATEGORIES.INVOICE) {
    return { type: 'inspection-invoice' as const }
  }

  if (actionType === TASK_TYPES.ACTION && actionCategory === TASK_CATEGORIES.ASSIGNMENT1) {
    return { type: 'inspection-assignment' as const }
  }

  if (actionType === TASK_TYPES.ACTION && actionCategory === TASK_CATEGORIES.VISIT) {
    return { type: 'inspection-visit' as const }
  }

  if (actionType === TASK_TYPES.ACTION && actionCategory === TASK_CATEGORIES.SCHEDULEA) {
    return { type: 'schedule-a' as const }
  }

  if (actionType === TASK_TYPES.ACTION && actionCategory === TASK_CATEGORIES.SCHEDULEB) {
    return { type: 'schedule-b' as const }
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
  const page = Number.isFinite(Number(search.page)) ? Math.max(0, Number(search.page)) : 0
  const applicationId = (params as { applicationId?: string | number })?.applicationId

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm)
  const [showPlantHistory, setShowPlantHistory] = useState<string | null>(null)
  const [showActionModal, setShowActionModal] = useState<any>(null)
  const [showConditionModal, setShowConditionModal] = useState<any>(null)
  const [showUploadModal, setShowUploadModal] = useState<any>(null)
  const [selectedAction, setSelectedAction] = useState<SelectedTaskAction | null>(null)
  const [scheduleADrawerState, setScheduleADrawerState] = useState<ScheduleADrawerState>({
    open: false,
  })
  const [scheduleBDrawerState, setScheduleBDrawerState] = useState<ScheduleBDrawerState>({
    open: false,
  })
  const [inspectionInvoiceDrawerState, setInspectionInvoiceDrawerState] =
    useState<InspectionInvoiceDrawerState>({
      open: false,
    })
  const [inspectionAssignmentDrawerState, setInspectionAssignmentDrawerState] =
    useState<InspectionTaskDrawerState>({
      open: false,
    })
  const [inspectionVisitDateDrawerState, setInspectionVisitDateDrawerState] =
    useState<InspectionTaskDrawerState>({
      open: false,
    })

  const { username, role, roles, token } = useUser()
  const { paginationMode } = useAppPreferences()
  const sentinelRef = useRef<HTMLDivElement | null>(null)

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

  const pagedTasksQuery = useTasks(
    normalizedAppId,
    debouncedSearchTerm,
    daysFilter,
    page,
    PAGE_LIMIT,
    paginationMode === 'paged',
  )
  const infiniteTasksQuery = useInfiniteTasks({
    applicationId: normalizedAppId,
    searchTerm: debouncedSearchTerm,
    daysFilter,
    limit: PAGE_LIMIT,
    enabled: paginationMode === 'infinite',
  })
  const tasks =
    paginationMode === 'paged'
      ? pagedTasksQuery.data?.data ?? []
      : infiniteTasksQuery.data?.pages.flatMap((currentPage) => currentPage.data) ?? []
  const totalCount =
    paginationMode === 'paged'
      ? pagedTasksQuery.data?.meta?.total_count ?? 0
      : infiniteTasksQuery.data?.pages?.[0]?.meta?.total_count ?? 0

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

  const allFilteredTasks = useMemo(() => {
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

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_LIMIT))
  const filteredTasks = allFilteredTasks
  const hasNextPage = paginationMode === 'infinite' && Boolean(infiniteTasksQuery.hasNextPage)

  const updateSearch = useCallback(
    (updates: Partial<TaskSearchParams>) => {
      navigate({
        search: (prev: TaskSearchParams) => ({
          ...prev,
          ...updates,
        }),
      } as any)
    },
    [navigate],
  )

  const handleFirst = useCallback(() => updateSearch({ page: 0 }), [updateSearch])
  const handlePrev = useCallback(
    () => updateSearch({ page: Math.max(page - PAGE_LIMIT, 0) }),
    [page, updateSearch],
  )
  const handleNext = useCallback(
    () => updateSearch({ page: page + PAGE_LIMIT < totalCount ? page + PAGE_LIMIT : page }),
    [page, totalCount, updateSearch],
  )
  const handleLast = useCallback(
    () => updateSearch({ page: (totalPages - 1) * PAGE_LIMIT }),
    [totalPages, updateSearch],
  )

  useEffect(() => {
    if (paginationMode !== 'paged') return
    if (page === 0 || page < totalCount) return
    updateSearch({ page: 0 })
  }, [page, paginationMode, totalCount, updateSearch])

  useEffect(() => {
    if (paginationMode !== 'infinite') return
    if (!sentinelRef.current) return
    if (!hasNextPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return
        if (!infiniteTasksQuery.hasNextPage || infiniteTasksQuery.isFetchingNextPage) return
        infiniteTasksQuery.fetchNextPage()
      },
      { rootMargin: '300px' },
    )

    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [
    hasNextPage,
    infiniteTasksQuery.fetchNextPage,
    infiniteTasksQuery.hasNextPage,
    infiniteTasksQuery.isFetchingNextPage,
    paginationMode,
  ])

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
      const inspectionApplicant = buildInspectionApplicant(application, tasks)
      const inspectionTask = mapApplicationTaskToStageTask(application)

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

      if (actionPresentation.type === 'schedule-a') {
        setScheduleADrawerState({
          open: true,
          applicationId: action.applicationId,
          applicationName: action.companyName ?? action.plantName,
          taskName: action.taskName ?? action.name,
        })
        return
      }

      if (actionPresentation.type === 'schedule-b') {
        setScheduleBDrawerState({
          open: true,
          applicationId: action.applicationId,
          applicationName: action.companyName ?? action.plantName,
          taskName: action.taskName ?? action.name,
        })
        return
      }

      if (actionPresentation.type === 'inspection-invoice') {
        setInspectionInvoiceDrawerState({
          open: true,
          applicant: inspectionApplicant,
          applicationId: action.applicationId,
          applicationName: action.companyName ?? action.plantName,
          taskInstanceId: action.taskInstanceId ?? action.TaskInstanceId,
          taskName: action.taskName ?? action.name,
        })
        return
      }

      if (actionPresentation.type === 'inspection-assignment') {
        setInspectionAssignmentDrawerState({
          open: true,
          applicant: inspectionApplicant,
          task: inspectionTask,
        })
        return
      }

      if (actionPresentation.type === 'inspection-visit') {
        setInspectionVisitDateDrawerState({
          open: true,
          applicant: inspectionApplicant,
          task: inspectionTask,
        })
        return
      }

      if (actionPresentation.type === 'upload') {
        setShowUploadModal(action)
      }
    },
    [executeAction, tasks],
  )

  const setSearchTerm = useCallback(
    (value: string) => {
      updateSearch({ qs: value, page: 0 })
    },
    [updateSearch],
  )

  const setDaysFilter = useCallback(
    (value: DaysFilter) => {
      updateSearch({ days: value, page: 0 })
    },
    [updateSearch],
  )

  const handleShowPlantHistory = useCallback((plantName: string) => {
    setShowPlantHistory(plantName)
  }, [])

  return {
    username,
    role,
    searchTerm,
    daysFilter,
    page,
    paginationMode,
    filteredTasks,
    totalCount,
    totalPages,
    pageSize: PAGE_LIMIT,
    hasNextPage,
    sentinelRef,
    taskStats,
    isLoading: paginationMode === 'paged' ? pagedTasksQuery.isLoading : infiniteTasksQuery.isLoading,
    isError: paginationMode === 'paged' ? pagedTasksQuery.isError : infiniteTasksQuery.isError,
    error: paginationMode === 'paged' ? pagedTasksQuery.error : infiniteTasksQuery.error,
    isFetchingNextPage: infiniteTasksQuery.isFetchingNextPage,
    showPlantHistory,
    setShowPlantHistory,
    showActionModal,
    setShowActionModal,
    showConditionModal,
    setShowConditionModal,
    showUploadModal,
    setShowUploadModal,
    scheduleADrawerState,
    setScheduleADrawerState,
    scheduleBDrawerState,
    setScheduleBDrawerState,
    inspectionInvoiceDrawerState,
    setInspectionInvoiceDrawerState,
    inspectionAssignmentDrawerState,
    setInspectionAssignmentDrawerState,
    inspectionVisitDateDrawerState,
    setInspectionVisitDateDrawerState,
    selectedAction,
    executeAction,
    completeTaskWithResult,
    handleTaskAction,
    handleShowPlantHistory,
    setSearchTerm,
    setDaysFilter,
    handleFirst,
    handlePrev,
    handleNext,
    handleLast,
    errorDialogRef,
  }
}
