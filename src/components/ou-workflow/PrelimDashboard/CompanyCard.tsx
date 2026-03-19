import { useEffect, useMemo, useState } from 'react'
import { PrelimAppExpandedStageTasks } from './PrelimAppExpandedStageTasks'
import { Clock } from 'lucide-react'
import type { Applicant, Task } from '@/types/application'
import { ResolvedSection } from '@/components/ou-workflow/PrelimDashboard/ResolvedSection'
import { useUser } from '@/context/UserContext'
import { CancelApplicationDialog } from '@/components/ou-workflow/modal/CancelApplicationDialog'
import { normalizeStatus, normalizeTaskRoles } from '@/lib/utils/taskHelpers'

type Props = {
  company: Applicant
  onViewApplication: () => void
  expanded: boolean
  setExpanded: (id: string | null) => void
  handleCancelTask: (application: Applicant, action: Task, reason: string) => Promise<void> | void
  handleTaskAction?: (
    e: React.MouseEvent,
    application: any,
    action: any
  ) => void
}

const STATUS_COLORS: Record<string, string> = {
  new: '#808080',
  completed: '#10b981',
  in_progress: '#3b82f6',
  overdue: '#ef4444',
  blocked: '#9ca3af',
  unknown: '#d1d5db',
}

function getStageColor(status?: string): string {
  return STATUS_COLORS[normalizeStatus(status)] ?? STATUS_COLORS.unknown
}

export function CompanyCard({
  company,
  onViewApplication,
  expanded,
  setExpanded,
  handleTaskAction,
  handleCancelTask,
}: Props) {
  const { username, role, roles } = useUser()
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false)
  const defaultProgressVisible = normalizeStatus(company.status) !== 'completed'
  const [isProgressVisible, setIsProgressVisible] = useState(defaultProgressVisible)

  const stageEntries = useMemo(
    () =>
      Object.entries(company.stages ?? {}).filter(
        ([stageName]) => stageName.toLowerCase() !== 'global'
      ),
    [company.stages]
  )
  const [expandedStage, setExpandedStage] = useState<string | null>(
    stageEntries[0]?.[0] ?? null
  )

  useEffect(() => {
    if (stageEntries.length === 0) {
      setExpandedStage(null)
      return
    }
    setExpandedStage((prev) =>
      prev && stageEntries.some(([stageName]) => stageName === prev)
        ? prev
        : stageEntries[0][0]
    )
  }, [stageEntries])

  useEffect(() => {
    setIsProgressVisible(defaultProgressVisible)
  }, [defaultProgressVisible, company.applicationId])

  const userRoles = useMemo(() => {
    if (role?.toUpperCase() === 'ALL') {
      return (roles ?? []).map((r) => r.name?.toLowerCase()).filter(Boolean)
    }
    return role ? [role.toLowerCase()] : []
  }, [role, roles])

  const hasCancelPermission = (task: Task | null): boolean => {
    if (!task) return false

    const taskRoles = normalizeTaskRoles(task.taskRoles)
    if (taskRoles.length === 0) return false

    const matchingRoles = userRoles.filter((r) => taskRoles.includes(r))
    if (matchingRoles.length === 0) return false

    const assignedRoles = Array.isArray(company?.assignedRoles) ? company.assignedRoles : []
    return assignedRoles.some((ar: any) =>
      matchingRoles.some(
        (matchedRole) =>
          ar?.[matchedRole.toUpperCase()]?.toLowerCase() === username?.toLowerCase()
      )
    )
  }

  const pendingCancelTask = useMemo(() => {
    const globalStageEntry = Object.entries(company.stages ?? {}).find(
      ([stageKey]) => stageKey.toLowerCase() === 'global'
    )
    const globalTasks = globalStageEntry?.[1]?.tasks ?? []

    return (
      globalTasks.find(
        (task) =>
          task?.name?.toLowerCase() === 'cancel application' &&
          task?.status?.toLowerCase() === 'pending' &&
          hasCancelPermission(task)
      ) ?? null
    )
  }, [company.stages, company.assignedRoles, userRoles, username])

  const pendingUndoWithdrawTask = useMemo(() => {
    const globalStageEntry = Object.entries(company.stages ?? {}).find(
      ([stageKey]) => stageKey.toLowerCase() === 'global'
    )
    const globalTasks = globalStageEntry?.[1]?.tasks ?? []

    return (
      globalTasks.find((task) => {
        const taskName = task?.name?.toLowerCase() ?? ''
        return (
          task?.status?.toLowerCase() === 'pending' &&
          taskName.includes('undo') &&
          (taskName.includes('withdraw') || taskName.includes('cancel')) &&
          hasCancelPermission(task)
        )
      }) ?? null
    )
  }, [company.stages, company.assignedRoles, userRoles, username])

  const canCancelApplication = useMemo(() => {
    return hasCancelPermission(pendingCancelTask)
  }, [pendingCancelTask, company.assignedRoles, userRoles, username])
  const canUndoWithdrawApplication = useMemo(() => {
    return hasCancelPermission(pendingUndoWithdrawTask)
  }, [pendingUndoWithdrawTask, company.assignedRoles, userRoles, username])
  const normalizedStatus = company?.status?.toLowerCase()
  const isWithdrawn = normalizedStatus === 'withdrawn' || normalizedStatus === 'wth'

  const handleConfirmCancel = async () => {
    const selectedTask = isWithdrawn ? pendingUndoWithdrawTask : pendingCancelTask
    const canSubmitAction = isWithdrawn ? canUndoWithdrawApplication : canCancelApplication
    if (!selectedTask || !canSubmitAction || !cancelReason.trim() || isSubmittingCancel) return

    setIsSubmittingCancel(true)
    try {
      await Promise.resolve(handleCancelTask(company, selectedTask, cancelReason.trim()))
      setShowCancelDialog(false)
      setCancelReason('')
    } finally {
      setIsSubmittingCancel(false)
    }
  }

  return (
    <div className="rounded-lg border bg-white shadow-sm transition hover:shadow-md p-4">
      <div className="cursor-pointer">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-base font-semibold text-gray-800 truncate">
              {company.company}
            </h3>
            {company.externalReferenceId != null && (
              <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 flex-shrink-0">
                Ref: {company.externalReferenceId}
              </span>
            )}
            {company.applicationId != null && (
              <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 flex-shrink-0">
                AppId: {company.applicationId}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {stageEntries
              .map(([stageName, stage]) => (
              <button
                key={stageName}
                disabled={isWithdrawn}
                onClick={(e) => {
                  e.stopPropagation()
                  if (isWithdrawn) return
                  if (expanded && expandedStage === stageName) {
                    setExpandedStage(null)
                    setExpanded(null)
                    return
                  }
                  setExpanded(String(company.applicationId))
                  setExpandedStage(stageName)
                }}
                className={`px-4 py-1.5 rounded text-xs font-medium text-white transition-all ${
                  isWithdrawn
                    ? 'cursor-not-allowed opacity-55 grayscale'
                    : ''
                } ${
                  !isWithdrawn && expanded && expandedStage === stageName
                    ? 'ring-2 ring-blue-400 ring-offset-1'
                    : ''
                }`}
                style={{ backgroundColor: isWithdrawn ? '#9ca3af' : getStageColor(stage.status) }}
                title={isWithdrawn ? 'Stage actions are disabled for withdrawn applications.' : `View ${stageName} tasks`}
              >
                {stageName}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {company.status && (
              <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                {company.status}
              </span>
            )}
            {company.createdDate && (
              <span className="text-xs text-gray-400">
                {new Date(company.createdDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center text-gray-600 bg-gray-100 px-2 py-1 rounded">
            <Clock className="w-4 h-4 mr-1" aria-hidden="true" />
            <span className="text-sm font-medium">{company.daysInProcess} days elapsed</span>
          </div>

          <div className="flex items-center gap-2">
            {company?.daysOverdue > 0 && (
              <div className="flex items-center text-red-600 bg-red-50 px-2 py-1 rounded">
                <Clock className="w-4 h-4 mr-1" aria-hidden="true" />
                <span className="text-sm font-medium">{company.daysOverdue} days overdue</span>
              </div>
            )}
            <button
              onClick={onViewApplication}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              View Application
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setIsProgressVisible((prev) => !prev)
              }}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            >
              {isProgressVisible ? 'Hide Progress' : 'Show Progress'}
            </button>
            {!isWithdrawn && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (!canCancelApplication) return
                  setShowCancelDialog(true)
                }}
                disabled={!canCancelApplication}
                className={`px-3 py-1 text-sm rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  canCancelApplication
                    ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
                    : 'bg-red-100 text-red-300 cursor-not-allowed focus:ring-red-200'
                }`}
                title={canCancelApplication ? 'Cancel Application' : "This application cannot be canceled due to its current status or your permissions."}
                aria-label={canCancelApplication ? 'Cancel Application' : "This application cannot be canceled due to its current status or your permissions."}
              >
                Withdraw Application
              </button>
            )}
            {isWithdrawn && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (!canUndoWithdrawApplication) return
                  setShowCancelDialog(true)
                }}
                disabled={!canUndoWithdrawApplication}
                className={`px-3 py-1 text-sm rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  canUndoWithdrawApplication
                    ? 'bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-500'
                    : 'bg-amber-100 text-amber-300 cursor-not-allowed focus:ring-amber-200'
                }`}
                title={canUndoWithdrawApplication ? 'Undo Withdraw Application' : 'Undo withdraw is not available for this application at the moment.'}
                aria-label={canUndoWithdrawApplication ? 'Undo Withdraw Application' : 'Undo withdraw is not available for this application at the moment.'}
              >
                Undo Withdraw Application
              </button>
            )}
          </div>
        </div>
      </div>

      {showCancelDialog && (
        <CancelApplicationDialog
          companyName={company.company}
          reason={cancelReason}
          saving={isSubmittingCancel}
          actionType={isWithdrawn ? 'undo_withdraw' : 'withdraw'}
          onReasonChange={setCancelReason}
          onClose={() => {
            if (isSubmittingCancel) return
            setShowCancelDialog(false)
            setCancelReason('')
          }}
          onConfirm={handleConfirmCancel}
        />
      )}

      {expanded && stageEntries.length > 0 && (
        <div className="expanded-panel">
          <PrelimAppExpandedStageTasks
            expandedStage={expandedStage}
            setExpandedStage={(stage) => {
              if (stage) {
                setExpandedStage(stage)
                return
              }
              setExpandedStage(null)
              setExpanded(null)
            }}
            applicant={company}
            handleTaskAction={handleTaskAction}
          />
        </div>
      )}
      <ResolvedSection
        application={company}
        loading={false}
        defaultVisible={defaultProgressVisible}
        isProgressVisible={isProgressVisible}
      />
    </div>
  )
}
