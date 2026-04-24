import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useUser } from '@/context/UserContext'
import { useFetchTaskRoles } from '@/features/tasks/hooks/useTaskQueries'
import { useTaskNotesDrawerState } from '@/features/tasks/notes/useTaskNotesDrawerState'
import { normalizeTaskRoles } from '@/lib/utils/taskHelpers'
import { Route as TaskDashboardRoute } from '@/routes/_authed/ou-workflow/tasks-dashboard'
import { Route as TaskDashboardWithAppRoute } from '@/routes/_authed/ou-workflow/tasks-dashboard/$applicationId'
import type { Applicant, Task } from '@/types/application'

const STATUS_CONFIG = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-800', step: 1 },
  contract_sent: { label: 'Contract Sent', color: 'bg-blue-100 text-blue-800', step: 2 },
  under_review: { label: 'Under Review', color: 'bg-yellow-100 text-yellow-800', step: 3 },
  inspection_scheduled: { label: 'Inspection Scheduled', color: 'bg-purple-100 text-purple-800', step: 4 },
  payment_pending: { label: 'Payment Pending', color: 'bg-orange-100 text-orange-800', step: 5 },
  certified: { label: 'Certified', color: 'bg-green-100 text-green-800', step: 6 },
} as const

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', color: 'bg-red-500', textColor: 'text-white' },
  high: { label: 'High', color: 'bg-orange-500', textColor: 'text-white' },
  medium: { label: 'Medium', color: 'bg-blue-500', textColor: 'text-white' },
  low: { label: 'Low', color: 'bg-gray-500', textColor: 'text-white' },
  normal: { label: 'Normal', color: 'bg-blue-500', textColor: 'text-white' },
} as const

const DEFAULT_STATUS = (status: string) => ({
  label: status,
  color: 'bg-blue-100 text-blue-800',
  step: 0,
})

const saveScrollPosition = (applicationId: string | number) => {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('ncrc-paged-scroll', String(window.scrollY))
  }
  sessionStorage.setItem(
    'ncrc-infinite-scroll',
    JSON.stringify({
      scrollY: window.scrollY,
      anchorId: applicationId ?? null,
    }),
  )
}

const toSafeCount = (value: unknown): number => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return Math.trunc(parsed)
}

type Params = {
  applicant: Applicant
  handleCancelTask: (application: Applicant, action: Task, reason: string) => Promise<void> | void
}

export function useApplicantCardState({ applicant, handleCancelTask }: Params) {
  const navigate = useNavigate()
  const { username, role, roles } = useUser()
  const { data: taskRolesAll = [] } = useFetchTaskRoles()

  const [expandedStage, setExpandedStage] = useState<string | null>(null)
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false)
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false)

  const applicationNotesContextKey = `application:${String(applicant.applicationId ?? 'unknown')}`
  const applicationNotes = useTaskNotesDrawerState({
    applicationId: applicant.applicationId ?? null,
  })

  const status = useMemo(() => {
    const normalized = applicant.status?.toLowerCase() ?? ''
    return STATUS_CONFIG[normalized as keyof typeof STATUS_CONFIG] ?? DEFAULT_STATUS(applicant.status)
  }, [applicant.status])

  const priority = useMemo(() => {
    const priorityKey = (applicant.priority?.toLowerCase() ?? 'low') as keyof typeof PRIORITY_CONFIG
    return PRIORITY_CONFIG[priorityKey] || PRIORITY_CONFIG.low
  }, [applicant.priority])

  const filesByType = useMemo(() => {
    return applicant.files?.reduce((acc, file) => {
      acc[file.fileType] = file
      return acc
    }, {} as Record<string, (typeof applicant.files)[number]>)
  }, [applicant.files])

  const userRoles = useMemo(() => {
    if (role?.toUpperCase() === 'ALL') {
      return (roles ?? []).map((r) => r.name?.toLowerCase()).filter(Boolean)
    }
    return role ? [role.toLowerCase()] : []
  }, [role, roles])

  const isCritical = useMemo(() => {
    return (
      applicant.overdue ||
      applicant.stages?.Inspection?.tasks?.find((t) => t.name === 'KIM Paid')?.status === 'overdue'
    )
  }, [applicant.overdue, applicant.stages])

  const isWithdrawn = useMemo(() => {
    const normalized = applicant?.status?.toLowerCase()
    return normalized === 'withdrawn' || normalized === 'wth'
  }, [applicant.status])

  const hasCancelPermission = (task: Task | null): boolean => {
    if (!task) return false

    const taskRoles = normalizeTaskRoles(task.taskRoles)
    if (taskRoles.length === 0) return false

    const hasIncludedRole = taskRolesAll.some((taskRole) => taskRoles.includes(taskRole))
    if (hasIncludedRole) return true

    const matchingRoles = userRoles.map((r) => r.toLowerCase()).filter((r) => taskRoles.includes(r))
    if (matchingRoles.length === 0) return false

    const assignedRoles = Array.isArray(applicant?.assignedRoles) ? applicant.assignedRoles : []

    return assignedRoles.some((assignedRole: any) =>
      matchingRoles.some(
        (matchingRole) =>
          assignedRole?.[matchingRole.toUpperCase()]?.toLowerCase() === username?.toLowerCase(),
      ),
    )
  }

  const pendingCancelTask = useMemo(() => {
    const globalStageEntry = Object.entries(applicant.stages ?? {}).find(
      ([stageKey]) => stageKey.toLowerCase() === 'global',
    )

    const globalTasks = globalStageEntry?.[1]?.tasks ?? []

    return (
      globalTasks.find(
        (task) =>
          task?.name?.toLowerCase() === 'cancel application' &&
          task?.status?.toLowerCase() === 'pending',
      ) ?? null
    )
  }, [applicant.stages])

  const pendingUndoWithdrawTask = useMemo(() => {
    const globalStageEntry = Object.entries(applicant.stages ?? {}).find(
      ([stageKey]) => stageKey.toLowerCase() === 'global',
    )

    const globalTasks = globalStageEntry?.[1]?.tasks ?? []

    return (
      globalTasks.find((task) => {
        const taskName = task?.name?.toLowerCase() ?? ''
        return (
          task?.status?.toLowerCase() === 'pending' &&
          taskName.includes('undo') &&
          (taskName.includes('withdraw') || taskName.includes('cancel'))
        )
      }) ?? null
    )
  }, [applicant.stages])

  const canCancelApplication = useMemo(
    () => hasCancelPermission(pendingCancelTask),
    [pendingCancelTask, applicant.assignedRoles, taskRolesAll, userRoles, username],
  )

  const canUndoWithdrawApplication = useMemo(
    () => hasCancelPermission(pendingUndoWithdrawTask),
    [pendingUndoWithdrawTask, applicant.assignedRoles, taskRolesAll, userRoles, username],
  )

  const applicationNotesCount = useMemo(() => {
    const counts = applicationNotes.getCounts(applicationNotesContextKey)
    const fetchedTotal = counts.incoming + counts.outgoing + counts.private + counts.mention
    if (fetchedTotal > 0) return fetchedTotal

    return (
      toSafeCount((applicant as any)?.IsPrivateNotes) +
      toSafeCount((applicant as any)?.IsGlobalNotes)
    )
  }, [applicant, applicationNotes, applicationNotesContextKey])

  const toggleAIAssistant = () => setShowAIAssistant((prev) => !prev)

  const handleStageClick = (stageName: string) => {
    if (isWithdrawn) return
    setExpandedStage(expandedStage === stageName ? null : stageName)
  }

  const handleViewTasks = (applicationId?: string | number) => {
    saveScrollPosition(applicationId ?? '')

    if (!applicationId) {
      navigate({
        to: TaskDashboardRoute.to,
        search: () => ({
          qs: '',
          days: 'pending',
        }),
      })
      return
    }

    navigate({
      to: TaskDashboardWithAppRoute.to,
      params: { applicationId: String(applicationId) },
      search: () => ({
        qs: '',
        days: 'pending',
      }),
    })
  }

  const handleViewApplicationDetails = (applicationId?: string | number) => {
    saveScrollPosition(applicationId ?? '')
    navigate({
      to: '/ou-workflow/ncrc-dashboard/$applicationId',
      params: { applicationId: String(applicationId) },
    })
  }

  const openCancelDialog = () => {
    const canOpenDialog = isWithdrawn ? canUndoWithdrawApplication : canCancelApplication
    if (!canOpenDialog) return
    setShowCancelDialog(true)
  }

  const closeCancelDialog = () => {
    if (isSubmittingCancel) return
    setShowCancelDialog(false)
    setCancelReason('')
  }

  const handleConfirmCancel = async () => {
    const selectedTask = isWithdrawn ? pendingUndoWithdrawTask : pendingCancelTask
    const canSubmitAction = isWithdrawn ? canUndoWithdrawApplication : canCancelApplication
    if (!selectedTask || !canSubmitAction || !cancelReason.trim() || isSubmittingCancel) return

    setIsSubmittingCancel(true)
    try {
      await Promise.resolve(handleCancelTask(applicant, selectedTask, cancelReason.trim()))
      setShowCancelDialog(false)
      setCancelReason('')
    } finally {
      setIsSubmittingCancel(false)
    }
  }

  return {
    applicant,
    applicationNotes,
    applicationNotesContextKey,
    applicationNotesCount,
    canCancelApplication,
    canUndoWithdrawApplication,
    cancelReason,
    closeCancelDialog,
    expandedStage,
    filesByType,
    handleConfirmCancel,
    handleStageClick,
    handleViewApplicationDetails,
    handleViewTasks,
    isCritical,
    isSubmittingCancel,
    isWithdrawn,
    openCancelDialog,
    priority,
    setCancelReason,
    setExpandedStage,
    setShowDetailsDrawer,
    showAIAssistant,
    showCancelDialog,
    showDetailsDrawer,
    status,
    toggleAIAssistant,
  }
}
