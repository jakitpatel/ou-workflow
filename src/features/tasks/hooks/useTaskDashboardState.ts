import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { resolveTaskUi, type TaskUi } from '../lib/taskUiRoutes'
import { useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { type ErrorDialogRef } from '@/components/ErrorDialog'
import { useAppPreferences } from '@/context/AppPreferencesContext'
import { useUser } from '@/context/UserContext'
import { TASK_CATEGORIES, TASK_TYPES } from '@/lib/constants/task'
import { normalizeStatus } from '@/lib/utils/taskHelpers'
import type { Applicant, ApplicationTask, Task } from '@/types/application'
import { useInfiniteTasks, useTasks } from '@/features/tasks/hooks/useTaskQueries'
import { normalizeTaskApplicationId } from '@/features/tasks/model/applicationIdFilter'
import { useTaskActions, type SelectedTaskAction as SharedSelectedTaskAction } from '@/features/tasks/hooks/useTaskActions'

type TaskSearchParams = {
  applicationId?: number
  qs?: string
  days?: string | number
  page?: number
}

type DaysFilter = string | number


type TaskDashboardAction = import('@/features/tasks/model/taskAction').TaskAction & {
  id?: string | number
  name?: string
  taskName?: string
  taskCategory?: string
  TaskCategory?: string
  TaskInstanceId?: string | number
}

type SelectedTaskAction = import('@/features/tasks/model/taskAction').SelectedTaskAction

type ScheduleADrawerState = {
  open: boolean
  applicationId?: string | number
  applicationName?: string
  taskInstanceId?: string | number
  taskName?: string
  taskCategory?: string
  scheduleATaskInstanceId?: string | number
  scheduleATaskStatusDetails?: unknown
}

type ScheduleBDrawerState = {
  open: boolean
  applicationId?: string | number
  applicationName?: string
  taskInstanceId?: string | number
  taskName?: string
  taskCategory?: string
  scheduleBTaskInstanceId?: string | number
  scheduleBTaskStatusDetails?: unknown
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

type ContractDrawerState = {
  open: boolean
  applicant?: Applicant
  applicationId?: string | number
  applicationName?: string
  taskInstanceId?: string | number
  taskName?: string
}

type PrelimResolutionDrawerState = {
  open: boolean
  task?: ApplicationTask
  companyTask?: ApplicationTask
}

type CertificationDrawerState = {
  open: boolean
  applicant?: Applicant
  task?: Task
}

type ExternalWaitDialogState = {
  open: boolean
  applicant?: Applicant
  task?: Task
  stage?: string | null
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
  const taskId = Number(task.taskInstanceId ?? task.TaskInstanceId ?? task.id)

  return Number.isFinite(taskId) ? taskId : 0
}

const mapApplicationTaskToStageTask = (task: ApplicationTask): Task => ({
  TaskInstanceId: getTaskInstanceId(task),
  name: task.taskName ?? task.name ?? '',
  PreScript: task.PreScript ?? '',
  status: ['completed', 'in_progress', 'overdue', 'blocked', 'pending'].includes(
    String(task.status ?? '').toLowerCase(),
  )
    ? (String(task.status).toLowerCase() as Task['status'])
    : 'pending',
  assignee: task.assignee ?? '',
  daysActive: task.daysActive ?? 0,
  required: Boolean(task.required),
  overdue: (task.daysOverdue ?? 0) > 0 || Boolean(task.overdue),
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

const buildInspectionApplicant = (
  selectedTask: ApplicationTask,
  tasks: ApplicationTask[],
): Applicant => {
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
    isNewCompany: selectedTask.isNewCompany,
    companyId: selectedTask.companyId,
    company: selectedTask.companyName ?? '',
    plantId: selectedTask.plantId,
    plant: selectedTask.plantName ?? '',
    region: selectedTask.region ?? '',
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

// Task rows here do not carry the application's assigned roles, so the capacity is derived from
// the task's assignee (as this screen always did) and passed to the shared submit code.
const resolveCapacity = (action: TaskDashboardAction, username?: string | null) => {
  const assigneeValue = action.assignee

  if (
    typeof assigneeValue === 'string' &&
    assigneeValue.trim() !== '' &&
    assigneeValue.toUpperCase() !== 'NULL'
  ) {
    return username?.toLowerCase() === assigneeValue.toLowerCase() ? 'MEMBER' : 'ASSISTANT'
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
  const [showActionModal, setShowActionModal] = useState<boolean | Task | ApplicationTask | null>(null)
  const [showConditionModal, setShowConditionModal] = useState<boolean | Task | ApplicationTask | null>(null)
  const [showUploadModal, setShowUploadModal] = useState<boolean | Task | ApplicationTask | null>(null)
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
  const [contractDrawerState, setContractDrawerState] = useState<ContractDrawerState>({
    open: false,
  })
  const [prelimResolutionDrawerState, setPrelimResolutionDrawerState] =
    useState<PrelimResolutionDrawerState>({ open: false })
  const [certificationDrawerState, setCertificationDrawerState] =
    useState<CertificationDrawerState>({ open: false })
  const [externalWaitDialogState, setExternalWaitDialogState] =
    useState<ExternalWaitDialogState>({ open: false })

  const { username, role, roles, token } = useUser()
  const { paginationMode } = useAppPreferences()
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, DEBOUNCE_DELAY)

    return () => clearTimeout(handler)
  }, [searchTerm])

  const filteredApplicationId = search.applicationId ?? normalizeTaskApplicationId(applicationId)
  const normalizedAppId = filteredApplicationId === undefined ? undefined : String(filteredApplicationId)

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
      ? (pagedTasksQuery.data?.data ?? [])
      : (infiniteTasksQuery.data?.pages.flatMap((currentPage) => currentPage.data) ?? [])
  const totalCount =
    paginationMode === 'paged'
      ? (pagedTasksQuery.data?.meta?.total_count ?? 0)
      : (infiniteTasksQuery.data?.pages?.[0]?.meta?.total_count ?? 0)

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
      const priorityDiff = (PRIORITY_ORDER[aPriority] ?? 99) - (PRIORITY_ORDER[bPriority] ?? 99)

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
        from: '/ou-workflow/tasks-dashboard',
        search: (prev) => ({
          ...prev,
          ...updates,
          qs: updates.qs ?? prev.qs,
          days: updates.days ?? prev.days,
          page: updates.page ?? prev.page,
        }),
      })
    },
    [navigate],
  )

  const handleFirst = useCallback(() => updateSearch({ page: 0 }), [updateSearch])
  const setApplicationId = useCallback((id: number | undefined) => {
    setDebouncedSearchTerm('')
    navigate({
      to: '/ou-workflow/tasks-dashboard',
      search: (prev) => ({ ...prev, applicationId: id, qs: '', days: prev.days ?? 'pending', page: 0 }),
    })
  }, [navigate])
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

  // Submit through the same code as the Application Dashboard and Application Intake, so a task
  // completes the same way on every screen (request, NCRC notification, success messages, refresh).
  const sharedActions = useTaskActions({
    applications: [],
    token: token ?? undefined,
    username: username ?? undefined,
    onError: (message) => errorDialogRef.current?.open(message),
    // This list mixes intake (submission) and workflow application tasks.
    applicationType: 'MIXED',
  })

  // What the shared code reads, from a Tasks & Notifications row.
  const toSharedAction = useCallback(
    (action: TaskDashboardAction) => ({
      ...action,
      taskCategory: action.taskCategory ?? action.TaskCategory,
      TaskInstanceId: action.TaskInstanceId ?? action.taskInstanceId ?? action.id,
      capacity: resolveCapacity(action, username),
    }),
    [username],
  )

  const executeAction = useCallback(
    (
      assignee: string,
      action: TaskDashboardAction,
      result?: Parameters<typeof sharedActions.executeAction>[2],
      selectedActionArg?: SelectedTaskAction | null,
    ) => {
      const sharedAction = toSharedAction(action)
      const selected = selectedActionArg ?? selectedAction
      // The NCRC notification names the company; rows carry it as companyName.
      const application = {
        ...(selected?.application ?? {}),
        applicationId: selected?.application?.applicationId ?? action.applicationId,
        company: (action as { companyName?: string }).companyName ?? selected?.application?.company,
      }
      return sharedActions.executeAction(
        assignee,
        sharedAction as never,
        result,
        { application, action: sharedAction } as unknown as SharedSelectedTaskAction,
      )
    },
    [selectedAction, sharedActions, toSharedAction],
  )

  const completeTaskWithResult = useCallback(
    (
      action: TaskDashboardAction,
      result: string,
      status?: string,
      completionNotes?: string,
      applicationId?: string | number | null,
    ) =>
      sharedActions.completeTaskWithResult(
        toSharedAction(action) as never,
        result,
        status,
        completionNotes,
        applicationId ?? action.applicationId ?? action.application?.applicationId,
      ),
    [sharedActions, toSharedAction],
  )

  const handleTaskAction = useCallback(
    (event: React.MouseEvent<HTMLElement>, application: ApplicationTask) => {
      event.stopPropagation()
      event.preventDefault()

      const action = {
        ...application,
        id: application.taskInstanceId,
        name: application.taskName,
        taskName: application.taskName,
        taskCategory: application.TaskCategory,
        TaskInstanceId: application.taskInstanceId,
      }
      const nextSelectedAction = { application: action, action }
      setSelectedAction(nextSelectedAction)

      const inspectionApplicant = buildInspectionApplicant(application, tasks)
      const inspectionTask = mapApplicationTaskToStageTask(application)

      // Which UI a task opens is configured in TASK_UI_ROUTES, shared with the Application
      // Dashboard; these open each kind of UI on this screen.
      const openTaskUi: Record<TaskUi, () => void> = {
        'certification-drawer': () => {
          setCertificationDrawerState({
            open: true,
            applicant: inspectionApplicant,
            // The drawer completes the task with the task's own capacity.
            task: { ...inspectionTask, capacity: application.capacity },
          })
        },
        'prelim-resolution-drawer': () => {
          setPrelimResolutionDrawerState({ open: true, task: application })
        },
        'schedule-a-drawer': () => {
          const scheduleATask = tasks.find(
            (candidate) =>
              String(candidate.applicationId) === String(action.applicationId) &&
              String(candidate.taskName ?? candidate.name ?? '').trim().toLowerCase() ===
                TASK_CATEGORIES.SCHEDULEA &&
              String(candidate.taskCategory ?? candidate.TaskCategory ?? '').trim().toLowerCase() ===
                TASK_CATEGORIES.SCHEDULEA &&
              String(candidate.taskType ?? candidate.TaskType ?? '').trim().toLowerCase() ===
                TASK_TYPES.ACTION,
          )
          setScheduleADrawerState({
            open: true,
            applicationId: action.applicationId,
            applicationName: action.companyName ?? action.plantName,
            taskInstanceId: action.taskInstanceId ?? action.TaskInstanceId,
            taskName: action.taskName ?? action.name,
            taskCategory: action.taskCategory ?? action.TaskCategory,
            scheduleATaskInstanceId:
              scheduleATask?.taskInstanceId ?? scheduleATask?.TaskInstanceId,
            scheduleATaskStatusDetails:
              scheduleATask?.StatusDetails ?? scheduleATask?.statusDetails,
          })
        },
        'schedule-b-drawer': () => {
          const scheduleBTask = tasks.find(
            (candidate) =>
              String(candidate.applicationId) === String(action.applicationId) &&
              String(candidate.taskName ?? candidate.name ?? '').trim().toLowerCase() ===
                TASK_CATEGORIES.SCHEDULEB &&
              String(candidate.taskCategory ?? candidate.TaskCategory ?? '').trim().toLowerCase() ===
                TASK_CATEGORIES.SCHEDULEB &&
              String(candidate.taskType ?? candidate.TaskType ?? '').trim().toLowerCase() ===
                TASK_TYPES.ACTION,
          )
          setScheduleBDrawerState({
            open: true,
            applicationId: action.applicationId,
            applicationName: action.companyName ?? action.plantName,
            taskInstanceId: action.taskInstanceId ?? action.TaskInstanceId,
            taskName: action.taskName ?? action.name,
            taskCategory: action.taskCategory ?? action.TaskCategory,
            scheduleBTaskInstanceId:
              scheduleBTask?.taskInstanceId ?? scheduleBTask?.TaskInstanceId,
            scheduleBTaskStatusDetails:
              scheduleBTask?.StatusDetails ?? scheduleBTask?.statusDetails,
          })
        },
        'inspection-invoice-drawer': () => {
          setInspectionInvoiceDrawerState({
            open: true,
            applicant: inspectionApplicant,
            applicationId: action.applicationId,
            applicationName: action.companyName ?? action.plantName,
            taskInstanceId: action.taskInstanceId ?? action.TaskInstanceId,
            taskName: action.taskName ?? action.name,
          })
        },
        'inspection-assignment-drawer': () => {
          setInspectionAssignmentDrawerState({ open: true, applicant: inspectionApplicant, task: inspectionTask })
        },
        'inspection-visit-drawer': () => {
          setInspectionVisitDateDrawerState({ open: true, applicant: inspectionApplicant, task: inspectionTask })
        },
        'contract-drawer': () => {
          setContractDrawerState({
            open: true,
            applicant: inspectionApplicant,
            applicationId: action.applicationId,
            applicationName: action.companyName ?? action.plantName,
            taskInstanceId: action.taskInstanceId ?? action.TaskInstanceId,
            taskName: action.taskName ?? action.name,
          })
        },
        // Same dialog as the Application Dashboard's stage panel.
        'external-wait-dialog': () => {
          setExternalWaitDialogState({
            open: true,
            applicant: inspectionApplicant,
            task: inspectionTask,
            stage: application.stageName || application.laneName || null,
          })
        },
        confirm: () => executeAction('Confirmed', action, 'yes', nextSelectedAction),
        'condition-modal': () => setShowConditionModal(action),
        'upload-modal': () => setShowUploadModal(action),
        'action-modal': () => setShowActionModal(action),
      }

      const ui = resolveTaskUi(action)
      if (ui) openTaskUi[ui]()
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
    filteredApplicationId,
    setApplicationId,
    page,
    paginationMode,
    filteredTasks,
    totalCount,
    totalPages,
    pageSize: PAGE_LIMIT,
    hasNextPage,
    sentinelRef,
    taskStats,
    isLoading:
      paginationMode === 'paged' ? pagedTasksQuery.isLoading : infiniteTasksQuery.isLoading,
    // The previous page stays visible (dimmed) while the next page loads.
    isRefreshing: paginationMode === 'paged' && pagedTasksQuery.isPlaceholderData,
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
    contractDrawerState,
    setContractDrawerState,
    prelimResolutionDrawerState,
    setPrelimResolutionDrawerState,
    certificationDrawerState,
    setCertificationDrawerState,
    externalWaitDialogState,
    setExternalWaitDialogState,
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
